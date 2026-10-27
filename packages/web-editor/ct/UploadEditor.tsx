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
    __up?: { api: EditorApi; doc: Y.Doc; calls: Call[]; resolved: string[]; ready: boolean };
  }
}

// A 1×1 PNG.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Editor whose uploads the test drives by hand (progress, success, failure) through window.__up. */
export function UploadEditor() {
  const doc = useMemo(() => new Y.Doc(), []);
  const calls = useMemo<Call[]>(() => [], []);
  const resolved = useMemo<string[]>(() => [], []);
  const host = useMemo(
    () => ({
      uploadAttachment: (file: File, onProgress?: (done: number) => void) =>
        new Promise<UploadedAttachment>((resolve, reject) => calls.push({ file, onProgress, resolve, reject })),
      resolveAttachment: async (id: string) => {
        resolved.push(id);
        return PNG;
      },
    }),
    [calls, resolved],
  );
  return (
    <div style={{ width: 700, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        showPalette={false}
        bottomPadding={40}
        penSettings={{ tool: null }}
        host={host}
        onReady={(api) =>
          setTimeout(() => {
            api.editor.commands.setContent("<h1 data-type=title>Вложения</h1><p>Текст</p>");
            api.editor.commands.focus("end");
            window.__up = { api, doc, calls, resolved, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
