import { ApiError, NetworkError, request, timedFetch } from "@/api/client";
import { apiBase } from "@/config";
import { getSession } from "@/auth/session";
import { opensInline, safeBlobType } from "@/lib/safeMime";
import { ad, open, seal, uuidv7 } from "@/lib/shared";
import { create } from "zustand";
import { accountDb, type AttachmentRow, type ChunkRow } from "./db";

export const CHUNK_PLAIN = 1024 * 1024; // crypto.md §6: 1 MiB of plaintext per envelope
export const MAX_ATTACHMENT = 200 * 1024 * 1024; // api.md default limit
/**
 * Chunks in flight at once, uploads and downloads. One request per chunk costs ~0.5 s of latency;
 * one at a time made a paste of eight screenshots take minutes.
 */
export const CHUNK_CONCURRENCY = 3;

/**
 * Runs `work` over `items` with at most `limit` running at once, in order of start. A rejection
 * stops new starts; the ones in flight finish, then the first rejection is thrown.
 */
export async function inPool<T>(items: readonly T[], limit: number, work: (item: T, index: number) => Promise<void>): Promise<void> {
  let next = 0;
  let failure: { error: unknown } | null = null;
  const lane = async () => {
    while (!failure && next < items.length) {
      const i = next++;
      try {
        await work(items[i]!, i);
      } catch (error) {
        failure ??= { error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  if (failure) throw (failure as { error: unknown }).error;
}

/**
 * Attachments on their way to the server, for the sync indicator («Отправляются картинки: 3 из 8»)
 * and the ring on a picture (EditorHost.watchAttachmentUpload). `progress` holds 0…1 per attachment
 * still to upload (0 = queued); `batch`/`done` count the attachments since the last time
 * everything was uploaded.
 */
interface UploadProgress {
  progress: Record<string, number>;
  batch: Record<string, { image: boolean }>;
  done: Record<string, true>;
}
export const useAttachmentUploads = create<UploadProgress>(() => ({ progress: {}, batch: {}, done: {} }));

function trackPending(rows: Pick<AttachmentRow, "id" | "mime" | "chunkCount" | "uploaded">[]) {
  useAttachmentUploads.setState((s) => {
    // A new batch starts once the previous one has gone up completely.
    const finished = Object.keys(s.batch).every((id) => s.done[id]);
    const batch = finished ? {} : { ...s.batch };
    const done = finished ? {} : { ...s.done };
    const progress = { ...s.progress };
    for (const r of rows) {
      progress[r.id] = r.uploaded.length / Math.max(1, r.chunkCount);
      batch[r.id] ??= { image: r.mime.startsWith("image/") };
    }
    return { progress, batch, done };
  });
}

function trackChunk(id: string, uploaded: number, chunkCount: number) {
  useAttachmentUploads.setState((s) => {
    if (uploaded < chunkCount) return { progress: { ...s.progress, [id]: uploaded / chunkCount } };
    const { [id]: _, ...progress } = s.progress;
    return { progress, done: { ...s.done, [id]: true } };
  });
}

/** Calls `onProgress` with 0…1 while the attachment is still to upload, `null` once it is on the server. */
export function watchAttachmentUpload(id: string, onProgress: (fraction: number | null) => void): () => void {
  let last: number | null | undefined;
  const emit = (s: UploadProgress) => {
    const v = s.progress[id] ?? null;
    if (v !== last) onProgress((last = v));
  };
  emit(useAttachmentUploads.getState());
  return useAttachmentUploads.subscribe(emit);
}

/** Sign-out: nothing of the previous account is shown as uploading. */
export function resetAttachmentUploads() {
  useAttachmentUploads.setState({ progress: {}, batch: {}, done: {} });
}

const chunkKey = (id: string, index: number) => `${id}:${index}`;

/**
 * Encrypt a file with the note key, keep the encrypted chunks locally (works offline) and
 * upload them in the background. Returns the attachmentId to reference from the document.
 * `onProgress` gets 0…1 as the chunks are sealed (what the user waits for before the block can
 * point at the attachment); the upload itself runs in the background afterwards.
 */
export async function storeAttachment(
  noteId: string,
  noteKey: Uint8Array,
  data: Uint8Array,
  mime: string,
  onProgress?: (done: number) => void,
): Promise<string> {
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
    if (onProgress) {
      onProgress((i + 1) / chunkCount);
      // Let the page paint the progress between chunks of a big file.
      if (!last) await new Promise((r) => setTimeout(r, 0));
    }
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
  trackPending([row]);
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

/** Offline, signed out or the server is down: stop and try again later (the chunks stay queued). */
const isRetryable = (e: unknown) => e instanceof NetworkError || (e instanceof ApiError && (e.status === 401 || e.status >= 500));

async function runUploads(): Promise<boolean> {
  const db = accountDb();
  const pending = (await db.attachments.toArray()).filter((a) => !a.registered || a.uploaded.length < a.chunkCount);
  trackPending(pending);
  // Register each attachment (cheap, in order), then send all their missing chunks through one
  // pool of CHUNK_CONCURRENCY requests: eight one-chunk screenshots go up three at a time too.
  const work: { a: AttachmentRow; index: number }[] = [];
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
      for (let i = 0; i < a.chunkCount; i++) if (!done.has(i)) work.push({ a, index: i });
    } catch (e) {
      if (isRetryable(e)) return false;
      console.warn("Attachment upload failed", a.id, e);
    }
  }
  const broken = new Set<string>();
  try {
    await inPool(work, CHUNK_CONCURRENCY, async ({ a, index }) => {
      if (broken.has(a.id)) return;
      try {
        const chunk = await db.chunks.get(chunkKey(a.id, index));
        if (!chunk) throw new Error(`chunk ${index} is missing locally`);
        await putChunk(a.id, index, chunk.data);
        // Chunks of one attachment finish in any order: record each one atomically (resume after a
        // break sends only what is missing).
        let uploaded = 0;
        await db.attachments
          .where("id")
          .equals(a.id)
          .modify((row) => {
            if (!row.uploaded.includes(index)) row.uploaded.push(index);
            uploaded = row.uploaded.length;
          });
        trackChunk(a.id, uploaded, a.chunkCount);
      } catch (e) {
        if (isRetryable(e)) throw e;
        broken.add(a.id);
        console.warn("Attachment upload failed", a.id, e);
      }
    });
  } catch (e) {
    if (isRetryable(e)) return false;
    throw e;
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

/** Signing out (or a wiped device, D-53): decrypted attachments leave memory too. */
export function forgetDecryptedAttachments() {
  for (const p of urlCache.values()) void p.then((url) => URL.revokeObjectURL(url)).catch(() => undefined);
  urlCache.clear();
}

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
  const parts: Uint8Array[] = new Array(chunkCount);
  const total = chunkCount;
  await inPool(Array.from({ length: total }, (_, i) => i), CHUNK_CONCURRENCY, async (i) => {
    let env = db ? (await db.chunks.get(chunkKey(id, i)))?.data : undefined;
    if (!env) {
      env = await fetchChunk(id, i, auth);
      if (db) await db.chunks.put({ key: chunkKey(id, i), attachmentId: id, index: i, data: env });
    }
    parts[i] = await open(key, env, ad.attachmentChunk(id, i, i === total - 1));
  });
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
  // Never the stored type as is: a document type would run scripts on our origin (lib/safeMime).
  return URL.createObjectURL(new Blob(parts as BlobPart[], { type: safeBlobType(mime) }));
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

/**
 * Show a decrypted attachment: a raster image, PDF or text opens in a tab; anything else is
 * downloaded under its name, never rendered on our origin (lib/safeMime).
 */
export async function openDecrypted(url: string, name: string, mime: string) {
  if (opensInline(mime)) {
    window.open(url, "_blank", "noopener");
    return;
  }
  // The blob already carries only an allowlisted type (attachmentUrl → safeBlobType), so the same
  // URL is downloaded as is (fetching a blob: URL would be refused by the CSP's connect-src).
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "file";
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
}

/**
 * An SVG is never stored as SVG (it is a document that can carry scripts): it is drawn into a PNG
 * (an <img> renders SVG without running scripts), at most `maxSide` pixels on its longer side.
 */
export async function svgToPng(file: Blob, name: string, maxSide = 2048): Promise<File> {
  const url = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth || 1024;
    const h0 = img.naturalHeight || 1024;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w0 * scale));
    canvas.height = Math.max(1, Math.round(h0 * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("svg could not be drawn"))), "image/png"));
    return new File([png], name.replace(/\.svgz?$/i, "") + ".png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
