import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi, type UploadedAttachment } from "../src";
import { pendingPastedImage } from "../src/uploads";

declare global {
  interface Window {
    __paste?: { api: EditorApi; doc: Y.Doc; uploads: string[]; fetched: string[]; pendingImage: typeof pendingPastedImage; inflight: typeof inflight; ready: boolean };
  }
}

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Editor with an app host that stores every upload at once and fetches example.com/googleusercontent images. */
/** Remote fetches in flight now and at most (the paste's concurrency cap). */
export const inflight = { now: 0, max: 0 };

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
        inflight.now++;
        inflight.max = Math.max(inflight.max, inflight.now);
        try {
          if (url.includes("slow")) await new Promise((r) => setTimeout(r, 1500));
          if (url.includes("lag")) await new Promise((r) => setTimeout(r, 60));
        } finally {
          inflight.now--;
        }
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
            window.__paste = { api, doc, uploads, fetched, pendingImage: pendingPastedImage, inflight, ready: true };
          }, 0)
        }
      />
    </div>
  );
}
