// Checks this implementation against the committed shared vectors
// (packages/test-vectors/vectors), the same files the Swift tests use.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Y from "yjs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ATTACHMENT_CHUNK_BYTES,
  buildShareLink,
  parseShareLink,
  clientMessageSchema,
  decryptEnvelope,
  deriveRecoveryLoginKey,
  derivePasswordKeys,
  encryptAttachmentChunk,
  encryptEnvelope,
  extractNoteLinks,
  extractTags,
  extractTasks,
  formatRecoveryKey,
  fromBase64Url,
  fromHex,
  getPlainText,
  getTitle,
  initCrypto,
  layoutTextStroke,
  noteToMarkdown,
  packPoints,
  parseRecoveryKey,
  pmContentToY,
  pressureCurve,
  resolveAnchors,
  serverMessageSchema,
  strokeWidthAt,
  toBase64Url,
  toHex,
  unpackPoints,
  unwrapKey,
  uuidv7FromParts,
  wrapKey,
  yFragmentToPM,
  type GlyphBox,
  type PMNode,
  type ResolvedAnchor,
} from "../src/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const dir = join(import.meta.dirname, "..", "..", "test-vectors", "vectors");
const load = (name: string): Json => JSON.parse(readFileSync(join(dir, name), "utf8"));
const b = fromBase64Url;

beforeAll(async () => {
  await initCrypto();
});

describe("crypto vectors", () => {
  it("kdf", () => {
    for (const c of load("crypto/kdf.json").cases) {
      const k = derivePasswordKeys(c.password, b(c.salt), c.kdf);
      expect(toHex(new TextEncoder().encode(c.password.normalize("NFKC")))).toBe(
        c.passwordNfkcUtf8,
      );
      expect(toHex(k.authSeed)).toBe(c.authSeed);
      expect(toBase64Url(k.loginKey)).toBe(c.loginKey);
      expect(toBase64Url(k.passwordKey)).toBe(c.passwordKey);
    }
  });
  it("recovery key", () => {
    const v = load("crypto/recovery-key.json");
    for (const c of v.cases) {
      expect(formatRecoveryKey(fromHex(c.recoveryKey))).toBe(c.text);
      expect(toBase64Url(deriveRecoveryLoginKey(fromHex(c.recoveryKey)))).toBe(c.recoveryLoginKey);
    }
    for (const c of v.parse) {
      if (c.error)
        expect(() => parseRecoveryKey(c.input)).toThrow(expect.objectContaining({ code: c.error }));
      else expect(toHex(parseRecoveryKey(c.input))).toBe(c.recoveryKey);
    }
  });
  it("envelopes", () => {
    const v = load("crypto/envelope.json");
    for (const c of v.cases) {
      expect(
        toBase64Url(encryptEnvelope(b(c.key), b(c.plaintext), c.ad, { nonce: b(c.nonce) })),
      ).toBe(c.envelope);
      expect(toBase64Url(decryptEnvelope(b(c.key), b(c.envelope), c.ad))).toBe(c.plaintext);
    }
    for (const f of v.failures) {
      expect(() => decryptEnvelope(b(f.key), b(f.envelope), f.ad)).toThrow(
        expect.objectContaining({ code: f.error }),
      );
    }
  });
  it("key wraps", () => {
    for (const c of load("crypto/key-wraps.json").cases) {
      expect(wrapKey(b(c.wrappingKey), b(c.key), c.ad, { nonce: b(c.nonce) })).toBe(c.wrapped);
      expect(toBase64Url(unwrapKey(b(c.wrappingKey), c.wrapped, c.ad))).toBe(c.key);
    }
  });
  it("attachment chunks", () => {
    const v = load("crypto/attachment.json");
    const data = new Uint8Array(v.plaintextSize).map((_, i) => (i * 31 + 7) & 255);
    expect(createHash("sha256").update(data).digest("hex")).toBe(v.plaintextSha256);
    for (const c of v.chunks) {
      const plain = data.subarray(
        c.index * ATTACHMENT_CHUNK_BYTES,
        (c.index + 1) * ATTACHMENT_CHUNK_BYTES,
      );
      const env = encryptAttachmentChunk(b(v.noteKey), v.attachmentId, c.index, c.last, plain, {
        nonce: b(c.nonce),
      });
      expect(env.length).toBe(c.envelopeLength);
      expect(createHash("sha256").update(env).digest("hex")).toBe(c.envelopeSha256);
      if (c.envelope) expect(toBase64Url(env)).toBe(c.envelope);
    }
  });
});

