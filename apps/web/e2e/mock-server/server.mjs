// In-memory stand-in for apps/server implementing contracts api.md + sync-protocol.md (v1).
// Used by Playwright e2e and local development until the real server is available.
// Not a reference implementation: no persistence, no hashing, no rate limits.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8787);
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const nowIso = () => new Date().toISOString();

const db = {
  users: new Map(), // email -> user
  sessions: new Map(), // accessToken -> { userId, deviceId, exp }
  refresh: new Map(), // refreshToken -> { userId, deviceId }
  usedRefresh: new Map(), // rotated refreshToken -> deviceId (reuse = theft)
  revoked: new Map(), // deviceId -> reason (D-53: its tokens get 401 device_revoked, its sockets 4410)
  devices: new Map(), // deviceId -> { id, userId, name, createdAt, lastSeenAt }
  notebooks: new Map(), // id -> { id, userId, mode, createdAt, wrappedKey, serverKey }
  docs: new Map(), // docId -> { docId, userId, kind, notebookId, items: [{seq,payload,deviceId,createdAt}], snapshot }
  shares: new Map(),
  guests: new Map(), // guestToken -> shareId
  agentTokens: new Map(),
  recovery: new Map(),
  attachments: new Map(), // id -> { id, userId, noteId, size, chunkCount, mime, chunks: Map<index, Buffer> }
  // D-54 sharing with accounts (api.md «Совместный доступ по аккаунтам»)
  invitations: new Map(), // id -> { id, target, email, role, status, from: { userId, email }, createdAt, expiresAt, userExisted }
  members: new Map(), // "<kind>:<id>" -> Map<userId, { userId, email, role, status, joinedAt, accountCreatedAfterInvite, wrappedKey, keyVersion }>
};

function deviceRevoked(res, reason) {
  res.writeHead(401, { "content-type": "application/json", ...cors });
  res.end(JSON.stringify({ error: { code: "device_revoked", message: "this device was signed out", reason } }));
}
function err(res, status, code, message = code) {
  res.writeHead(status, { "content-type": "application/json", ...cors });
  res.end(JSON.stringify({ error: { code, message } }));
}
function json(res, status, body) {
  if (status === 204) {
    res.writeHead(204, cors);
    return res.end();
  }
  res.writeHead(status, { "content-type": "application/json", ...cors });
  res.end(JSON.stringify(body));
}
// Mutated per request: credentialed CORS needs the exact origin, not "*".
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

function issueSession(user, deviceName) {
  const deviceId = randomUUID();
  db.devices.set(deviceId, { id: deviceId, userId: user.userId, name: deviceName ?? "Unknown", createdAt: nowIso(), lastSeenAt: nowIso() });
  return newTokens(user, deviceId);
}
function newTokens(user, deviceId) {
  const accessToken = b64u(randomBytes(24));
  const refreshToken = b64u(randomBytes(24));
  const ttl = Number(process.env.ACCESS_TTL_MS ?? 15 * 60_000);
  db.sessions.set(accessToken, { userId: user.userId, deviceId, exp: Date.now() + ttl });
  db.refresh.set(refreshToken, { userId: user.userId, deviceId });
  return {
    userId: user.userId,
    accessToken,
    refreshToken,
    accessExpiresAt: new Date(Date.now() + ttl).toISOString(),
    wrappedMasterKeyPassword: user.wrappedMasterKeyPassword,
    accountDocId: user.accountDocId,
  };
}
function securityEvent(user, kind, deviceId) {
  (user.securityEvents ??= []).push({ kind, at: nowIso(), deviceId: deviceId ?? null, deviceName: (deviceId && db.devices.get(deviceId)?.name) || null });
}

function userById(id) {
  for (const u of db.users.values()) if (u.userId === id) return u;
  return null;
}
function authed(req) {
  const h = req.headers.authorization ?? "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  const s = db.sessions.get(tok);
  if (!s || s.exp < Date.now() || !db.devices.has(s.deviceId)) return null;
  db.devices.get(s.deviceId).lastSeenAt = nowIso();
  return { ...s, user: userById(s.userId) };
}
/** D-53 like the real server: the device is gone, its tokens answer device_revoked, sockets close 4410. */
function revokeDevice(deviceId, reason) {
  if (!db.devices.has(deviceId) && !db.revoked.has(deviceId)) return;
  db.devices.delete(deviceId);
  db.revoked.set(deviceId, reason);
  for (const c of clients)
    if (c.deviceSession === deviceId) {
      c.ws.send(JSON.stringify({ type: "error", code: "device_revoked", message: "this device was signed out", reason }));
      c.ws.close(4410, "device_revoked");
    }
}
/** The device a request's bearer token belongs to, when that device was revoked. */
function revokedReasonOf(req) {
  const h = req.headers.authorization ?? "";
  const s = db.sessions.get(h.startsWith("Bearer ") ? h.slice(7) : "");
  return s ? db.revoked.get(s.deviceId) : undefined;
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (!raw.length) return {};
  if ((req.headers["content-type"] ?? "").includes("json")) return JSON.parse(raw.toString("utf8"));
  return raw;
}
const fakeSalt = (email) => createHash("sha256").update(`mock-salt|${email}`).digest().subarray(0, 16);

