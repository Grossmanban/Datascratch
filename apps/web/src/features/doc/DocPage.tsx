import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight, Eye, FileQuestion, ImagePlus, MoreHorizontal, Share2, Smile, Star, Undo2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/session";
import { colorFor } from "@/data/presence";
import { runtime } from "@/data/runtime";
import { sharedResourceOf, useShared } from "@/data/sharedWithMe";
import { AgentsBadge } from "@/features/share/SharedWithMe";
import { acknowledgeAgentCreated, agentCreatedOf, deleteNoteForever, openTab, restoreNote, setTitleOf, toggleStar, updateNote } from "@/domain/actions";
import { findNotebook, folderPath, isStarred, noteTitle, setActiveSpace, spaceOfNote, useWorkspace } from "@/domain/workspace";
import { closeDocTab, noteMenuItems } from "@/features/docs/menus";
import { isFreshNote } from "@/lib/freshNotes";
import { rememberNotebook } from "@/lib/lastNotebook";
import { TopBar } from "@/features/shell/PageHeader";
import { useNoteContentReady, useNoteDoc, useNoteMeta } from "@/hooks/useNoteDoc";
import { useUi } from "@/hooks/useUi";
import { FORMAT_VERSION } from "@/lib/shared";
import { EMOJI_CHOICES } from "@/lib/tokens";
import { Button, cn, DropdownMenu, EmptyState, IconButton, Popover, Spinner, toast, Tooltip } from "@/ui";
import { defaultNoteTitle, hasBody, isNoteEmpty, setNoteMeta } from "@/domain/note";
import i18n from "@/i18n";
import { Backlinks } from "./Backlinks";
import { CoverImage, coverError, removeCover, setCoverImage } from "./Cover";
import { readTitle, type EditorApi } from "@/editor";
import { ownerEditorHost, uploadNoteFile } from "@/editor/hosts";
import { DocView } from "./DocView";
import { PenPaletteToggle } from "./PenPaletteToggle";
import { PresenceStack } from "./PresenceStack";
import { StylePopover } from "./StylePopover";
import { usePresence } from "./usePresence";
import { iconGlyph, withIcon } from "@/lib/glyph";
import { features } from "@/lib/features";

export function DocPage() {
  const { t } = useTranslation();
  const { noteId } = useParams({ from: "/app/doc/$noteId" });
  const note = useWorkspace((s) => s.notes[noteId]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!note) return;
    // A link to a document of another space (older links, D-48) opens it in its own space.
    const space = spaceOfNote(useWorkspace.getState(), noteId);
    if (space && space !== useWorkspace.getState().activeSpaceId) setActiveSpace(space);
    if (!note.trashedAt) openTab(noteId);
    // «Новый документ» elsewhere goes to the notebook last opened or created in (spec/05).
    // Only an own notebook: a shared one is not where new notes of this account should go.
    if (useWorkspace.getState().account.notebooks.some((n) => n.id === note.notebookId)) rememberNotebook(space, note.notebookId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, !!note]);

  if (!note) {
    return (
      <div className="h-full">
        <TopBar />
        <EmptyState
          icon={<FileQuestion className="size-7" />}
          title={t("docs.notFound")}
          description={t("docs.notFoundText")}
          action={<Button onClick={() => void navigate({ to: "/all" })}>{t("nav.allDocs")}</Button>}
        />
      </div>
    );
  }
  return <DocScreen key={noteId} noteId={noteId} />;
}

