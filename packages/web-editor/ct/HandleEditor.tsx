import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor } from "../src";

/** Text-mode editor (no pen tool, finger scrolls) seeded with numbered paragraphs; API on window.__ct. */
export function HandleEditor({ count = 30 }: { count?: number }) {
  const doc = useMemo(() => new Y.Doc(), []);
  const html = Array.from({ length: count }, (_, i) => `<p>Абзац ${i + 1} — достаточно текста, чтобы строка была заметной.</p>`).join("");
  return (
    <div style={{ width: 640, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        user={{ id: "tester", name: "Tester", color: "#2E5BDB" }}
        showPalette={false}
        bottomPadding={40}
        penSettings={{ tool: null, drawWithAnyPointer: false }}
        onReady={(api) => {
          setTimeout(() => {
            if (api.editor.isDestroyed) return;
            api.editor.commands.setContent(`<h1 data-type=title>Ручки</h1>${html}`);
            api.undoManager.clear();
            window.__ct = { api, doc, ready: true };
          }, 0);
        }}
      />
    </div>
  );
}
