import { useMemo } from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { DatascratchEditor, type EditorApi } from "../src";

declare global {
  interface Window {
    __aw?: { api: EditorApi | null; apis: EditorApi[]; awareness: Record<string, Awareness>; ready: boolean };
  }
}

const docs: Record<string, Y.Doc> = {};
const awarenesses: Record<string, Awareness> = {};

/** Editor whose doc and awareness are chosen by key, so a test can swap them through props. */
export function AwarenessEditor({ docKey, awarenessKey }: { docKey: string; awarenessKey: string | null }) {
  const doc = useMemo(() => (docs[docKey] ??= new Y.Doc()), [docKey]);
  const awareness = useMemo(() => {
    if (!awarenessKey) return null;
    return (awarenesses[`${docKey}:${awarenessKey}`] ??= new Awareness(doc));
  }, [doc, docKey, awarenessKey]);
  window.__aw ??= { api: null, apis: [], awareness: awarenesses, ready: false };
  return (
    <div style={{ width: 700 }}>
      <DatascratchEditor
        doc={doc}
        awareness={awareness}
        user={{ id: "u", name: "Tester", color: "#2E5BDB" }}
        showPalette={false}
        onReady={(api) => {
          setTimeout(() => {
            if (api.editor.isDestroyed) return;
            if (doc.getXmlFragment("content").length === 0) api.editor.commands.setContent("<h1 data-type=title>T</h1><p>hello presence world</p>");
            window.__aw!.api = api;
            window.__aw!.apis.push(api);
            window.__aw!.ready = true;
          }, 0);
        }}
      />
    </div>
  );
}