describe("id vectors", () => {
  it("uuidv7", () => {
    for (const c of load("ids/uuidv7.json").cases)
      expect(uuidv7FromParts(c.unixMs, fromHex(c.rand))).toBe(c.uuid);
  });
});

describe("stroke vectors", () => {
  const mono =
    (perLine: number) =>
    (a: ResolvedAnchor): GlyphBox => ({
      x: (a.index % perLine) * 10,
      baseline: Math.floor(a.index / perLine) * 24 + 17,
      fontSize: 17,
      line: Math.floor(a.index / perLine),
    });
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const rounded = (segs: ReturnType<typeof layoutTextStroke>) =>
    segs.map((s) => s.map((p) => ({ x: round(p.x), y: round(p.y), width: round(p.width) })));

  it("points", () => {
    const v = load("strokes/points.json");
    expect(toHex(packPoints(v.points))).toBe(v.packedHex);
    expect(unpackPoints(fromHex(v.packedHex))).toEqual(v.points);
  });
  it("anchors through edits", () => {
    const v = load("strokes/anchors.json");
    const doc = new Y.Doc();
    Y.applyUpdate(doc, b(v.base));
    const anchors = v.anchors.map(b);
    for (const step of v.steps) {
      Y.applyUpdate(doc, b(step.update));
      const text = (doc.getXmlFragment("content").get(0) as Y.XmlElement).get(0) as Y.XmlText;
      expect(text.toString()).toBe(step.textAfter);
      expect(
        resolveAnchors(doc, anchors).map((r) =>
          r && !r.deleted ? { deleted: false, index: r.index } : { deleted: true },
        ),
      ).toEqual(step.anchors);
    }
  });
  it("layout", () => {
    const v = load("strokes/layout.json");
    const doc = new Y.Doc();
    Y.applyUpdate(doc, b(v.base));
    const text = (doc.getXmlFragment("content").get(0) as Y.XmlElement).get(0) as Y.XmlText;
    const anchors = v.anchors.map(b);
    expect(
      v.anchorIndices.map((i: number) =>
        toBase64Url(Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, i))),
      ),
    ).toEqual(v.anchors);
    const points = unpackPoints(b(v.points));
    for (const c of v.cases) {
      expect(
        rounded(layoutTextStroke(v.stroke, points, resolveAnchors(doc, anchors), mono(c.perLine))),
      ).toEqual(c.segments);
    }
    text.delete(4, 1);
    expect(
      rounded(layoutTextStroke(v.stroke, points, resolveAnchors(doc, anchors), mono(1000))),
    ).toEqual(v.afterDeletingIndex4.segments);
  });
  it("width", () => {
    for (const c of load("strokes/width.json").cases) {
      expect(round(pressureCurve(c.pressure))).toBe(c.f);
      expect(round(strokeWidthAt(c, c, c.scale))).toBe(c.result);
    }
  });
});

describe("document vectors", () => {
  it("note: decode, canonical JSON, derived data", () => {
    const v = load("document/note.json");
    const doc = new Y.Doc();
    Y.applyUpdate(doc, b(v.update));
    const frag = doc.getXmlFragment("content");
    expect(yFragmentToPM(frag)).toEqual(v.expected.content);
    expect(doc.getMap("meta").toJSON()).toEqual(v.expected.meta);
    expect(doc.getMap("comments").toJSON()).toEqual(v.expected.comments);
    const strokes = Object.fromEntries(
      [...doc.getMap("strokes").entries()].map(([id, m]) => {
        const j = (m as Y.Map<unknown>).toJSON() as Json;
        return [id, { ...j, anchors: j.anchors.map(toBase64Url), points: toBase64Url(j.points) }];
      }),
    );
    expect(strokes).toEqual(v.expected.strokes);
    const d = v.expected.derived;
    expect(getTitle(doc)).toBe(d.title);
    expect(getPlainText(doc)).toBe(d.plainText);
    expect(extractTasks(doc, v.noteId)).toEqual(d.tasks);
    expect(extractNoteLinks(doc, v.noteId)).toEqual(d.links);
    expect(extractTags(doc)).toEqual(d.tags);
    expect(
      noteToMarkdown(doc, {
        blocksWithHandwriting: new Set(["0192f3c4-0000-7000-8000-000000000065"]),
      }),
    ).toBe(d.markdown);
  });
  it("note: our writer produces the same tree as y-prosemirror", () => {
    const v = load("document/note.json");
    const ref = new Y.Doc();
    Y.applyUpdate(ref, b(v.update));
    const ours = new Y.Doc();
    ours.getXmlFragment("content").insert(0, pmContentToY((v.expected.content as PMNode).content));
    expect(ours.getXmlFragment("content").toJSON()).toBe(ref.getXmlFragment("content").toJSON());
  });
  it("notebook and account", () => {
    for (const name of ["document/notebook.json", "document/account.json"]) {
      const v = load(name);
      const doc = new Y.Doc();
      Y.applyUpdate(doc, b(v.update));
      for (const key of Object.keys(v.expected)) {
        const type = Array.isArray(v.expected[key]) ? doc.getArray(key) : doc.getMap(key);
        expect(type.toJSON()).toEqual(v.expected[key]);
      }
    }
  });
});

