import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Placeholder } from "@tiptap/extensions";
import { common, createLowlight } from "lowlight";
import type { HostRef } from "../host";
import { BlockId } from "./blockId";
import { Callout, Drawing, FileBlock, Image, MathBlock, Mermaid, NoteLink, PageCard, Tag } from "./blocks";
import { AgentEdit, DocumentNode, DsHorizontalRule, DsLink, Highlight, TextAlign, TextColor, Title } from "./core";
import { TaskItem, TaskList } from "./tasks";
import { UnsupportedFallback, UnsupportedMarkFallback } from "./unknown";

export const lowlight = createLowlight(common);

export interface SchemaOptions {
  host: HostRef;
  /** Placeholder texts; pass false to disable placeholders (e.g. in tests). */
  placeholders?: { title: string; body: string } | false;
}

/** Every node and mark of document-model.md §4.2, in TipTap form. */
export function createSchemaExtensions({ host, placeholders = { title: "Без названия", body: "Пишите или нажмите «/» для блоков" } }: SchemaOptions): AnyExtension[] {
  const exts: AnyExtension[] = [
    DocumentNode,
    Title,
    StarterKit.configure({
      document: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
      undoRedo: false,
      trailingNode: false,
      heading: { levels: [1, 2, 3] },
      dropcursor: { color: "var(--ds-accent, #2E5BDB)", width: 2 },
    }),
    TextAlign,
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    DsHorizontalRule,
    DsLink,
    Highlight,
    TextColor,
    AgentEdit,
    TaskList,
    TaskItem,
    Callout,
    MathBlock,
    Mermaid,
    Table.configure({ resizable: true, lastColumnResizable: false, allowTableNodeSelection: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ host }),
    FileBlock.configure({ host }),
    Drawing,
    PageCard.configure({ host }),
    NoteLink.configure({ host }),
    Tag.configure({ host }),
    UnsupportedFallback,
    UnsupportedMarkFallback,
    BlockId,
  ];
  if (placeholders) {
    exts.push(
      Placeholder.configure({
        includeChildren: false,
        placeholder: ({ node }) => (node.type.name === "title" ? placeholders.title : node.type.name === "paragraph" ? placeholders.body : ""),
      }),
    );
  }
  return exts;
}

/** Node names defined by the contract (and therefore known to this client). */
export const CONTRACT_NODES = [
  "doc",
  "text",
  "title",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "callout",
  "codeBlock",
  "mathBlock",
  "mermaid",
  "horizontalRule",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "image",
  "file",
  "drawing",
  "pageCard",
  "noteLink",
  "tag",
  "hardBreak",
] as const;

export const CONTRACT_MARKS = ["bold", "italic", "underline", "strike", "code", "link", "highlight", "textColor", "agentEdit"] as const;
