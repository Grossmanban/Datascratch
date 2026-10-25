import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type { Awareness } from "y-protocols/awareness";
import { Placeholder } from "@tiptap/extensions";
import { Document } from "@tiptap/extension-document";
import { Link } from "@tiptap/extension-link";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import {
  AgentEdit,
  BlockIds,
  Callout,
  DrawingBlock,
  FileBlock,
  Highlight,
  HorizontalRule,
  ImageBlock,
  MathBlock,
  Mention,
  Mermaid,
  NoteLink,
  PageCard,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Tag,
  TaskItem,
  TaskList,
  TextColor,
  Title,
  type InlineCallbacks,
} from "./schema";

export type NoteEditorProps = InlineCallbacks & {
  doc: Y.Doc;
  editable?: boolean;
  placeholder?: string;
  titlePlaceholder?: string;
  className?: string;
  autoFocus?: boolean;
  onReady?: (editor: Editor) => void;
  /** Shared presence (cursors of other devices and guests). */
  awareness?: Awareness | null;
  user?: { name: string; color: string };
};

const DsDocument = Document.extend({ content: "title block+" });

// Only `href` is stored for links (document-model.md §4.2), not TipTap's target/rel/class.
const DsLink = Link.extend({
  addAttributes() {
    return { href: { default: null } };
  },
}).configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } });

export function NoteEditor({
  doc,
  editable = true,
  placeholder,
  titlePlaceholder,
  className,
  autoFocus,
  onReady,
  awareness,
  user,
  ...callbacks
}: NoteEditorProps) {
  const cb = useRef(callbacks);
  cb.current = callbacks;
  const editor = useEditor(
    {
      editable,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      extensions: [
        DsDocument,
        Title,
        StarterKit.configure({
          document: false,
          undoRedo: false,
          horizontalRule: false,
          link: false,
          heading: { levels: [1, 2, 3] },
          trailingNode: { node: "paragraph", notAfter: ["paragraph"] },
        }),
        DsLink,
        BlockIds,
        TaskList,
        TaskItem,
        Callout,
        HorizontalRule,
        MathBlock,
        Mermaid,
        ImageBlock,
        FileBlock,
        DrawingBlock,
        PageCard,
        Table,
        TableRow,
        TableCell,
        TableHeader,
        NoteLink.configure({
          noteTitle: (id: string) => cb.current.noteTitle?.(id) ?? null,
          onOpenNote: (id: string) => cb.current.onOpenNote?.(id),
          resolveNoteLink: (label: string) => cb.current.resolveNoteLink?.(label) ?? Promise.resolve(null),
        }),
        Tag.configure({ onOpenTag: (t: string) => cb.current.onOpenTag?.(t) }),
        Mention,
        Highlight,
        TextColor,
        AgentEdit,
        Collaboration.configure({ document: doc, field: "content" }),
        ...(awareness ? [CollaborationCaret.configure({ provider: { awareness }, user: user ?? { name: "?", color: "#888" } })] : []),
        Placeholder.configure({
          includeChildren: false,
          placeholder: ({ node, pos }) => (node.type.name === "title" ? (titlePlaceholder ?? "") : pos <= 2 + 1 ? "" : (placeholder ?? "")),
          showOnlyCurrent: true,
        }),
      ],
      editorProps: { attributes: { class: "ds-prose", spellcheck: "true" } },
    },
    [doc, awareness],
  );

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    onReady?.(editor);
    if (autoFocus) {
      const title = editor.state.doc.firstChild;
      if (title && title.textContent === "") editor.commands.focus("start");
      else editor.commands.focus("end");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return <EditorContent editor={editor} className={className} />;
}