function shareActive(share) {
  return share && !share.revoked && (!share.expiresAt || Date.parse(share.expiresAt) > Date.now());
}
function shareDocIds(share) {
  if (share.target.kind === "note") return [share.target.id];
  const ids = [share.target.id];
  for (const d of db.docs.values()) if (d.notebookId === share.target.id && d.kind === "note") ids.push(d.docId);
  return ids;
}

const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
  routes.push({ method, re, keys, handler });
};

route("GET", "/v1/health", (_q, res) => json(res, 200, { ok: true, version: "mock" }));

// Test control: an item sealed with a key nobody holds (garbage), as left by a lost device.
route("POST", "/v1/__test/inject-unreadable", (_q, res, { body }) => {
  const d = db.docs.get(body.docId);
  if (!d) return err(res, 404, "not_found");
  const seq = (d.items[d.items.length - 1]?.seq ?? d.snapshot?.seq ?? 0) + 1;
  const payload = b64u(randomBytes(64));
  d.items.push({ seq, payload, deviceId: "lost-device", createdAt: nowIso() });
  for (const o of clients) if (o.welcomed && o.subs.has(body.docId)) o.ws.send(JSON.stringify({ type: "update", docId: body.docId, seq, payload, deviceId: "lost-device" }));
  json(res, 200, { seq });
});

// Test control: hold back what a subscription to a document returns (its content arrives late,
// as for a note created on another device or by an agent), and let it through on release.
const heldDocs = new Map();
route("POST", "/v1/__test/hold-doc", (_q, res, { body }) => {
  if (body.on) heldDocs.set(body.docId, heldDocs.get(body.docId) ?? []);
  else {
    const pending = heldDocs.get(body.docId) ?? [];
    heldDocs.delete(body.docId);
    for (const run of pending) run();
  }
  json(res, 200, { held: [...heldDocs.keys()] });
});

// Test control: refuse every push with `internal` (the sync indicator's «Не отправлено» state).
let refusePushes = false;
route("POST", "/v1/__test/refuse-pushes", (_q, res, { body }) => {
  refusePushes = !!body.on;
  json(res, 200, { refusePushes });
});

route("POST", "/v1/auth/prelogin", (_q, res, { body }) => {
  const u = db.users.get(String(body.email ?? "").toLowerCase());
  if (u) return json(res, 200, { salt: u.salt, kdf: u.kdf });
  json(res, 200, { salt: b64u(fakeSalt(body.email)), kdf: { alg: "argon2id13", ops: 3, mem: 67108864 } });
});
route("POST", "/v1/auth/signup", (_q, res, { body }) => {
  const email = String(body.email ?? "").toLowerCase();
  if (!email || !body.loginKey) return err(res, 400, "bad_request");
  if (db.users.has(email)) return err(res, 409, "conflict", "Email already registered");
  const user = { ...body, email, createdAt: nowIso() };
  db.users.set(email, user);
  db.docs.set(body.accountDocId, { docId: body.accountDocId, userId: body.userId, kind: "account", notebookId: null, items: [], snapshot: null, history: [] });
  json(res, 200, issueSession(user, "Signup device"));
});
route("POST", "/v1/auth/login", (_q, res, { body }) => {
  const u = db.users.get(String(body.email ?? "").toLowerCase());
  if (!u || u.loginKey !== body.loginKey) return err(res, 401, "unauthorized", "Wrong email or password");
  json(res, 200, issueSession(u, body.deviceName));
});
// Like the real server: refresh tokens rotate, and presenting a used one revokes the device.
route("POST", "/v1/auth/refresh", (_q, res, { body }) => {
  const used = db.usedRefresh.get(body.refreshToken);
  if (used) {
    revokeDevice(used, "token_reuse");
    return deviceRevoked(res, db.revoked.get(used));
  }
  const r = db.refresh.get(body.refreshToken);
  if (r && db.revoked.has(r.deviceId)) return deviceRevoked(res, db.revoked.get(r.deviceId));
  if (!r || !db.devices.has(r.deviceId)) return err(res, 401, "unauthorized");
  db.refresh.delete(body.refreshToken);
  db.usedRefresh.set(body.refreshToken, r.deviceId);
  json(res, 200, newTokens(userById(r.userId), r.deviceId));
});
route("POST", "/v1/auth/logout", (_q, res, { body }) => {
  const r = db.refresh.get(body.refreshToken);
  if (r) {
    db.refresh.delete(body.refreshToken);
    db.devices.delete(r.deviceId);
  }
  json(res, 204);
});
route("POST", "/v1/auth/recovery/start", (_q, res, { body }) => {
  const u = db.users.get(String(body.email ?? "").toLowerCase());
  if (!u || u.recoveryLoginKey !== body.recoveryLoginKey) return err(res, 401, "unauthorized", "Wrong recovery key");
  const recoveryToken = b64u(randomBytes(18));
  db.recovery.set(recoveryToken, u.email);
  json(res, 200, { recoveryToken, wrappedMasterKeyRecovery: u.wrappedMasterKeyRecovery, userId: u.userId });
});
route("POST", "/v1/auth/recovery/finish", (_q, res, { body }) => {
  const email = db.recovery.get(body.recoveryToken);
  if (!email) return err(res, 401, "unauthorized");
  db.recovery.delete(body.recoveryToken);
  const u = db.users.get(email);
  Object.assign(u, { salt: body.salt, kdf: body.kdf, loginKey: body.loginKey, wrappedMasterKeyPassword: body.wrappedMasterKeyPassword });
  for (const d of [...db.devices.values()]) if (d.userId === u.userId) revokeDevice(d.id, "recovery");
  const session = issueSession(u, "Recovered device");
  securityEvent(u, "recovery_used", session.deviceId);
  json(res, 200, session);
});
route("POST", "/v1/auth/password", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (auth.user.loginKey !== body.currentLoginKey) return err(res, 403, "forbidden", "Wrong password");
  Object.assign(auth.user, { salt: body.salt, kdf: body.kdf, loginKey: body.loginKey, wrappedMasterKeyPassword: body.wrappedMasterKeyPassword });
  securityEvent(auth.user, "password_changed", auth.deviceId);
  for (const d of [...db.devices.values()]) if (d.userId === auth.userId && d.id !== auth.deviceId) revokeDevice(d.id, "password_change");
  json(res, 204);
});
// api.md: a new recovery key; the old one stops working at once.
route("POST", "/v1/auth/recovery-key", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (auth.user.loginKey !== body.currentLoginKey) return err(res, 403, "forbidden", "Wrong password");
  Object.assign(auth.user, { recoveryLoginKey: body.recoveryLoginKey, wrappedMasterKeyRecovery: body.wrappedMasterKeyRecovery });
  for (const [token, email] of db.recovery) if (email === auth.user.email) db.recovery.delete(token);
  securityEvent(auth.user, "recovery_key_rotated", auth.deviceId);
  json(res, 204);
});
route("GET", "/v1/me/security-events", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [...(auth.user.securityEvents ?? [])].reverse().slice(0, 100));
});

