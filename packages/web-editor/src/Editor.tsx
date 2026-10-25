import { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { buildExtensions } from "./editorCore";
import type { EditorHost, HostRef } from "./host";
import { readNoteMeta, readTitle, setNoteCover, SUPPORTED_FORMAT_VERSION, useNoteMeta } from "./meta";
import { PenLayer, type PenSettings } from "./pen/PenLayer";
import { guardSchema } from "./schema/unknown";
import { TASK_MENU_EVENT, type TaskMenuRequest } from "./schema/tasks";
import type { NoteStyle, StrokeAuthor } from "@datascratch/shared/contracts";
import { filterBlocks, type BlockItem } from "./ui/blockItems";
import { BubbleToolbar } from "./ui/BubbleToolbar";
import { DragHandle } from "./ui/DragHandle";
import { PenPalette } from "./ui/PenPalette";
import { NoteLinkMenu, SlashMenu, type LinkItem } from "./ui/Popups";
import { createSuggestionExtension, createSuggestionStore } from "./ui/suggestions";
import { TaskMenu } from "./ui/TaskMenu";

export interface EditorUser {
  id: string;
  name: string;
  /** Cursor colour for collaborators (any CSS colour). */
  color: string;
  kind?: StrokeAuthor["kind"];
}

export interface EditorApi {
  editor: Editor;
  pen: PenLayer;
  undoManager: Y.UndoManager;
}

export interface DatascratchEditorProps {
  /** The note document (document-model.md §4). */
  doc: Y.Doc;
  /** Presence of collaborators (cursors, selections). */
  awareness?: Awareness | null;
  user?: EditorUser;
  editable?: boolean;
  /** Callbacks into the app: attachments, note links, page cards, tags, task actions. */
  host?: EditorHost;
  /** Overrides `meta.style` of the document (e.g. while previewing a style picker). */
  styleOverride?: Partial<NoteStyle>;
  /** Show the cover from `meta.cover` above the title. */
  showCover?: boolean;
  /** Called when the user asks to pick a cover image (the app shows its picker and calls setNoteCover). */
  onRequestCover?: () => void;
  showPalette?: boolean;
  penSettings?: Partial<PenSettings>;
  /** Plain-text title, after each change (the app copies it into NoteMeta.title). */
  onTitleChange?: (title: string) => void;
  onReady?: (api: EditorApi) => void;
  className?: string;
  /** Extra vertical space under the last block (px), so the palette never covers text. */
  bottomPadding?: number;
}

const FONT_VARS: Record<NoteStyle["font"], string> = {
  serif: "var(--ds-font-display, 'Newsreader', 'New York', Georgia, serif)",
  sans: "var(--ds-font-text, 'Inter', system-ui, sans-serif)",
  mono: "var(--ds-font-mono, 'JetBrains Mono', ui-monospace, monospace)",
};
const WIDTHS: Record<NoteStyle["width"], string> = { normal: "720px", wide: "960px", full: "100%" };

function useHostRef(host: EditorHost | undefined): HostRef {
  const ref = useRef<EditorHost>(host ?? {});
  ref.current = host ?? {};
  return ref;
}

/**
 * The note editor: TipTap over `Y.XmlFragment "content"` + the pen layer over `Y.Map "strokes"`.
 * Everything is stored in the Y.Doc; the component never owns document state.
 */
export function DatascratchEditor(props: DatascratchEditorProps) {
  const { doc, awareness = null, user, editable = true, showPalette = true, showCover = true, className = "", bottomPadding = 160 } = props;
  const host = useHostRef(props.host);
  const meta = useNoteMeta(doc);
  const readOnly = !editable || meta.formatVersion > SUPPORTED_FORMAT_VERSION;
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<EditorApi | null>(null);
  const [schemaGen, setSchemaGen] = useState(0);
  const [taskMenu, setTaskMenu] = useState<TaskMenuRequest | null>(null);
  const slashStore = useMemo(() => createSuggestionStore<BlockItem>(), []);
  const linkStore = useMemo(() => createSuggestionStore<LinkItem>(), []);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    const mount = mountRef.current;
    const root = rootRef.current;
    if (!mount || !root) return;
    const slash = createSuggestionExtension<BlockItem>({
      name: "dsSlash",
      char: "/",
      store: slashStore,
      allow: ({ state, range }) => {
        const $from = state.doc.resolve(range.from);
        return $from.parent.type.name !== "title" && !$from.parent.type.spec.code;
      },
      items: (q) => filterBlocks(q, host.current),
      command: ({ editor, range, item }) => item.run(editor, range, host.current),
    });
    const links = createSuggestionExtension<LinkItem>({
      name: "dsNoteLinks",
      char: "[[",
      allowSpaces: true,
      store: linkStore,
      items: async (q) => {
        const found = (await host.current.searchNotes?.(q.replace(/\]+$/, ""))) ?? [];
        const items: LinkItem[] = found.slice(0, 8);
        if (q.trim() && host.current.createNote && !found.some((n) => n.title.toLowerCase() === q.trim().toLowerCase())) {
          items.push({ noteId: "", title: q.trim(), create: true });
        }
        return items;
      },
      command: ({ editor, range, item }) => {
        const insert = (noteId: string, label: string) =>
          editor
            .chain()
            .focus()
            .insertContentAt(range, [{ type: "noteLink", attrs: { noteId, label } }, { type: "text", text: " " }])
            .run();
        if (item.create) void host.current.createNote?.(item.title).then((n) => insert(n.noteId, n.title));
        else insert(item.noteId, item.title);
      },
    });
    const { extensions, undoManager } = buildExtensions({
      doc,
      host,
      awareness,
      user: user ? { name: user.name, color: user.color } : null,
      extensions: [slash, links],
    });
    let remountQueued = false;
    let lastTitle = readTitle(doc);
    const editor = new Editor({
      element: mount,
      extensions,
      editable: !readOnly,
      editorProps: {
        attributes: { class: "ds-prose", spellcheck: "true", "aria-label": "Текст заметки" },
        handlePaste: (_view, event) => uploadFiles(event.clipboardData?.files),
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false;
          const files = event.dataTransfer?.files;
          if (!files?.length || !host.current.uploadAttachment) return false;
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (at) view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(at.pos))));
          return uploadFiles(files);
        },
      },
      onBeforeCreate: ({ editor: e }) =>
        guardSchema(e.schema, () => {
          // A newer client wrote a node/mark we don't know: rebuild the schema so it round-trips exactly.
          if (remountQueued) return;
          remountQueued = true;
          setTimeout(() => setSchemaGen((g) => g + 1), 0);
        }),
      onUpdate: ({ editor: e }) => {
        const title = e.state.doc.firstChild?.type.name === "title" ? e.state.doc.firstChild.textContent : readTitle(doc);
        if (title !== lastTitle) {
          lastTitle = title;
          callbacks.current.onTitleChange?.(title);
        }
      },
    });
    function uploadFiles(files: FileList | null | undefined): boolean {
      const upload = host.current.uploadAttachment;
      if (!files?.length || !upload) return false;
      for (const file of Array.from(files)) {
        void upload(file).then((a) => {
          if (file.type.startsWith("image/")) editor.chain().focus().insertImage({ attachmentId: a.attachmentId, alt: file.name }).run();
          else editor.chain().focus().insertFile(a).run();
        });
      }
      return true;
    }
    const pen = new PenLayer({
      editor,
      doc,
      root,
      undoManager,
      author: { kind: user?.kind ?? "user", id: user?.id ?? "" },
      settings: callbacks.current.penSettings,
    });
    const onTaskMenu = (e: Event) => setTaskMenu((e as CustomEvent<TaskMenuRequest>).detail);
    editor.view.dom.addEventListener(TASK_MENU_EVENT, onTaskMenu);
    const next = { editor, pen, undoManager };
    setApi(next);
    callbacks.current.onReady?.(next);
    return () => {
      editor.view.dom.removeEventListener(TASK_MENU_EVENT, onTaskMenu);
      pen.destroy();
      editor.destroy();
      setApi(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, awareness, schemaGen]);

  useEffect(() => {
    api?.editor.setEditable(!readOnly);
  }, [api, readOnly]);

  useEffect(() => {
    if (api && props.penSettings) api.pen.setSettings(props.penSettings);
  }, [api, props.penSettings]);

  useEffect(() => {
    if (!awareness || !user) return;
    awareness.setLocalStateField("user", { name: user.name, color: user.color });
  }, [awareness, user?.name, user?.color]);

  const style = { ...meta.style, ...props.styleOverride };
  useEffect(() => {
    // Fonts and widths change line breaks: strokes must follow (D-05).
    api?.pen.invalidate();
  }, [api, style.font, style.width, style.paper]);

  const cssVars = {
    "--ds-doc-font": FONT_VARS[style.font],
    "--ds-doc-width": WIDTHS[style.width],
    "--ds-doc-bottom": `${bottomPadding}px`,
    ...(style.textColor ? { "--ds-doc-text": `var(--ds-${style.textColor.replace(/\./g, "-")})` } : {}),
  } as CSSProperties;

  return (
    <div className={`ds-editor ${className}`} data-paper={style.paper} data-font={style.font} data-width={style.width} data-readonly={readOnly || undefined} style={cssVars}>
      {showCover && meta.cover && <Cover doc={doc} host={host.current} editable={!readOnly} onRequestCover={props.onRequestCover} />}
      {meta.formatVersion > SUPPORTED_FORMAT_VERSION && (
        <div className="ds-readonly-banner" role="status">
          Заметка создана в более новой версии приложения и открыта только для чтения. Обновите приложение, чтобы редактировать.
        </div>
      )}
      <div ref={rootRef} className="ds-editor-root">
        <div ref={mountRef} className="ds-editor-mount" />
        {api && <DragHandle editor={api.editor} root={rootRef.current!} />}
      </div>
      {api && <BubbleToolbar editor={api.editor} />}
      <SlashMenu store={slashStore} />
      <NoteLinkMenu store={linkStore} />
      {api && taskMenu && <TaskMenu editor={api.editor} request={taskMenu} host={host.current} onClose={() => setTaskMenu(null)} />}
      {api && showPalette && !readOnly && (
        <div className="ds-palette-dock">
          <PenPalette pen={api.pen} undoManager={api.undoManager} />
        </div>
      )}
    </div>
  );
}

