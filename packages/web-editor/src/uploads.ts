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
  file: File;
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

async function run(blockId: string): Promise<void> {
  const job = jobs.get(blockId);
  const state = uploads.get(blockId);
  if (!job || !state) return;
  const upload = job.host.current.uploadAttachment;
  if (!upload) return uploads.update(blockId, { status: "failed" });
  uploads.update(blockId, { status: "uploading", progress: null });
  let stored: UploadedAttachment;
  try {
    stored = await upload(state.file, {
      onProgress: (fraction) => {
        if (uploads.get(blockId)?.status === "uploading") uploads.update(blockId, { progress: Math.max(0, Math.min(1, fraction)) });
      },
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