route("GET", "/v1/me", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const u = auth.user;
  json(res, 200, { userId: u.userId, email: u.email, accountDocId: u.accountDocId, createdAt: u.createdAt });
});
route("DELETE", "/v1/me", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (auth.user.loginKey !== body.loginKey) return err(res, 403, "forbidden");
  db.users.delete(auth.user.email);
  json(res, 204);
});
route("GET", "/v1/devices", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [...db.devices.values()].filter((d) => d.userId === auth.userId).map((d) => ({ ...d, current: d.id === auth.deviceId })));
});
route("DELETE", "/v1/devices/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.devices.get(params.id);
  if (!d || d.userId !== auth.userId) return err(res, 404, "not_found");
  revokeDevice(params.id, "user");
  json(res, 204);
});

route("POST", "/v1/notebooks", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const existing = db.notebooks.get(body.notebookId);
  if (existing) return existing.userId === auth.userId ? json(res, 200, pubNotebook(existing)) : err(res, 409, "conflict");
  const nb = { id: body.notebookId, userId: auth.userId, mode: body.mode, createdAt: nowIso(), wrappedKey: body.wrappedKey, serverKey: body.notebookKey ?? null };
  db.notebooks.set(nb.id, nb);
  json(res, 200, pubNotebook(nb));
});
const pubNotebook = (n) => ({ id: n.id, mode: n.mode, createdAt: n.createdAt, wrappedKey: n.wrappedKey });
route("GET", "/v1/notebooks", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [...db.notebooks.values()].filter((n) => n.userId === auth.userId).map(pubNotebook));
});
route("GET", "/v1/notebooks/:id/key", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const n = db.notebooks.get(params.id);
  if (!n || n.userId !== auth.userId) return err(res, 404, "not_found");
  // D-54 key versions (crypto.md §10.3): version, chain and a pending rotation.
  json(res, 200, { wrappedKey: n.wrappedKey, version: n.keyVersion ?? 1, keyChain: n.keyChain ?? [], keyRotationPending: !!n.keyRotationPending });
});
route("PATCH", "/v1/notebooks/:id/mode", (_q, res, { auth, params, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const n = db.notebooks.get(params.id);
  if (!n || n.userId !== auth.userId) return err(res, 404, "not_found");
  n.mode = body.mode;
  n.serverKey = body.mode === "agent" ? body.notebookKey : null;
  json(res, 204);
});
route("DELETE", "/v1/notebooks/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  db.notebooks.delete(params.id);
  for (const [id, d] of db.docs) if (d.notebookId === params.id || id === params.id) db.docs.delete(id);
  json(res, 204);
});

