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
  devices: new Map(), // deviceId -> { id, userId, name, createdAt, lastSeenAt }
  notebooks: new Map(), // id -> { id, userId, mode, createdAt, wrappedKey, serverKey }
  docs: new Map(), // docId -> { docId, userId, kind, notebookId, items: [{seq,payload,deviceId,createdAt}], snapshot }
  shares: new Map(),
  guests: new Map(), // guestToken -> shareId
  agentTokens: new Map(),
  recovery: new Map(),
};

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
const cors = {
  "access-control-allow-origin": "*",
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
route("POST", "/v1/auth/refresh", (_q, res, { body }) => {
  const r = db.refresh.get(body.refreshToken);
  if (!r || !db.devices.has(r.deviceId)) return err(res, 401, "unauthorized");
  db.refresh.delete(body.refreshToken);
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
  json(res, 200, issueSession(u, "Recovered device"));
});
route("POST", "/v1/auth/password", (_q, res, { auth, body }) => {
  if (!auth) return err(res, 401, "unauthorized");
  if (auth.user.loginKey !== body.currentLoginKey) return err(res, 403, "forbidden", "Wrong password");
  Object.assign(auth.user, { salt: body.salt, kdf: body.kdf, loginKey: body.loginKey, wrappedMasterKeyPassword: body.wrappedMasterKeyPassword });
  json(res, 204);
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
  db.devices.delete(params.id);
  for (const [k, s] of db.sessions) if (s.deviceId === params.id) db.sessions.delete(k);
  for (const [k, s] of db.refresh) if (s.deviceId === params.id) db.refresh.delete(k);
  for (const c of clients) if (c.deviceSession === params.id) c.ws.close();
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
  json(res, 200, { wrappedKey: n.wrappedKey });
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
  if (d) return d.userId === auth.userId ? json(res, 204) : err(res, 409, "conflict");
  db.docs.set(body.docId, { docId: body.docId, userId: auth.userId, kind: body.kind, notebookId: body.notebookId ?? null, items: [], snapshot: null, history: [] });
  json(res, 204);
});
route("DELETE", "/v1/docs/:id", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  db.docs.delete(params.id);
  json(res, 204);
});
route("GET", "/v1/docs/:id/versions", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  if (!d || d.userId !== auth.userId) return err(res, 404, "not_found");
  // Versions are the encrypted snapshots clients uploaded (the server can't merge ciphertext).
  json(res, 200, d.history.map(({ seq, createdAt, deviceId }) => ({ seq, createdAt, deviceId })).reverse());
});
route("GET", "/v1/docs/:id/versions/:seq", (_q, res, { auth, params }) => {
  if (!auth) return err(res, 401, "unauthorized");
  const d = db.docs.get(params.id);
  const v = d?.history.find((h) => h.seq === Number(params.seq));
  if (!d || d.userId !== auth.userId || !v) return err(res, 404, "not_found");
  json(res, 200, { payload: v.payload });
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
  const t = { id, userId: auth.userId, name: body.name, notebookIds: body.notebookIds, permission: body.permission, expiresAt: body.expiresAt ?? null, createdAt: nowIso(), lastUsedAt: null };
  db.agentTokens.set(id, t);
  json(res, 200, { id, token: `dsa_${b64u(randomBytes(24))}` });
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
  json(res, 200, []);
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
  const canAccess = (doc) => {
    if (!doc) return false;
    if (c.userId) return doc.userId === c.userId;
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
        const seq = (d.items[d.items.length - 1]?.seq ?? d.snapshot?.seq ?? 0) + 1;
        if (m.type === "snapshot") {
          d.snapshot = { seq: m.baseSeq, payload: m.payload };
          d.history.push({ seq: m.baseSeq, payload: m.payload, deviceId: c.deviceId, createdAt: nowIso() });
          send({ type: "ack", docId: m.docId, clientMsgId: m.clientMsgId, seq: m.baseSeq });
          break;
        }
        const item = { seq, payload: m.payload, deviceId: c.deviceId, createdAt: nowIso() };
        d.items.push(item);
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
