import { useEffect, useRef, type ReactNode } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { NoteEditor, type Editor } from "@/editor";
import type { NoteBackdrop, NoteStyle } from "@/lib/shared";
import { backdropCss } from "@/lib/tokens";
import { cn } from "@/ui";

/** Document column with style (font/width/paper), backdrop and the editor. Shared by owner and guest views. */
export function DocView({
  doc,
  style,
  backdrop,
  editable,
  header,
  footer,
  placeholder,
  titlePlaceholder,
  awareness,
  user,
  onOpenNote,
  onOpenTag,
  noteTitle,
  resolveNoteLink,
  autoFocus,
  onEditor,
}: {
  doc: Y.Doc;
  style: NoteStyle;
  backdrop: NoteBackdrop;
  editable: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  placeholder: string;
  titlePlaceholder: string;
  awareness?: Awareness | null;
  user?: { name: string; color: string };
  onOpenNote?: (id: string) => void;
  onOpenTag?: (tag: string) => void;
  noteTitle?: (id: string) => string | null;
  resolveNoteLink?: (label: string) => Promise<{ noteId: string; label: string } | null>;
  autoFocus?: boolean;
  onEditor?: (e: Editor) => void;
}) {
  const width = style.width === "wide" ? "max-w-[960px]" : style.width === "full" ? "max-w-none" : "max-w-[720px]";
  const paper = style.paper !== "plain" ? `paper-${style.paper}` : "";
  const hasBackdrop = !!backdrop;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [doc]);
  return (
    <div
      ref={ref}
      className="relative min-h-full"
      style={hasBackdrop ? { background: backdrop!.kind === "gradient" ? backdropCss(backdrop!.value) : `var(--ds-${backdrop!.value.replace(/\./g, "-")})` } : undefined}
    >
      <div className={cn("mx-auto w-full px-4 pb-10 sm:px-8", hasBackdrop ? "pt-10 sm:pt-16" : "pt-2")}>
        <article
          className={cn(
            "ds-doc mx-auto w-full",
            width,
            hasBackdrop ? "rounded-2xl bg-surface px-6 py-10 shadow-[0_2px_8px_rgb(40_30_10/0.06),0_30px_80px_rgb(40_30_10/0.14)] sm:px-14 sm:py-14" : "px-1 sm:px-6",
            paper,
          )}
          data-font={style.font}
          style={style.textColor ? { color: `var(--ds-${style.textColor.replace(/\./g, "-")})` } : undefined}
        >
          {header}
          <NoteEditor
            doc={doc}
            editable={editable}
            placeholder={placeholder}
            titlePlaceholder={titlePlaceholder}
            awareness={awareness}
            user={user}
            onOpenNote={onOpenNote}
            onOpenTag={onOpenTag}
            noteTitle={noteTitle}
            resolveNoteLink={resolveNoteLink}
            autoFocus={autoFocus}
            onReady={onEditor}
          />
          {footer}
        </article>
      </div>
    </div>
  );
}