route("POST", "/v1/docs", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(body.docId);
  // D-54: an editor of a shared notebook creates notes in it; they belong to its owner.
  const shared = body.kind === "note" && body.notebookId ? db.members.get(`notebook:${body.notebookId}`)?.get(auth.userId) : null;
  if (shared && shared.role !== "editor") return err(res, 403, "forbidden");
  const ownerId = shared ? ownerOf({ kind: "notebook", id: body.notebookId }) : auth.userId;
  if (d) return d.userId === ownerId ? json(res, 204) : err(res, 409, "conflict");
  db.docs.set(body.docId, { docId: body.docId, userId: ownerId, kind: body.kind, notebookId: body.notebookId ?? null, items: [], snapshot: null, history: [] });
  json(res, 204);
});
route("PATCH", "/v1/docs/:id", (_q, res, { auth, params, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  const nb = db.notebooks.get(body?.notebookId);
  if (!d || d.userId !== auth.userId || !nb || nb.userId !== auth.userId) return err(res, 404, "not_found");
  if (d.kind !== "note") return err(res, 400, "bad_request", "not a note");
  d.notebookId = nb.id;
  json(res, 204);
});
route("DELETE", "/v1/docs/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  db.docs.delete(params.id);
  json(res, 204);
});
/** D-54: the role of an account in a document shared with it (the note's or its notebook's), or null. */
function memberRoleOf(userId, doc) {
  if (!doc || !userId) return null;
  const viaNote = db.members.get(`note:${doc.docId}`)?.get(userId);
  const nbId = doc.kind === "notebook" ? doc.docId : doc.notebookId;
  const viaNotebook = nbId ? db.members.get(`notebook:${nbId}`)?.get(userId) : null;
  const m = viaNote ?? viaNotebook;
  return m && m.status === "active" ? m.role : null;
}
const canRead = (auth, d) => d && (d.userId === auth.userId || !!memberRoleOf(auth.userId, d));

route("GET", "/v1/docs/:id/versions", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  if (!canRead(auth, d)) return err(res, 404, "not_found");
  // Versions are the encrypted snapshots clients uploaded (the server can't merge ciphertext);
  // authors — who pushed since the previous version (D-54), stamped here, never by the client.
  json(res, 200, d.history.map(({ seq, createdAt, deviceId, authors }) => ({ seq, createdAt, deviceId, authors: authors ?? [] })).reverse());
});
route("GET", "/v1/docs/:id/versions/:seq", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  const v = d?.history.find((h) => h.seq === Number(params.seq));
  if (!canRead(auth, d) || !v) return err(res, 404, "not_found");
  json(res, 200, { payload: v.payload });
});

const attAccess = (auth, req, a) => {
  if (!a) return false;
  if (auth && a.userId === auth.userId) return true;
  // Guests may read attachments of notes in their share (bearer = guest token).
  const h = req.headers.authorization ?? "";
  const shareId = db.guests.get(h.startsWith("Bearer ") ? h.slice(7) : "");
  const s = shareId && db.shares.get(shareId);
  if (!shareActive(s)) return false;
  return shareDocIds(s).includes(a.noteId);
};
// D-52 image fetch (api.md «Картинка по ссылке»). The mock never goes to the network: a private
// address or `*.blocked.test` is refused, a `.png` URL gets a 2×2 red PNG, anything else is not an image.
const MOCK_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");
route("POST", "/v1/fetch-image", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  let u;
  try {
    u = new URL(body.url);
  } catch {
    return json(res, 422, { error: "blocked" });
  }
  const h = u.hostname;
  if (!/^https?:$/.test(u.protocol) || h === "localhost" || /^(127|10|192\.168)\./.test(h) || h.endsWith(".blocked.test"))
    return json(res, 422, { error: "blocked" });
  if (!u.pathname.endsWith(".png")) return json(res, 422, { error: "not_image" });
  res.writeHead(200, { "content-type": "image/png", "content-length": MOCK_PNG.length, ...cors });
  res.end(MOCK_PNG);
});
// ---------- D-54: sharing with accounts ----------
const targetKey = (t) => `${t.kind}:${t.id}`;
function ownerOf(target) {
  if (target.kind === "notebook") return db.notebooks.get(target.id)?.userId ?? null;
  return db.docs.get(target.id)?.userId ?? null;
}
const membersOf = (target) => {
  const k = targetKey(target);
  if (!db.members.has(k)) db.members.set(k, new Map());
  return db.members.get(k);
};
const liveInvitation = (i) => i.status === "pending" && Date.parse(i.expiresAt) > Date.now();
function sharedItemFor(target, m) {
  const owner = userById(ownerOf(target));
  const docIds =
    target.kind === "note" ? [target.id] : [target.id, ...[...db.docs.values()].filter((d) => d.notebookId === target.id && d.kind === "note").map((d) => d.docId)];
  return {
    target,
    owner: { userId: owner.userId, email: owner.email, publicKey: owner.boxKey?.publicKey ?? b64u(Buffer.alloc(32)) },
    role: m.role,
    keyVersion: resourceKey(target).version,
    wrappedKey: m.keyVersion === resourceKey(target).version ? (m.wrappedKey ?? null) : null,
    keyChain: resourceKey(target).keyChain,
    docIds,
    addedAt: m.joinedAt,
  };
}
const parseTarget = (kind, id) => (kind === "notebook" || kind === "note" ? { kind, id } : null);
/** Key state of a shared resource: a notebook's lives on the notebook, a shared note's on its doc. */
function resourceKey(target) {
  const r = target.kind === "notebook" ? db.notebooks.get(target.id) : db.docs.get(target.id);
  return { r, version: r?.keyVersion ?? 1, keyChain: r?.keyChain ?? [], pending: !!r?.keyRotationPending };
}

