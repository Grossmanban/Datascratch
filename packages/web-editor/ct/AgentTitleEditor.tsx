import { useMemo } from "react";
import * as Y from "yjs";
import { applyEdits, initNoteContent } from "../../agents/src/doc/edits";
import { DatascratchEditor, type EditorApi } from "../src";

declare global {
  interface Window {
    __at?: { api: EditorApi; doc: Y.Doc; updates: number; blocks: () => string[]; before: string[]; ready: boolean };
  }
}

const agentEdit = { agentId: "agent-claude", at: "2026-10-26T20:00:00.000Z" };

export type AgentTitleVariant = "agent" | "paragraphBefore" | "twoTitles" | "emptyTitle";

/** Top-level blocks as `name#blockId:text`. */
function blocksOf(doc: Y.Doc): string[] {
  return (doc.getXmlFragment("content").toArray() as Y.XmlElement[]).map((e) => {
    const text = e
      .toArray()
      .map((c) => (c instanceof Y.XmlText ? c.toDelta().map((d: { insert: unknown }) => (typeof d.insert === "string" ? d.insert : "")).join("") : ""))
      .join("");
    return `${e.nodeName}#${e.getAttribute("blockId")}:${text}`;
  });
}

function block(name: string, text: string): Y.XmlElement {
  const e = new Y.XmlElement(name);
  e.setAttribute("blockId", crypto.randomUUID());
  if (text) {
    const t = new Y.XmlText();
    t.insert(0, text);
    e.insert(0, [t]);
  }
  return e;
}

/**
 * A note made by packages/agents exactly as over MCP — create_note (title + Markdown), then
 * edit_note replace_text on the title block — optionally with an unusual start written by another
 * client. Counts every Y update made after the note is loaded.
 */
export function AgentTitleEditor({ variant = "agent" }: { variant?: AgentTitleVariant }) {
  const { doc, before, counter } = useMemo(() => {
    const d = new Y.Doc();
    initNoteContent(d, variant === "emptyTitle" ? "" : "План на неделю", "Первый абзац.\n\n- пункт", { agentEdit });
    const frag = d.getXmlFragment("content");
    if (variant !== "emptyTitle") {
      const title = (frag.get(0) as Y.XmlElement).getAttribute("blockId") as string;
      applyEdits(d, [{ op: "replace_text", blockId: title, find: "неделю", replace: "месяц" }], { agentEdit });
    }
    if (variant === "paragraphBefore") frag.insert(0, [block("paragraph", "Абзац другого клиента")]);
    if (variant === "twoTitles") frag.insert(0, [block("title", "")]);
    const c = { n: 0 };
    const b = blocksOf(d);
    d.on("update", () => c.n++);
    return { doc: d, before: b, counter: c };
  }, [variant]);
  return (
    <div style={{ width: 760, margin: "0 auto" }}>
      <DatascratchEditor
        doc={doc}
        showPalette={false}
        bottomPadding={40}
        penSettings={{ tool: null }}
        host={{ defaultTitle: () => "Заметка 26 октября 2026" }}
        onReady={(api) => {
          window.__at = {
            api,
            doc,
            get updates() {
              return counter.n;
            },
            blocks: () => blocksOf(doc),
            before,
            ready: true,
          };
        }}
      />
    </div>
  );
}
