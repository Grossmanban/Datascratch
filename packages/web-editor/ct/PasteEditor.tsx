import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi, type UploadedAttachment } from "../src";

declare global {
  interface Window {
    __paste?: { api: EditorApi; doc: Y.Doc; uploads: string[]; fetched: string[]; ready: boolean };
  }
}

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Editor with an app host that stores every upload at once and fetches example.com/googleusercontent images. */
export function PasteEditor() {
  const doc = useMemo(() => new Y.Doc(), []);
  const uploads = useMemo<string[]>(() => [], []);
  const fetched = useMemo<string[]>(() => [], []);
  const host = useMemo(
    () => ({
      uploadAttachment: async (file: File): Promise<UploadedAttachment> => {
        uploads.push(file.name);
        return { attachmentId: `att-${uploads.length}`, name: file.name, size: file.size, mime: file.type };
      },
      resolveAttachment: async () => PNG,
      fetchRemoteImage: async (url: string): Promise<File> => {
        fetched.push(url);
        if (url.includes("blocked")) throw new Error("CORS");
        return new File([new Uint8Array([137, 80, 78, 71])], url.split("/").pop() || "image.png", { type: "image/png" });
      },
    }),
    [uploads, fetched],
  );
  return (
    <div style={{ width: 760, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        showPalette={false}
        bottomPadding={40}
        penSettings={{ tool: null }}
        host={host}
        onReady={(api) =>
          setTimeout(() => {
            api.editor.commands.setContent("<h1 data-type=title>Вставка</h1><p></p>");
            api.undoManager.clear();
            window.__paste = { api, doc, uploads, fetched, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
