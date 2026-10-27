// Image and file insertion with an immediate placeholder: the block goes into the note at once
// (attachmentId null) with a local preview and a quiet progress ring, while the app encrypts and
// stores the file; when it is stored the same block (same blockId — one CRDT element) gets its
// attachmentId. On failure the block offers «Повторить» / «Удалить». The upload state (preview URL,
// progress, the File itself) is local to this client and never goes into the document.
import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { uuidv7 } from "@datascratch/shared/ids";
import type { HostRef, UploadedAttachment } from "./host";

export interface UploadState {
  kind: "image" | "file";
  /** The local file; null for a pasted image until it is decoded (data:) or fetched (http). */
  file: File | null;
  /** Where a pasted image comes from (data: or http(s) URL). */
  source?: { src: string; alt: string };
  /** Object URL of the local file (images), revoked when the upload is over. */
  previewUrl: string | null;
  /** 0..1, or null while the app reports no progress. */
  progress: number | null;
  status: "uploading" | "failed";
}

type Listener = (state: UploadState | null) => void;

/** Local upload states by blockId (node views subscribe to their own block). */
class UploadRegistry {
  private states = new Map<string, UploadState>();
  private listeners = new Map<string, Set<Listener>>();
  get(blockId: string): UploadState | null {
    return this.states.get(blockId) ?? null;
  }
  set(blockId: string, state: UploadState | null): void {
    const prev = this.states.get(blockId);
    if (state) this.states.set(blockId, state);
    else {
      this.states.delete(blockId);
      if (prev?.previewUrl) {
        // Let the final image replace the preview before the URL goes away.
        const url = prev.previewUrl;
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }
    for (const l of this.listeners.get(blockId) ?? []) l(state);
  }
  update(blockId: string, patch: Partial<UploadState>): void {
    const s = this.states.get(blockId);
    if (s) this.set(blockId, { ...s, ...patch });
  }
  subscribe(blockId: string, l: Listener): () => void {
    let set = this.listeners.get(blockId);
    if (!set) this.listeners.set(blockId, (set = new Set()));
    set.add(l);
    return () => set!.delete(l);
  }
}

export const uploads = new UploadRegistry();

/** Position of the block with this blockId, or null if it is gone (undone, deleted, remote edit). */
function findBlock(editor: Editor, blockId: string): number | null {
  let found: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (node.attrs.blockId === blockId) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

const jobs = new Map<string, { editor: Editor; host: HostRef }>();

/** A data: URL as a File (decoded here: the app's CSP need not allow fetching data:). */
function dataUrlToFile(src: string, name: string): File {
  const [head, body = ""] = src.split(",", 2);
  const mime = /data:([^;,]+)/.exec(head!)?.[1] ?? "image/png";
  const bytes = /;base64/i.test(head!) ? Uint8Array.from(atob(body), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(body));
  const ext = mime.split("/")[1]?.replace("+xml", "") ?? "png";
  return new File([bytes], name || `image.${ext}`, { type: mime });
}

/** A pasted http(s) image that cannot be fetched becomes a link to its URL (no history step). */
function imageToLink(editor: Editor, blockId: string, src: string, alt: string): void {
  const pos = findBlock(editor, blockId);
  if (pos === null) return;
  const { schema } = editor.state;
  const node = editor.state.doc.nodeAt(pos)!;
  const link = schema.marks.link!.create({ href: src });
  const para = schema.nodes.paragraph!.create(null, schema.text(alt || src, [link]));
  editor.view.dispatch(editor.state.tr.replaceWith(pos, pos + node.nodeSize, para).setMeta("addToHistory", false));
}

async function run(blockId: string): Promise<void> {
  const job = jobs.get(blockId);
  let state = uploads.get(blockId);
  if (!job || !state) return;
  const upload = job.host.current.uploadAttachment;
  if (!upload) return uploads.update(blockId, { status: "failed" });
  uploads.update(blockId, { status: "uploading", progress: null });
  if (!state.file && state.source) {
    const { src, alt } = state.source;
    try {
      const file = src.startsWith("data:") ? dataUrlToFile(src, alt) : await (job.host.current.fetchRemoteImage?.(src) ?? Promise.reject(new Error("no fetch")));
      const previewUrl = state.previewUrl ?? URL.createObjectURL(file);
      uploads.update(blockId, { file, previewUrl });
      state = uploads.get(blockId)!;
    } catch {
      if (src.startsWith("data:")) return uploads.update(blockId, { status: "failed" });
      jobs.delete(blockId);
      uploads.set(blockId, null);
      if (!job.editor.isDestroyed) imageToLink(job.editor, blockId, src, alt);
      return;
    }
  }
  let stored: UploadedAttachment;
  try {
    stored = await upload(state.file!, (done) => {
      if (uploads.get(blockId)?.status === "uploading") uploads.update(blockId, { progress: Math.max(0, Math.min(1, done)) });
    });
  } catch {
    uploads.update(blockId, { status: "failed" });
    return;
  }
  const { editor } = job;
  const pos = editor.isDestroyed ? null : findBlock(editor, blockId);
  if (pos !== null) {
    const node = editor.state.doc.nodeAt(pos)!;
    const attrs = state.kind === "image" ? { ...node.attrs, attachmentId: stored.attachmentId } : { ...node.attrs, attachmentId: stored.attachmentId, name: stored.name, size: stored.size, mime: stored.mime };
    // Same node, same blockId: y-prosemirror only sets the attribute on the existing element. Not an
    // undo step of its own — undoing the insertion removes the block.
    editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, attrs).setMeta("addToHistory", false));
  }
  jobs.delete(blockId);
  uploads.set(blockId, null);
}