// crypto.md §10.1: one key pair per account, published once.
route("GET", "/v1/me/box-key", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (!auth.user.boxKey) return err(res, 404, "not_found");
  json(res, 200, auth.user.boxKey);
});
route("PUT", "/v1/me/box-key", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const prev = auth.user.boxKey;
  if (prev && (prev.publicKey !== body.publicKey || prev.wrappedSecretKey !== body.wrappedSecretKey)) return err(res, 409, "conflict");
  auth.user.boxKey = { publicKey: body.publicKey, wrappedSecretKey: body.wrappedSecretKey };
  json(res, 204);
});
/** Only for accounts related through a shared resource or an accepted invitation (api.md); else 404. */
function related(a, b) {
  if (a === b) return true;
  for (const [k, members] of db.members) {
    const [kind, id] = k.split(":");
    const owner = ownerOf({ kind, id });
    const inIt = (u) => u === owner || members.has(u);
    if (inIt(a) && inIt(b)) return true;
  }
  return false;
}
route("GET", "/v1/users/:userId/public-key", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const u = userById(params.userId);
  if (!u?.boxKey || !related(auth.userId, u.userId)) return err(res, 404, "not_found");
  json(res, 200, { userId: u.userId, publicKey: u.boxKey.publicKey });
});

route("POST", "/v1/invitations", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = body.target;
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !["editor", "viewer"].includes(body.role)) return err(res, 400, "bad_request");
  const pending = [...db.invitations.values()].filter((i) => targetKey(i.target) === targetKey(target) && liveInvitation(i));
  const same = pending.find((i) => i.email === email);
  if (!same && membersOf(target).size + pending.length >= 50) return err(res, 409, "conflict", "member limit");
  if (same) db.invitations.delete(same.id);
  db.invitations.set(body.invitationId, {
    id: body.invitationId,
    target,
    email,
    role: body.role,
    status: "pending",
    from: { userId: auth.userId, email: auth.user.email },
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    userExisted: db.users.has(email),
  });
  json(res, 204);
});
route("GET", "/v1/invitations", (req, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const [kind, id] = String(new URL(req.url, "http://x").searchParams.get("target") ?? "").split(":");
  const target = parseTarget(kind, id);
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  const list = [...db.invitations.values()].filter((i) => targetKey(i.target) === targetKey(target));
  json(
    res,
    200,
    list.map((i) => ({ id: i.id, email: i.email, role: i.role, status: i.status === "pending" && !liveInvitation(i) ? "expired" : i.status, createdAt: i.createdAt, expiresAt: i.expiresAt })),
  );
});
route("DELETE", "/v1/invitations/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const i = db.invitations.get(params.id);
  if (!i || i.from.userId !== auth.userId) return err(res, 404, "not_found");
  db.invitations.delete(params.id);
  json(res, 204);
});
route("GET", "/v1/invitations/incoming", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const list = [...db.invitations.values()].filter((i) => i.email === auth.user.email && liveInvitation(i));
  json(res, 200, list.map((i) => ({ id: i.id, target: i.target, from: i.from, role: i.role, createdAt: i.createdAt, expiresAt: i.expiresAt })));
});
route("POST", "/v1/invitations/:id/accept", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const i = db.invitations.get(params.id);
  if (!i || i.email !== auth.user.email || !liveInvitation(i)) return err(res, 404, "not_found");
  i.status = "accepted";
  const m = { userId: auth.userId, email: auth.user.email, role: i.role, status: "awaiting_key", joinedAt: nowIso(), accountCreatedAfterInvite: !i.userExisted, wrappedKey: null, keyVersion: 1 };
  membersOf(i.target).set(auth.userId, m);
  json(res, 200, sharedItemFor(i.target, m));
});
route("POST", "/v1/invitations/:id/decline", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const i = db.invitations.get(params.id);
  if (!i || i.email !== auth.user.email) return err(res, 404, "not_found");
  i.status = "declined";
  json(res, 204);
});
const pubMember = ({ wrappedKey: _k, keyVersion: _v, ...m }) => m;
route("GET", "/v1/members/:kind/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target) return err(res, 404, "not_found");
  const members = membersOf(target);
  if (ownerOf(target) !== auth.userId && !members.has(auth.userId)) return err(res, 404, "not_found");
  json(res, 200, [...members.values()].map(pubMember));
});
route("PATCH", "/v1/members/:kind/:id/:userId", (_q, res, { auth, params, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  const m = membersOf(target).get(params.userId);
  if (!m) return err(res, 404, "not_found");
  m.role = body.role;
  json(res, 204);
});
route("DELETE", "/v1/members/:kind/:id/:userId", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target) return err(res, 404, "not_found");
  if (ownerOf(target) !== auth.userId && params.userId !== auth.userId) return err(res, 403, "forbidden");
  if (!membersOf(target).delete(params.userId)) return err(res, 404, "not_found");
  const { r } = resourceKey(target);
  if (r) r.keyRotationPending = true;
  json(res, 204);
});
route("PUT", "/v1/members/:kind/:id/:userId/key", (_q, res, { auth, params, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  const m = membersOf(target).get(params.userId);
  if (!m) return err(res, 404, "not_found");
  if (body.version !== resourceKey(target).version) return err(res, 409, "conflict", "stale key version");
  Object.assign(m, { wrappedKey: body.wrappedKey, keyVersion: body.version, status: "active" });
  json(res, 204);
});
route("POST", "/v1/members/:kind/:id/rotate", (_q, res, { auth, params, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  const { r, version, keyChain } = resourceKey(target);
  if (body.version !== version + 1) return err(res, 409, "conflict", "version");
  const members = membersOf(target);
  const given = new Map(body.memberKeys.map((k) => [k.userId, k.wrappedKey]));
  for (const [userId, m] of members) if (m.status === "active" && !given.has(userId)) return err(res, 409, "conflict", "memberKeys");
  r.keyVersion = body.version;
  r.keyChain = [body.previousKeyWrap, ...keyChain];
  if (target.kind === "notebook") {
    r.wrappedKey = body.ownerWrappedKey;
    if (body.notebookKey) r.serverKey = body.notebookKey;
  } else {
    r.ownerWrappedKey = body.ownerWrappedKey;
    r.keyRotationPending = false;
  }
  for (const [userId, m] of members) if (given.has(userId)) Object.assign(m, { wrappedKey: given.get(userId), keyVersion: body.version, status: "active" });
  json(res, 204);
});
route("POST", "/v1/members/:kind/:id/rotate/done", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const target = parseTarget(params.kind, params.id);
  if (!target || ownerOf(target) !== auth.userId) return err(res, 403, "forbidden");
  resourceKey(target).r.keyRotationPending = false;
  json(res, 204);
});
route("GET", "/v1/members/note/:id/key", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  if (!d || d.userId !== auth.userId || !d.ownerWrappedKey) return err(res, 404, "not_found");
  json(res, 200, { version: d.keyVersion ?? 1, ownerWrappedKey: d.ownerWrappedKey, keyChain: d.keyChain ?? [] });
});
route("GET", "/v1/shared-by-me", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const out = [];
  for (const [k, members] of db.members) {
    const [kind, id] = k.split(":");
    const target = { kind, id };
    if (ownerOf(target) !== auth.userId) continue;
    const { version, pending } = resourceKey(target);
    if (!members.size && !pending) continue;
    out.push({ target, keyVersion: version, keyRotationPending: pending, members: members.size, awaitingKey: [...members.values()].filter((m) => m.status === "awaiting_key").length });
  }
  json(res, 200, out);
});
route("GET", "/v1/shared-with-me", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const out = [];
  for (const [k, members] of db.members) {
    const m = members.get(auth.userId);
    if (!m) continue;
    const [kind, id] = k.split(":");
    out.push(sharedItemFor({ kind, id }, m));
  }
  json(res, 200, out);
});