/** Document cover (spec/12 §12.3): image from `meta.cover` with a draggable vertical offset. */
function Cover({ doc, host, editable, onRequestCover }: { doc: Y.Doc; host: EditorHost; editable: boolean; onRequestCover?: () => void }) {
  const meta = useNoteMeta(doc);
  const cover = meta.cover;
  const [url, setUrl] = useState<string | null>(null);
  const [offset, setOffset] = useState(cover?.offsetY ?? 0.5);
  const [dragging, setDragging] = useState(false);
  useEffect(() => setOffset(cover?.offsetY ?? 0.5), [cover?.offsetY]);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (cover?.attachmentId) void host.resolveAttachment?.(cover.attachmentId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [cover?.attachmentId, host]);
  if (!cover) return null;
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editable || !dragging) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const start = offset;
    const h = el.getBoundingClientRect().height;
    const move = (ev: PointerEvent) => setOffset(Math.min(1, Math.max(0, start - (ev.clientY - startY) / (h * 2))));
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      const next = Math.min(1, Math.max(0, start - (ev.clientY - startY) / (h * 2)));
      setNoteCover(doc, { ...readNoteMeta(doc).cover!, offsetY: Math.round(next * 1000) / 1000 });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  return (
    <div className={`ds-cover${dragging ? " is-repositioning" : ""}`} style={{ backgroundImage: url ? `url("${url}")` : undefined, backgroundPosition: `center ${offset * 100}%` }} onPointerDown={onPointerDown}>
      {editable && (
        <div className="ds-cover-actions ds-glass">
          {onRequestCover && (
            <button type="button" onClick={onRequestCover}>
              Сменить
            </button>
          )}
          <button type="button" onClick={() => setDragging((d) => !d)}>
            {dragging ? "Готово" : "Сдвинуть"}
          </button>
          <button type="button" onClick={() => setNoteCover(doc, null)}>
            Убрать
          </button>
        </div>
      )}
    </div>
  );
}
