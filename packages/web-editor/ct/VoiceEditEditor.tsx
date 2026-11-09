import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi } from "../src";

declare global {
  interface Window {
    __voice?: { api: EditorApi; picked: { from: number; to: number; text: string }[]; ready: boolean };
  }
}

/** An editor with the app's «Оформить» on a selection (D-65); the test fills the text. */
export function VoiceEditEditor() {
  const doc = useMemo(() => new Y.Doc(), []);
  return (
    <div style={{ width: 760 }}>
      <DatascratchEditor
        doc={doc}
        user={{ id: "u", name: "Tester", color: "#2E5BDB" }}
        showPalette={false}
        selectionActions={[{ id: "format", label: "Оформить", icon: <span>✦</span>, onSelect: (s) => window.__voice!.picked.push(s) }]}
        onReady={(api) => {
          window.__voice = { api, picked: [], ready: false };
          setTimeout(() => (window.__voice!.ready = true), 0);
        }}
      />
    </div>
  );
}