route("POST", "/v1/attachments", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (body.size > 200 * 1024 * 1024 * 1.01) return err(res, 413, "payload_too_large");
  if (!db.attachments.has(body.attachmentId))
    db.attachments.set(body.attachmentId, { id: body.attachmentId, userId: auth.userId, noteId: body.noteId, size: body.size, chunkCount: body.chunkCount, mime: body.mime, chunks: new Map() });
  json(res, 204);
});
route("PUT", "/v1/attachments/:id/chunks/:index", (req, res, { auth, params, body }) => {
  const a = db.attachments.get(params.id);
  if (!auth || !a || a.userId !== auth.userId) return err(res, 404, "not_found");
  a.chunks.set(Number(params.index), Buffer.isBuffer(body) ? body : Buffer.from([]));
  json(res, 204);
});
route("GET", "/v1/attachments/:id", (req, res, { auth, params }) => {
  const a = db.attachments.get(params.id);
  if (!attAccess(auth, req, a)) return err(res, 404, "not_found");
  json(res, 200, { size: a.size, chunkCount: a.chunkCount, mime: a.mime, uploadedChunks: [...a.chunks.keys()].sort((x, y) => x - y) });
});
route("GET", "/v1/attachments/:id/chunks/:index", (req, res, { auth, params }) => {
  const a = db.attachments.get(params.id);
  const c = a?.chunks.get(Number(params.index));
  if (!attAccess(auth, req, a) || !c) return err(res, 404, "not_found");
  res.writeHead(200, { "content-type": "application/octet-stream", ...cors });
  res.end(c);
});
route("DELETE", "/v1/attachments/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  db.attachments.delete(params.id);
  json(res, 204);
});