/**
 * Inserts an image (image/*) or file block for `file` at the selection right away and uploads the
 * file in the background. Returns the new block's id.
 */
export function insertUpload(editor: Editor, host: HostRef, file: File): string {
  const kind = file.type.startsWith("image/") ? "image" : "file";
  const blockId = uuidv7();
  uploads.set(blockId, { kind, file, previewUrl: kind === "image" ? URL.createObjectURL(file) : null, progress: null, status: "uploading" });
  jobs.set(blockId, { editor, host });
  const attrs =
    kind === "image"
      ? { blockId, attachmentId: null, alt: file.name }
      : { blockId, attachmentId: null, name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
  // One transaction: the block at the caret (after a selected block, never replacing it) and the
  // caret in the text right after it — never a node selection on the placeholder (undoing the
  // insertion while it is selected trips y-prosemirror's selection restore).
  const { state } = editor;
  const node = state.schema.nodes[kind]!.create(attrs);
  const tr = state.tr;
  if (state.selection instanceof NodeSelection) tr.insert(state.selection.to, node);
  else tr.replaceSelectionWith(node, false);
  let pos: number | null = null;
  tr.doc.descendants((n, p) => {
    if (pos !== null) return false;
    if (n.attrs.blockId === blockId) pos = p;
    return pos === null;
  });
  if (pos !== null) {
    const after = pos + node.nodeSize;
    if (!tr.doc.nodeAt(after)?.isTextblock) tr.insert(after, state.schema.nodes.paragraph!.create());
    tr.setSelection(TextSelection.create(tr.doc, after + 1));
  }
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
  void run(blockId);
  return blockId;
}

/** «Повторить» after a failed upload. */
export function retryUpload(blockId: string): void {
  void run(blockId);
}

/** «Удалить»: drops the placeholder block and its local state. */
export function removeUpload(editor: Editor, blockId: string): void {
  jobs.delete(blockId);
  uploads.set(blockId, null);
  const pos = findBlock(editor, blockId);
  if (pos !== null) {
    const node = editor.state.doc.nodeAt(pos)!;
    editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
  }
}

/** Opens the system file picker (images or any file) and inserts what the user picks. */
export function pickAndInsert(editor: Editor, host: HostRef, accept: "image/*" | "*/*"): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = true;
  input.addEventListener("change", () => {
    for (const file of Array.from(input.files ?? [])) insertUpload(editor, host, file);
  });
  input.click();
}

/** Pasted images waiting for the paste transaction (blockId → source). */
const pendingPasted = new Map<string, { src: string; alt: string }>();

/** Ids the paste keeps (the blockId plugin strips ids from pasted content otherwise). */
export function isPendingPastedImage(blockId: string): boolean {
  return pendingPasted.has(blockId);
}

/** Registers the images of an HTML paste (normalizePastedHtml) before ProseMirror parses it. */
export function preparePastedImages(images: Map<string, { src: string; alt: string }>): void {
  pendingPasted.clear();
  for (const [id, img] of images) pendingPasted.set(id, img);
}

/** After the paste landed: every placeholder that made it into the note starts its upload. */
export function startPastedImages(editor: Editor, host: HostRef): void {
  if (!pendingPasted.size) return;
  const ids = [...pendingPasted.keys()];
  const present = new Set<string>();
  editor.state.doc.descendants((n) => {
    if (n.type.name === "image" && n.attrs.blockId && pendingPasted.has(n.attrs.blockId)) present.add(n.attrs.blockId);
    return true;
  });
  for (const id of ids) {
    const source = pendingPasted.get(id)!;
    pendingPasted.delete(id);
    if (!present.has(id)) continue;
    // http(s) images show the remote picture as their preview while it is fetched.
    uploads.set(id, { kind: "image", file: null, source, previewUrl: source.src.startsWith("data:") ? null : source.src, progress: null, status: "uploading" });
    jobs.set(id, { editor, host });
    void run(id);
  }
}