function DocScreen({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const note = useWorkspace((s) => s.notes[noteId])!;
  const nb = useWorkspace(useShallow((s) => findNotebook(s, note.notebookId)));
  // Shared with this account (D-54): a viewer reads only; sharing further is the owner's.
  const shared = useShared(() => sharedResourceOf(noteId));
  const viewer = shared?.role === "viewer";
  const path = useWorkspace(useShallow((s) => folderPath(s, note.folderId)));
  const starred = useWorkspace((s) => isStarred(s, { kind: "note", id: noteId }));
  const email = useAuth((s) => s.email) ?? "";
  const doc = useNoteDoc(noteId);
  const meta = useNoteMeta(doc);
  const contentReady = useNoteContentReady(noteId, doc);
  const edits = useRef(0);
  const [editorApi, setEditorApi] = useState<EditorApi | null>(null);
  const paletteCollapsed = useUi((s) => s.penPaletteCollapsed);

  const user = useMemo(() => ({ name: email.split("@")[0] || "Me", color: colorFor(email), kind: "user" as const }), [email]);
  const { awareness, others } = usePresence(
    noteId,
    doc,
    user,
    (update) => runtime().sendAwareness(noteId, update),
  );

  // Count local edits; upload a version snapshot when leaving a document we changed a lot.
  useEffect(() => {
    if (!doc) return;
    const onUpdate = (_u: Uint8Array, origin: unknown) => {
      if (typeof origin === "object" && origin !== null) edits.current++;
    };
    doc.on("update", onUpdate);
    return () => {
      doc.off("update", onUpdate);
      if (edits.current >= 30) runtime().requestSnapshot(noteId);
    };
  }, [doc, noteId]);

  const readOnlyNewer = (meta?.formatVersion ?? 1) > FORMAT_VERSION;
  const trashed = !!note.trashedAt;
  const editable = !readOnlyNewer && !trashed && !viewer;

  // spec/04 «Название новой заметки»: the editor names an empty title (host.defaultTitle) on Enter,
  // when the caret leaves it and on blur; on close a note with text gets it too, and a note created
  // here that is still empty (nothing but, at most, its default title) is not kept.
  const titleFor = () => defaultNoteTitle(useWorkspace.getState().notes[noteId]?.createdAt ?? new Date(), i18n.language);
  useEffect(() => {
    if (!doc || !editable) return;
    return () => {
      const title = readTitle(doc).trim();
      if (!hasBody(doc)) {
        if (isFreshNote(noteId) && (!title || title === titleFor()) && isNoteEmpty(doc, title)) void deleteNoteForever(noteId);
        return;
      }
      // The editor is gone by now (fillEmptyTitleIfNeeded needs it): write the same name into the
      // document — only for a note created here in this session, never an existing one.
      if (!title && isFreshNote(noteId)) void setTitleOf(noteId, titleFor());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, editable, noteId]);

  const keyFor = () => runtime().store.keyFor(noteId);
  const openCoverDialog = () => useUi.setState({ coverFor: noteId });
  const dropCover = (file: File) => void setCoverImage(noteId, file).catch((e) => coverError(e, t));

  const host = useMemo(() => ownerEditorHost(noteId, navigate), [noteId, navigate]);
  const userId = useAuth((s) => s.userId) ?? "";
  const editorUser = useMemo(() => ({ id: userId, name: user.name, color: user.color, kind: "user" as const }), [userId, user]);

  return (
    <div className="scrollbar-thin h-full overflow-y-auto" data-testid="doc-page">
      <TopBar
        className={cn(meta?.backdrop && "bg-transparent backdrop-blur-none")}
        actions={
          <>
            <PresenceStack users={others} />
            {shared?.agentsMode && <AgentsBadge label />}
            {viewer && (
              <Tooltip content={t("shared.readOnlyHint")}>
                <span
                  className="flex h-7 items-center gap-1.5 rounded-full bg-ink/[0.06] px-2.5 text-[12.5px] font-medium text-ink-2"
                  data-testid="read-only-badge"
                >
                  <Eye className="size-3.5" />
                  {t("shared.readOnly")}
                </span>
              </Tooltip>
            )}
            <IconButton
              label={starred ? t("docs.unstar") : t("docs.star")}
              onClick={() => toggleStar({ kind: "note", id: noteId })}
              className={starred ? "text-[var(--ds-tint-yellow-fg)]" : undefined}
            >
              <Star className={cn("size-4", starred && "fill-current")} />
            </IconButton>
            {editable && editorApi && <InsertPicture api={editorApi} noteId={noteId} />}
            {doc && meta && <StylePopover doc={doc} style={meta.style} disabled={!editable} />}
            {!shared && (
              <IconButton label={t("docs.share")} onClick={() => useUi.setState({ shareFor: { kind: "note", id: noteId } })} data-testid="share-button">
                <Share2 className="size-4" />
              </IconButton>
            )}
            <DropdownMenu
              align="end"
              items={noteMenuItems(noteId, t, navigate, { inDoc: true })}
              trigger={
                <IconButton label={t("common.more")}>
                  <MoreHorizontal className="size-4" />
                </IconButton>
              }
            />
            <IconButton label={`${features.tabs ? t("docs.closeTab") : t("common.close")} (⌥W)`} onClick={() => closeDocTab(noteId, navigate)} data-testid="close-tab">
              <X className="size-4" />
            </IconButton>
          </>
        }
      >
        <nav className="flex min-w-0 items-center gap-1">
          {nb && (
            <Link to="/notebook/$notebookId" params={{ notebookId: nb.id }} className="hidden shrink-0 hover:text-ink sm:inline">
              {withIcon(nb.icon, nb.name)}
            </Link>
          )}
          {path.map((f) => (
            <span key={f.id} className="hidden items-center gap-1 sm:flex">
              <ChevronRight className="size-3 text-ink-3" />
              <Link to="/folder/$folderId" params={{ folderId: f.id }} className="truncate hover:text-ink">
                {f.name}
              </Link>
            </span>
          ))}
          <ChevronRight className="hidden size-3 text-ink-3 sm:block" />
          <span className="truncate font-medium text-ink">{noteTitle(note, t("app.untitled"))}</span>
        </nav>
      </TopBar>

      {(trashed || readOnlyNewer) && (
        <div className="mx-auto mt-2 flex max-w-[720px] items-center gap-3 rounded-lg bg-[var(--ds-tint-yellow-bg)] px-4 py-2.5 text-[13.5px] text-ink">
          <span className="flex-1">{trashed ? t("docs.trashed") : t("docs.readOnlyNewer")}</span>
          {trashed && (
            <Button size="sm" icon={<Undo2 className="size-3.5" />} onClick={() => restoreNote(noteId)}>
              {t("docs.restore")}
            </Button>
          )}
        </div>
      )}

      {/* Mount the editor once presence exists: changing `awareness` later recreates the editor. */}
      {!doc || !meta || !awareness || !contentReady ? (
        <div className="flex h-64 items-center justify-center text-ink-2">
          <Spinner className="size-5" />
        </div>
      ) : (
        <DocView
          doc={doc}
          backdrop={meta.backdrop}
          editable={editable}
          awareness={awareness}
          user={editorUser}
          host={host}
          showPalette={!paletteCollapsed}
          createdByAgent={agentCreatedOf(note)}
          onAcknowledgeAgentCreated={editable ? () => acknowledgeAgentCreated(noteId) : undefined}
          onEditor={(api) => {
            setEditorApi(api);
            if (editable && isFreshNote(noteId)) api.focusTitle();
            else if (editable && !note.title) api.editor.commands.focus("start");
          }}
          cover={
            meta.cover ? (
              <CoverImage
                cover={meta.cover}
                keyFor={keyFor}
                editable={editable}
                onChange={openCoverDialog}
                onDropImage={dropCover}
                onReposition={(offsetY) => setNoteMeta(doc, { cover: { ...meta.cover!, offsetY } })}
                onRemove={() => void removeCover(noteId)}
              />
            ) : null
          }
          header={
            <div className="group/hdr flex items-end gap-1">
              <IconPicker icon={note.icon} disabled={!editable} onPick={(icon) => updateNote(noteId, { icon })} />
            </div>
          }
          footer={<Backlinks noteId={noteId} />}
        />
      )}
      {editable && editorApi && <PenPaletteToggle pen={editorApi.pen} />}
    </div>
  );
}

function IconPicker({ icon, onPick, disabled }: { icon: string | null; onPick: (icon: string | null) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  if (disabled && !icon) return <div className="h-6" />;
  return (
    <div className={cn("group/icon", icon ? "mb-3 mt-6" : "mb-1 mt-4 h-7")}>
      <Popover
        trigger={
          icon ? (
            <button className="text-[54px] leading-none transition hover:scale-105" aria-label={t("style.icon")} disabled={disabled}>
              {iconGlyph(icon) || "·"}
            </button>
          ) : (
            <button className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-2 opacity-0 transition hover:bg-ink/5 hover:text-ink group-hover/hdr:opacity-100 focus:opacity-100">
              <Smile className="size-4" /> {t("style.addIcon")}
            </button>
          )
        }
      >
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} onClick={() => onPick(e)} className="flex size-8 items-center justify-center rounded-md text-[18px] hover:bg-ink/5">
              {e}
            </button>
          ))}
        </div>
        {icon && (
          <button className="mt-2 w-full rounded-md py-1.5 text-[12.5px] text-ink-2 hover:bg-ink/5" onClick={() => onPick(null)}>
            {t("common.clear")}
          </button>
        )}
      </Popover>
    </div>
  );
}