route("POST", "/v1/shares", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const share = { id: body.shareId, userId: auth.userId, target: body.target, permission: body.permission, expiresAt: body.expiresAt ?? null, createdAt: nowIso(), revoked: false };
  db.shares.set(share.id, share);
  json(res, 200, pubShare(share));
});
const pubShare = (s) => ({ id: s.id, target: s.target, permission: s.permission, expiresAt: s.expiresAt, createdAt: s.createdAt });
route("GET", "/v1/shares", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [...db.shares.values()].filter((s) => s.userId === auth.userId && !s.revoked).map(pubShare));
});
route("DELETE", "/v1/shares/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const s = db.shares.get(params.id);
  if (!s || s.userId !== auth.userId) return err(res, 404, "not_found");
  s.revoked = true;
  for (const c of clients) if (c.shareId === s.id) c.ws.close();
  json(res, 204);
});
route("POST", "/v1/shares/:id/guest", (_q, res, { params }) => {
  const s = db.shares.get(params.id);
  if (!shareActive(s)) return err(res, 404, "not_found", "Link revoked or expired");
  const guestToken = b64u(randomBytes(18));
  db.guests.set(guestToken, s.id);
  json(res, 200, { guestToken, target: s.target, permission: s.permission, docIds: shareDocIds(s) });
});

route("POST", "/v1/agent-tokens", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const id = randomUUID();
  const t = { id, kind: "static", clientId: null, userId: auth.userId, name: body.name, notebookIds: body.notebookIds, permission: body.permission, expiresAt: body.expiresAt ?? null, createdAt: nowIso(), lastUsedAt: null };
  for (const nb of body.notebookIds ?? []) if (db.notebooks.get(nb)?.mode !== "agent") return err(res, 400, "bad_request", "notebook is not in agent mode");
  db.agentTokens.set(id, t);
  const { userId: _u, ...pub } = t;
  json(res, 201, { ...pub, token: `dsa_${b64u(randomBytes(24))}` });
});
route("GET", "/v1/agent-tokens", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [...db.agentTokens.values()].filter((t) => t.userId === auth.userId).map(({ userId: _u, ...t }) => t));
});
route("DELETE", "/v1/agent-tokens/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  db.agentTokens.delete(params.id);
  json(res, 204);
});
route("GET", "/v1/agent-tokens/:id/audit", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  json(res, 200, [{ at: nowIso(), via: "mcp", action: "list_notebooks", notebookId: null, noteId: null, ok: true, errorCode: null, durationMs: 12 }]);
});

