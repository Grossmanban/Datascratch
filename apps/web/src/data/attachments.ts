import { ApiError, NetworkError, request, timedFetch } from "@/api/client";
import { apiBase } from "@/config";
import { getSession } from "@/auth/session";
import { ad, open, seal, uuidv7 } from "@/lib/shared";
import { accountDb, type AttachmentRow, type ChunkRow } from "./db";

export const CHUNK_PLAIN = 1024 * 1024; // crypto.md §6: 1 MiB of plaintext per envelope
export const MAX_ATTACHMENT = 200 * 1024 * 1024; // api.md default limit

const chunkKey = (id: string, index: number) => `${id}:${index}`;

/**
 * Encrypt a file with the note key, keep the encrypted chunks locally (works offline) and
 * upload them in the background. Returns the attachmentId to reference from the document.
 */
export async function storeAttachment(noteId: string, noteKey: Uint8Array, data: Uint8Array, mime: string): Promise<string> {
  if (data.length > MAX_ATTACHMENT) throw new Error("payload_too_large");
  const id = uuidv7();
  const chunkCount = Math.max(1, Math.ceil(data.length / CHUNK_PLAIN));
  const db = accountDb();
  let size = 0;
  const rows: ChunkRow[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const last = i === chunkCount - 1;
    const env = await seal(noteKey, data.subarray(i * CHUNK_PLAIN, (i + 1) * CHUNK_PLAIN), ad.attachmentChunk(id, i, last));
    size += env.length;
    rows.push({ key: chunkKey(id, i), attachmentId: id, index: i, data: env });
  }
  const row: AttachmentRow = {
    id,
    noteId,
    mime,
    plainSize: data.length,
    size,
    chunkCount,
    registered: 0,
    uploaded: [],
    local: 1,
    createdAt: Date.now(),
  };
  await db.transaction("rw", db.attachments, db.chunks, async () => {
    await db.attachments.put(row);
    await db.chunks.bulkPut(rows);
  });
  void uploadPending();
  return id;
}

async function putChunk(id: string, index: number, data: Uint8Array) {
  const session = getSession();
  let res: Response;
  try {
    res = await timedFetch(`${apiBase()}/attachments/${id}/chunks/${index}`, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream", ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}) },
      body: data as BodyInit,
    });
  } catch (e) {
    throw new NetworkError(e);
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 401 ? "unauthorized" : "internal", res.statusText);
}

let uploading: Promise<boolean> | null = null;
let again = false;

/** Upload whatever is not on the server yet (resumable per chunk). Resolves false when offline. */
export function uploadPending(): Promise<boolean> {
  if (uploading) {
    again = true;
    return uploading;
  }
  uploading = (async () => {
    let ok = true;
    do {
      again = false;
      ok = await runUploads();
    } while (ok && again);
    return ok;
  })().finally(() => (uploading = null));
  return uploading;
}

async function runUploads(): Promise<boolean> {
  const db = accountDb();
  const pending = (await db.attachments.toArray()).filter((a) => !a.registered || a.uploaded.length < a.chunkCount);
  for (const a of pending) {
    try {
      if (!a.registered) {
        // The server knows the attachment's note only once the note is registered (queued POST /docs);
        // registering it re-runs the uploads.
        if ((await db.docs.get(a.noteId))?.registered === 0) continue;
        await request("POST", "/attachments", {
          body: { attachmentId: a.id, noteId: a.noteId, size: a.size, chunkCount: a.chunkCount, mime: a.mime },
        }).catch((e) => {
          if (!(e instanceof ApiError && e.code === "conflict")) throw e;
        });
        await db.attachments.update(a.id, { registered: 1 });
      }
      const done = new Set(a.uploaded);
      for (let i = 0; i < a.chunkCount; i++) {
        if (done.has(i)) continue;
        const chunk = await db.chunks.get(chunkKey(a.id, i));
        if (!chunk) break;
        await putChunk(a.id, i, chunk.data);
        done.add(i);
        await db.attachments.update(a.id, { uploaded: [...done] });
      }
    } catch (e) {
      if (e instanceof NetworkError) return false;
      if (e instanceof ApiError && (e.status === 401 || e.status >= 500)) return false;
      console.warn("Attachment upload failed", a.id, e);
    }
  }
  return true;
}

async function fetchChunk(id: string, index: number, auth: string | null): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await timedFetch(`${apiBase()}/attachments/${id}/chunks/${index}`, { headers: auth ? { authorization: `Bearer ${auth}` } : {} });
  } catch (e) {
    throw new NetworkError(e);
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 404 ? "not_found" : "internal", res.statusText);
  return new Uint8Array(await res.arrayBuffer());
}

const urlCache = new Map<string, Promise<string>>();

/**
 * Decrypt an attachment into an object URL. Encrypted chunks are cached locally so images
 * keep working offline. `auth` overrides the bearer (guests pass their guest token).
 */
export function attachmentUrl(
  id: string,
  key: Uint8Array,
  opts: { mime?: string; auth?: string | null; persist?: boolean } = {},
): Promise<string> {
  let p = urlCache.get(id);
  if (!p) {
    p = loadAttachment(id, key, opts).catch((e) => {
      urlCache.delete(id);
      throw e;
    });
    urlCache.set(id, p);
  }
  return p;
}

async function loadAttachment(id: string, key: Uint8Array, opts: { mime?: string; auth?: string | null; persist?: boolean }): Promise<string> {
  const persist = opts.persist ?? true;
  const db = persist ? accountDb() : null;
  const local = db ? await db.attachments.get(id) : undefined;
  let chunkCount = local?.chunkCount;
  let mime = local?.mime ?? opts.mime ?? "application/octet-stream";
  const auth = opts.auth !== undefined ? opts.auth : getSession()?.accessToken ?? null;
  if (!chunkCount) {
    type Meta = { size: number; chunkCount: number; mime?: string };
    let meta: Meta;
    if (opts.auth === undefined) meta = await request<Meta>("GET", `/attachments/${id}`);
    else {
      const res = await timedFetch(`${apiBase()}/attachments/${id}`, { headers: opts.auth ? { authorization: `Bearer ${opts.auth}` } : {} }).catch((e) => {
        throw new NetworkError(e);
      });
      if (!res.ok) throw new ApiError(res.status, "not_found", res.statusText);
      meta = (await res.json()) as Meta;
    }
    chunkCount = meta.chunkCount;
    mime = meta.mime ?? mime;
  }
  const parts: Uint8Array[] = [];
  for (let i = 0; i < chunkCount; i++) {
    let env = db ? (await db.chunks.get(chunkKey(id, i)))?.data : undefined;
    if (!env) {
      env = await fetchChunk(id, i, auth);
      if (db) await db.chunks.put({ key: chunkKey(id, i), attachmentId: id, index: i, data: env });
    }
    parts.push(await open(key, env, ad.attachmentChunk(id, i, i === chunkCount - 1)));
  }
  if (db && !local) {
    await db.attachments.put({
      id,
      noteId: "",
      mime,
      plainSize: parts.reduce((n, p) => n + p.length, 0),
      size: 0,
      chunkCount,
      registered: 1,
      uploaded: Array.from({ length: chunkCount }, (_, i) => i),
      local: 1,
      createdAt: Date.now(),
    });
  }
  return URL.createObjectURL(new Blob(parts as BlobPart[], { type: mime }));
}

/** Downscale an image file (keeps covers and thumbnails light). */
export async function resizeImage(file: Blob, maxWidth: number, quality = 0.86): Promise<{ data: Uint8Array; mime: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return { data: new Uint8Array(await blob.arrayBuffer()), mime: "image/jpeg" };
}