/**
 * «Вставить картинку» in the document's top bar: the same as «/» → «Картинка», reachable with
 * one tap (narrow screens, iPad Safari). Several pictures at once; while they are being encrypted
 * the button shows how far it got.
 */
function InsertPicture({ api, noteId }: { api: EditorApi; noteId: string }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  // The editor's own picker (web-editor 1e48522b) inserts a placeholder at once and fills it as
  // the file is encrypted; until that editor is in, the same thing happens here.
  const editorPick = (api as EditorApi & { pickImage?: () => void }).pickImage;
  const insert = async (files: File[]) => {
    const done: { attachmentId: string; alt: string }[] = [];
    for (const [i, file] of files.entries()) {
      const a = await uploadNoteFile(noteId, file, (part) => setProgress((i + part) / files.length));
      done.push({ attachmentId: a.attachmentId, alt: file.name });
    }
    const ed = api.editor;
    // At the caret in the text; never into the title (or with no caret yet): then at the end.
    const { $from, to } = ed.state.selection;
    const inTitle = $from.depth >= 1 && $from.node(1).type.name === "title";
    const at = inTitle || !ed.isFocused ? ed.state.doc.content.size : to;
    ed.chain()
      .focus()
      .insertContentAt(at, done.map((d) => ({ type: "image", attrs: d })))
      .run();
  };
  return (
    <>
      <IconButton
        label={progress === null ? t("docs.insertPicture") : `${t("docs.insertPicture")} · ${Math.round(progress * 100)}%`}
        onClick={() => (editorPick ? editorPick.call(api) : input.current?.click())}
        disabled={progress !== null}
        data-testid="insert-picture"
      >
        {progress === null ? <ImagePlus className="size-4" /> : <span className="text-[11px] font-semibold tabular-nums">{Math.round(progress * 100)}%</span>}
      </IconButton>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (!files.length) return;
          setProgress(0);
          void insert(files)
            .catch((err) => toast(t("docs.insertPictureFailed", { reason: (err as Error).message }), { tone: "danger" }))
            .finally(() => setProgress(null));
        }}
      />
    </>
  );
}