// Browser session for the agents' OAuth consent screen (agents-api.md §10).
const webSessions = new Set();
route("POST", "/v1/auth/web-session", (_q, res, { auth }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const sid = b64u(randomBytes(18));
  webSessions.add(sid);
  res.writeHead(204, { ...cors, "set-cookie": `ds_web=${sid}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax` });
  res.end();
});
route("DELETE", "/v1/auth/web-session", (_q, res) => {
  res.writeHead(204, { ...cors, "set-cookie": "ds_web=; Path=/; Max-Age=0" });
  res.end();
});
route("GET", "/oauth/authorize", (req, res) => {
  const sid = /(?:^|;\s*)ds_web=([^;]+)/.exec(req.headers.cookie ?? "")?.[1];
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><title>consent</title><p id="consent">${sid && webSessions.has(sid) ? "signed-in" : "anonymous"}</p>`);
});

// Test helper: wipe state between e2e specs.
route("POST", "/__mock/reset", (_q, res) => {
  for (const m of Object.values(db)) m.clear();
  json(res, 204);
});
route("POST", "/__mock/kill-sockets", (_q, res) => {
  for (const c of clients) c.ws.terminate();
  json(res, 204);
});

const server = http.createServer(async (req, res) => {
  cors["access-control-allow-origin"] = req.headers.origin ?? "*";
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }
  const url = new URL(req.url, "http://x");
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = url.pathname.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const body = await readBody(req);
      const revoked = revokedReasonOf(req);
      if (revoked) return deviceRevoked(res, revoked);
      return await r.handler(req, res, { params, body, auth: authed(req) });
    } catch (e) {
      console.error(e);
      return err(res, 500, "internal", String(e));
    }
  }
  err(res, 404, "not_found");
});

// ---------- sync ----------
const clients = new Set();
const wss = new WebSocketServer({ server, path: "/v1/sync" });

wss.on("connection", (ws) => {
  const c = { ws, welcomed: false, userId: null, shareId: null, permission: null, deviceId: null, deviceSession: null, subs: new Set() };
  clients.add(c);
  const send = (m) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));
  // D-54: a member reaches the documents of what is shared with them (the index and notes of a
  // notebook, or one note); returns their role, or null.
  const memberRole = (doc) => memberRoleOf(c.userId, doc);
  const canAccess = (doc) => {
    if (!doc) return false;
    if (c.userId) return doc.userId === c.userId || !!memberRole(doc);
    const s = db.shares.get(c.shareId);
    return shareActive(s) && shareDocIds(s).includes(doc.docId);
  };
  ws.on("message", (raw) => {
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!c.welcomed) {
      if (m.type !== "hello") return send({ type: "error", code: "unauthorized", message: "hello first" });
      if (m.protocol !== 1) return send({ type: "error", code: "protocol_mismatch", message: "protocol 1 only" });
      if (m.auth?.kind === "user") {
        const s = db.sessions.get(m.auth.accessToken);
        if (s && db.revoked.has(s.deviceId)) {
          send({ type: "error", code: "device_revoked", message: "this device was signed out", reason: db.revoked.get(s.deviceId) });
          return ws.close(4410, "device_revoked");
        }
        if (!s || s.exp < Date.now() || !db.devices.has(s.deviceId)) return send({ type: "error", code: "unauthorized", message: "bad token" });
        c.userId = s.userId;
        c.deviceSession = s.deviceId;
      } else if (m.auth?.kind === "guest") {
        const shareId = db.guests.get(m.auth.guestToken);
        const s = db.shares.get(m.auth.shareId);
        if (shareId !== m.auth.shareId || !shareActive(s)) return send({ type: "error", code: "unauthorized", message: "bad guest token" });
        c.shareId = s.id;
        c.permission = s.permission;
      } else return send({ type: "error", code: "unauthorized", message: "no auth" });
      c.deviceId = m.deviceId;
      c.welcomed = true;
      return send({ type: "welcome", userId: c.userId, serverTime: nowIso(), protocol: 1 });
    }
    switch (m.type) {
      case "subscribe":
        for (const { docId, since } of m.docs) {
          const d = db.docs.get(docId);
          if (!canAccess(d)) {
            send({ type: "error", code: "doc_not_found", message: "unknown doc", ref: docId });
            continue;
          }
          c.subs.add(docId);
          if (heldDocs.has(docId)) {
            heldDocs.get(docId).push(() => send({ type: "updates", docId, snapshot: d.snapshot && since < d.snapshot.seq ? { seq: d.snapshot.seq, payload: d.snapshot.payload } : null, items: d.items.filter((i) => i.seq > Math.max(since, d.snapshot && since < d.snapshot.seq ? d.snapshot.seq : since)).map(({ seq, payload, deviceId }) => ({ seq, payload, deviceId })), upToDate: true }));
            continue;
          }
          let items = d.items.filter((i) => i.seq > since);
          let snapshot = null;
          if (d.snapshot && since < d.snapshot.seq) {
            snapshot = { seq: d.snapshot.seq, payload: d.snapshot.payload };
            items = d.items.filter((i) => i.seq > d.snapshot.seq);
          }
          const chunk = 100;
          if (!items.length) send({ type: "updates", docId, snapshot, items: [], upToDate: true });
          for (let i = 0; i < items.length; i += chunk)
            send({
              type: "updates",
              docId,
              snapshot: i === 0 ? snapshot : null,
              items: items.slice(i, i + chunk).map(({ seq, payload, deviceId }) => ({ seq, payload, deviceId })),
              upToDate: i + chunk >= items.length,
            });
        }
        break;
      case "unsubscribe":
        for (const id of m.docIds) c.subs.delete(id);
        break;
      case "push":
      case "snapshot": {
        const d = db.docs.get(m.docId);
        if (!canAccess(d)) return send({ type: "error", code: "doc_not_found", message: "unknown doc", ref: m.clientMsgId });
        if (c.shareId && c.permission !== "edit") return send({ type: "error", code: "forbidden", message: "view only", ref: m.clientMsgId });
        if (d.userId !== c.userId && memberRole(d) === "viewer") return send({ type: "error", code: "forbidden", message: "view only", ref: m.clientMsgId });
        if (refusePushes) return send({ type: "error", code: "internal", message: "refused by the test", ref: m.clientMsgId });
        const seq = (d.items[d.items.length - 1]?.seq ?? d.snapshot?.seq ?? 0) + 1;
        if (m.type === "snapshot") {
          d.snapshot = { seq: m.baseSeq, payload: m.payload };
          const since = d.history[d.history.length - 1]?.seq ?? 0;
          const authors = [];
          for (const a of d.authorLog ?? [])
            if (a.seq > since && a.seq <= m.baseSeq && !authors.some((x) => JSON.stringify(x) === JSON.stringify(a.author))) authors.push(a.author);
          d.history.push({ seq: m.baseSeq, payload: m.payload, deviceId: c.deviceId, createdAt: nowIso(), authors });
          send({ type: "ack", docId: m.docId, clientMsgId: m.clientMsgId, seq: m.baseSeq });
          break;
        }
        const item = { seq, payload: m.payload, deviceId: c.deviceId, createdAt: nowIso() };
        d.items.push(item);
        (d.authorLog ??= []).push({ seq, author: c.userId ? { kind: "user", userId: c.userId } : { kind: "guest", shareId: c.shareId } });
        send({ type: "ack", docId: m.docId, clientMsgId: m.clientMsgId, seq });
        for (const o of clients)
          if (o !== c && o.welcomed && o.subs.has(m.docId)) o.ws.send(JSON.stringify({ type: "update", docId: m.docId, seq, payload: m.payload, deviceId: c.deviceId }));
        break;
      }
      case "awareness":
        for (const o of clients)
          if (o !== c && o.welcomed && o.subs.has(m.docId)) o.ws.send(JSON.stringify({ type: "awareness", docId: m.docId, payload: m.payload, deviceId: c.deviceId }));
        break;
    }
  });
  ws.on("close", () => clients.delete(c));
});

server.listen(PORT, () => console.log(`mock server on http://localhost:${PORT}`));
