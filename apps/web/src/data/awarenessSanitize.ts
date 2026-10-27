// Remote presence is decrypted but comes from anyone with access to the note, guests included,
// and the editor puts the user's color into a style and the name into a caret label. Every
// update is decoded, each state's `user` is checked (audit 2026-10-27), and the update is
// re-encoded before it reaches the Awareness. Format (y-protocols/awareness): varUint count, then
// per client varUint clientID, varUint clock, varString JSON state ("null" = removed).

const COLOR = /^#[0-9a-f]{3,8}$/i;
const MAX_NAME = 64;
const MAX_ENTRIES = 256;
const MAX_STATE_BYTES = 16 * 1024;

class Reader {
  pos = 0;
  constructor(readonly buf: Uint8Array) {}
  uint(): number {
    let n = 0;
    let mult = 1;
    for (let i = 0; i < 8; i++) {
      if (this.pos >= this.buf.length) throw new Error("truncated");
      const b = this.buf[this.pos++]!;
      n += (b & 0x7f) * mult;
      if (b < 0x80) return n;
      mult *= 128;
    }
    throw new Error("varuint too long");
  }
  string(): string {
    const len = this.uint();
    if (len > MAX_STATE_BYTES || this.pos + len > this.buf.length) throw new Error("bad string");
    const s = new TextDecoder("utf-8", { fatal: true }).decode(this.buf.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }
}

function writeUint(out: number[], n: number) {
  while (n >= 0x80) {
    out.push((n % 128) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n);
}

/** A clean `user` field, or null to drop it (the editor then shows no caret label). */
export function sanitizeUser(u: unknown): { name: string; color: string; kind: "user" | "guest" } | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  if (typeof o.color !== "string" || !COLOR.test(o.color)) return null;
  // Control and bidi-override characters are stripped; the label is plain text in the editor.
  const name = typeof o.name === "string" ? o.name.replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g, "").trim().slice(0, MAX_NAME) : "";
  return { name: name || "Гость", color: o.color, kind: o.kind === "user" ? "user" : "guest" };
}

/** The update with every state's `user` validated; throws on a malformed update. */
export function sanitizeAwarenessUpdate(update: Uint8Array): Uint8Array {
  const r = new Reader(update);
  const count = r.uint();
  if (count > MAX_ENTRIES) throw new Error("too many states");
  const out: number[] = [];
  writeUint(out, count);
  for (let i = 0; i < count; i++) {
    const clientID = r.uint();
    const clock = r.uint();
    const raw = JSON.parse(r.string()) as unknown;
    let state: unknown = null;
    if (raw !== null) {
      if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("bad state");
      const { user, ...rest } = raw as Record<string, unknown>;
      const clean = sanitizeUser(user);
      state = clean ? { ...rest, user: clean } : rest;
    }
    writeUint(out, clientID);
    writeUint(out, clock);
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    writeUint(out, bytes.length);
    for (const b of bytes) out.push(b);
  }
  if (r.pos !== update.length) throw new Error("trailing bytes");
  return Uint8Array.from(out);
}
