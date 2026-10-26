import { useMemo } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi } from "../src";

declare global {
  interface Window {
    __ct?: { api: EditorApi; doc: Y.Doc; ready: boolean };
  }
}

export interface TestEditorProps {
  width: number;
  html: string;
  /** D-51: EditorHost.taskDates ("full" by default, "inert" in the notes-only mode). */
  taskDates?: "full" | "inert";
  /** Pass a host task action handler (to show «Открыть документ» / «Переместить…»). */
  taskActions?: boolean;
  /** host.defaultTitle returns this (spec/04 «Название новой заметки»). */
  defaultTitle?: string;
}

/** Editor in a fixed-width box, seeded with HTML; exposes its API on window.__ct. */
export function TestEditor({ width, html, taskDates, taskActions, defaultTitle }: TestEditorProps) {
  const doc = useMemo(() => new Y.Doc(), []);
  return (
    <div style={{ width, margin: "0 auto" }} data-testid="box">
      <DatascratchEditor
        doc={doc}
        user={{ id: "tester", name: "Tester", color: "#2E5BDB" }}
        showPalette={false}
        bottomPadding={40}
        host={
          taskDates || taskActions || defaultTitle
            ? { taskDates, onTaskAction: taskActions ? () => {} : undefined, defaultTitle: defaultTitle ? () => defaultTitle : undefined }
            : undefined
        }
        penSettings={{ drawWithAnyPointer: true, tool: "pen", color: "ink.red", width: 3 }}
        onReady={(api) => {
          setTimeout(() => {
            if (api.editor.isDestroyed) return;
            if (doc.getXmlFragment("content").length === 0) api.editor.commands.setContent(html);
            api.undoManager.clear();
            window.__ct = { api, doc, ready: true };
          }, 0);
        }}
      />
    </div>
  );
}
