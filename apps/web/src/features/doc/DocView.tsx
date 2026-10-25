import { useMemo, type ReactNode } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { DatascratchEditor, type EditorApi, type EditorHost } from "@/editor";
import type { NoteBackdrop } from "@/lib/shared";
import { backdropCss } from "@/lib/tokens";
import { cn } from "@/ui";

/**
 * A note on screen: backdrop, cover, the editor (which applies the note style itself) and
 * slots above/below the text. Shared by the owner, guest and history views.
 */
export function DocView({
  doc,
  backdrop,
  editable,
  header,
  footer,
  cover,
  awareness,
  user,
  host,
  compact,
  showPalette = true,
  onEditor,
}: {
  doc: Y.Doc;
  backdrop: NoteBackdrop;
  editable: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  cover?: ReactNode;
  awareness?: Awareness | null;
  user?: { id: string; name: string; color: string; kind?: "user" | "guest" | "agent" };
  host?: EditorHost;
  compact?: boolean;
  showPalette?: boolean;
  onEditor?: (api: EditorApi) => void;
}) {
  const hasBackdrop = !!backdrop;
  const bg = useMemo(
    () =>
      backdrop
        ? backdrop.kind === "gradient"
          ? backdropCss(backdrop.value)
          : `var(--ds-${backdrop.value.replace(/\./g, "-")})`
        : undefined,
    [backdrop],
  );
  return (
    // The editor stretches to the bottom of the page so its pen palette (sticky to the editor's
    // bottom) rests at the bottom of the screen even for a short note.
    <div className="relative flex min-h-full flex-col" style={bg ? { background: bg } : undefined} data-testid="doc-view">
      {cover && !hasBackdrop && <div className="px-3 pt-1 sm:px-6">{cover}</div>}
      <div className={cn("mx-auto flex w-full flex-1 flex-col", hasBackdrop ? "max-w-[1100px] px-3 pb-10 pt-10 sm:px-8 sm:pt-16" : "pb-6")}>
        <article
          className={cn(
            "mx-auto flex w-full flex-1 flex-col",
            hasBackdrop && "overflow-hidden rounded-2xl bg-surface shadow-[0_2px_8px_rgb(40_30_10/0.06),0_30px_80px_rgb(40_30_10/0.14)]",
          )}
        >
          {cover && hasBackdrop && cover}
          {header && <div className="mx-auto w-full max-w-[var(--ds-doc-header-width,720px)] px-6 sm:px-8">{header}</div>}
          <DatascratchEditor
            doc={doc}
            editable={editable}
            awareness={awareness ?? null}
            user={user}
            host={host}
            showCover={false}
            showPalette={showPalette && editable}
            bottomPadding={compact ? 40 : 160}
            className={compact ? "" : "ds-editor-fill"}
            onReady={onEditor}
          />
          {footer && <div className="mx-auto w-full max-w-[720px] px-6 pb-16 sm:px-8">{footer}</div>}
        </article>
      </div>
    </div>
  );
}
