import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi, type UploadedAttachment } from "../src";

interface Call {
  file: File;
  onProgress?: (f: number) => void;
  resolve: (a: UploadedAttachment) => void;
  reject: (e: Error) => void;
}

declare global {
  interface Window {
    __up?: { api: EditorApi; doc: Y.Doc; calls: Call[]; resolved: string[]; send: (id: string, fraction: number | null) => void; ready: boolean };
  }
}

// A 1×1 PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Editor whose uploads the test drives by hand (progress, success, failure) through window.__up. */
export function UploadEditor({ palette = false }: { palette?: boolean }) {
  const doc = useMemo(() => new Y.Doc(), []);
  const calls = useMemo<Call[]>(() => [], []);
  const resolved = useMemo<string[]>(() => [], []);
  // Server upload progress the test sets by hand (host.watchAttachmentUpload).
  const sending = useMemo(() => ({ values: new Map<string, number | null>(), listeners: new Map<string, Set<(f: number | null) => void>>() }), []);
  const send = (id: string, fraction: number | null) => {
    sending.values.set(id, fraction);
    for (const l of sending.listeners.get(id) ?? []) l(fraction);
  };
  const host = useMemo(
    () => ({
      uploadAttachment: (file: File, opts?: { onProgress?: (fraction: number) => void }) =>
        new Promise<UploadedAttachment>((resolve, reject) => calls.push({ file, onProgress: opts?.onProgress, resolve, reject })),
      watchAttachmentUpload: (id: string, onProgress: (fraction: number | null) => void) => {
        let set = sending.listeners.get(id);
        if (!set) sending.listeners.set(id, (set = new Set()));
        set.add(onProgress);
        onProgress(sending.values.get(id) ?? null);
        return () => set!.delete(onProgress);
      },
      resolveAttachment: async (id: string) => {
        resolved.push(id);
        return PNG;
      },
    }),
    [calls, resolved, sending],
  );
  return (
    <div style={{ width: 700, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        showPalette={palette}
        bottomPadding={40}
        penSettings={{ tool: null }}
        host={host}
        onReady={(api) =>
          setTimeout(() => {
            api.editor.commands.setContent("<h1 data-type=title>Вложения</h1><p>Текст</p>");
            api.editor.commands.focus("end");
            window.__up = { api, doc, calls, resolved, send, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