describe("sync vectors", () => {
  it("valid frames parse, invalid frames are rejected", () => {
    const v = load("sync/messages.json");
    for (const m of v.valid.client) expect(clientMessageSchema.safeParse(m).success).toBe(true);
    for (const m of v.valid.server) expect(serverMessageSchema.safeParse(m).success).toBe(true);
    for (const c of v.invalid.client)
      expect(clientMessageSchema.safeParse(c.message).success, c.reason).toBe(false);
    for (const c of v.invalid.server)
      expect(serverMessageSchema.safeParse(c.message).success, c.reason).toBe(false);
  });
});

describe("extra crypto vectors", () => {
  it("base64url", () => {
    const v = load("crypto/base64url.json");
    for (const c of v.encode) {
      expect(toBase64Url(fromHex(c.hex))).toBe(c.base64url);
      expect(toHex(fromBase64Url(c.base64url))).toBe(c.hex);
    }
    for (const c of v.rejectDecode) expect(() => fromBase64Url(c.input), c.reason).toThrow();
  });
  it("share links", () => {
    const v = load("crypto/share-link.json");
    for (const c of v.build) {
      expect(buildShareLink(c.origin, c.shareId, b(c.key))).toBe(c.url);
      const p = parseShareLink(c.url);
      expect(p.shareId).toBe(c.shareId);
      expect(toBase64Url(p.key)).toBe(c.key);
    }
    for (const c of v.reject) expect(() => parseShareLink(c.url), c.reason).toThrow();
  });
  it("signup flow", () => {
    const { inputs: i, expected: e } = load("crypto/signup-flow.json");
    const pk = derivePasswordKeys(i.password, b(i.salt));
    expect(formatRecoveryKey(b(i.recoveryKey))).toBe(e.recoveryKeyText);
    expect(toBase64Url(pk.loginKey)).toBe(e.body.loginKey);
    expect(toBase64Url(deriveRecoveryLoginKey(b(i.recoveryKey)))).toBe(e.body.recoveryLoginKey);
    expect(
      wrapKey(pk.passwordKey, b(i.masterKey), `ds1|key|master|password|${i.userId}`, {
        nonce: b(i.nonceMasterPassword),
      }),
    ).toBe(e.body.wrappedMasterKeyPassword);
    expect(
      wrapKey(b(i.recoveryKey), b(i.masterKey), `ds1|key|master|recovery|${i.userId}`, {
        nonce: b(i.nonceMasterRecovery),
      }),
    ).toBe(e.body.wrappedMasterKeyRecovery);
  });
});

describe("api vectors", () => {
  it("valid bodies parse, invalid bodies are rejected", async () => {
    const contracts = (await import("../src/contracts/index.js")) as unknown as Record<
      string,
      { safeParse(v: unknown): { success: boolean } }
    >;
    const v = load("api/bodies.json");
    for (const [name, c] of Object.entries(v.cases) as [string, Json][]) {
      const schema = contracts[`${name}Schema`];
      expect(schema, name).toBeDefined();
      for (const body of c.valid)
        expect(schema!.safeParse(body).success, `${name} valid`).toBe(true);
      for (const bad of c.invalid)
        expect(schema!.safeParse(bad.body).success, `${name}: ${bad.reason}`).toBe(false);
    }
  });
});

describe("recovery key rotation vector", () => {
  it("builds the expected body", async () => {
    const { rotateRecoveryKey, unwrapMasterKeyWithRecovery } = await import("../src/index.js");
    const { inputs: i, expected: e } = load("crypto/recovery-rotate.json");
    const r = rotateRecoveryKey(b(i.masterKey), b(i.currentLoginKey), i.userId, {
      recoveryKey: b(i.newRecoveryKey),
      nonce: b(i.nonce),
    });
    expect(r.recoveryKeyText).toBe(e.recoveryKeyText);
    expect(r.body).toEqual(e.body);
    expect(
      toBase64Url(
        unwrapMasterKeyWithRecovery(r.body.wrappedMasterKeyRecovery, r.recoveryKey, i.userId),
      ),
    ).toBe(i.masterKey);
  });
});
