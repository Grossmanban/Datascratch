import * as Y from "yjs";

// The structure of the note an agent created through MCP ("Тест форматирования", 2026-10-26):
// every block type, two Mermaid diagrams with Cyrillic labels, an existing [[link]] (noteLink atom)
// and a missing one (literal text — the importer keeps unknown links as text), tasks with dates,
// all text marked as agent edits (D-10).

export const EXISTING_NOTE_ID = "0192f3c4-0000-7000-8000-000000000001";
const AGENT = { agentEdit: { agentId: "agent-claude", at: "2026-10-26T08:00:00.000Z" } };

function el(name: string, attrs: Record<string, unknown> = {}, children: (Y.XmlElement | Y.XmlText)[] = []): Y.XmlElement {
  const e = new Y.XmlElement(name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v as string);
  if (children.length) e.insert(0, children);
  return e;
}

/** Text run(s); strings get the agent mark, elements are inline atoms. */
function text(...parts: (string | Y.XmlElement)[]): (Y.XmlText | Y.XmlElement)[] {
  return parts.map((p) => {
    if (typeof p !== "string") return p;
    const t = new Y.XmlText();
    t.insert(0, p, AGENT);
    return t;
  });
}

const para = (...parts: (string | Y.XmlElement)[]) => el("paragraph", {}, text(...parts));

export const FLOWCHART = "flowchart TD\n  A[Начало] --> B{Решение}\n  B -->|Да| C[Готово]\n  B -->|Нет| D[Повтор]";
export const SEQUENCE = "sequenceDiagram\n  participant Агент\n  participant Заметка\n  Агент->>Заметка: Правка\n  Заметка-->>Агент: Готово";

export function buildAgentNote(doc: Y.Doc): void {
  const frag = doc.getXmlFragment("content");
  doc.transact(() => {
    frag.insert(0, [
      el("title", {}, text("Тест форматирования")),
      para("Обычный абзац, написанный агентом."),
      ...(["note", "success", "warning", "danger"] as const).map((tone) => el("callout", { tone }, [para(`Выноска ${tone}`)])),
      el("table", {}, [
        el("tableRow", {}, [el("tableHeader", {}, [para("Колонка")]), el("tableHeader", {}, [para("Значение")])]),
        el("tableRow", {}, [el("tableCell", {}, [para("Ключ")]), el("tableCell", {}, [para("42")])]),
      ]),
      el("codeBlock", { language: "ts" }, text("const answer = 42;")),
      el("mathBlock", { latex: "E = mc^2" }),
      el("mermaid", { source: FLOWCHART }),
      el("mermaid", { source: SEQUENCE }),
      para("Ссылки: ", el("noteLink", { noteId: EXISTING_NOTE_ID, label: "Идеи" }), " и [[Несуществующая]]."),
      el("taskList", {}, [
        el("taskItem", { state: "open", scheduled: "2026-10-26" }, [para("Задача на сегодня")]),
        el("taskItem", { state: "open", deadline: "2026-10-20" }, [para("Просроченная задача")]),
      ]),
    ]);
  });
}
