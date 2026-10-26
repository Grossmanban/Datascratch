import { useMemo, useState } from "react";
import * as Y from "yjs";
import { DatascratchEditor, type EditorApi, type NoteSummary } from "../src";
import { buildAgentNote, EXISTING_NOTE_ID } from "./agentFixture";

declare global {
  interface Window {
    __fx?: { api: EditorApi; doc: Y.Doc; opened: string[]; created: string[]; ready: boolean };
  }
}

/** The agent-created note in an editor whose host records opened and created notes. */
export function AgentNoteEditor() {
  const doc = useMemo(() => {
    const d = new Y.Doc();
    buildAgentNote(d);
    return d;
  }, []);
  const notes: NoteSummary[] = [{ noteId: EXISTING_NOTE_ID, title: "Идеи" }];
  return (
    <div style={{ width: 760 }}>
      <DatascratchEditor
        doc={doc}
        user={{ id: "u", name: "Tester", color: "#2E5BDB" }}
        showPalette={false}
        host={{
          resolveNote: async (id) => notes.find((n) => n.noteId === id) ?? null,
          searchNotes: async (q) => notes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase())),
          createNote: async (title) => {
            const n = { noteId: "0192f3c4-0000-7000-8000-0000000000ff", title };
            notes.push(n);
            window.__fx!.created.push(title);
            return n;
          },
          onOpenNote: (id) => window.__fx!.opened.push(id),
        }}
        onReady={(api) => {
          window.__fx = { api, doc, opened: [], created: [], ready: false };
          setTimeout(() => (window.__fx!.ready = true), 0);
        }}
      />
    </div>
  );
}

/** D-45: an agent-created note — no marks, a strip with «Понятно». */
export function AgentCreatedEditor() {
  const doc = useMemo(() => new Y.Doc(), []);
  const [meta, setMeta] = useState<{ agentId: string; agentName: string; at: string } | null>({ agentId: "a", agentName: "Claude", at: "2026-10-26T08:00:00.000Z" });
  return (
    <div style={{ width: 700 }}>
      <DatascratchEditor doc={doc} showPalette={false} createdByAgent={meta} onAcknowledgeAgentCreated={() => setMeta(null)} />
    </div>
  );
}
