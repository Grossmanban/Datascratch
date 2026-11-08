import { useNavigate } from "@tanstack/react-router";
import { BookOpen, FileText, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { isSharedNew, markSharedOpened, sharedKey } from "@/data/sharedOpened";
import { useShared } from "@/data/sharedWithMe";
import { openTab } from "@/domain/actions";
import { findNotebook, noteTitle, useWorkspace } from "@/domain/workspace";
import { PageTitle } from "@/features/shell/PageHeader";
import { addDays, formatDay, localDate } from "@/lib/dates";
import { iconGlyph } from "@/lib/glyph";
import type { SharedRef } from "@/lib/shared";
import { cn, EmptyState } from "@/ui";

/** «сегодня», «вчера», «3 нояб.» — when it was shared (D-63). */
export function sharedDate(iso: string, t: (k: string) => string): string {
  const day = localDate(new Date(iso));
  const today = localDate();
  if (day === today) return t("common.today").toLowerCase();
  if (day === addDays(today, -1)) return t("common.yesterday").toLowerCase();
  return formatDay(day, { day: "numeric", month: "short" });
}

/** The new ones among what is shared with this account: never opened (D-63). */
export function useSharedNewCount(): number {
  return useWorkspace((s) => s.account.shared.filter(isSharedNew).length);
}

/**
 * «Поделились со мной» (D-63, spec/08): what others shared with this account one by one — documents
 * and notebooks, outside every space — with who shared it, the role and the date; new ones in bold.
 */
export function SharedWithMePage() {
  const { t } = useTranslation();
  const refs = useWorkspace((s) => s.account.shared);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const titles = useWorkspace(
    useShallow((s) => refs.map((r) => (r.kind === "notebook" ? findNotebook(s, r.id)?.name || "" : noteTitle(s.notes[r.id], ""))).join("\u0000")),
  ).split("\u0000");
  const rows = useMemo(
    () =>
      refs
        .map((r, i) => ({ ref: r, title: titles[i] ?? "" }))
        .filter((x) => !q || x.title.toLowerCase().includes(q))
        .sort((a, b) => Date.parse(b.ref.addedAt) - Date.parse(a.ref.addedAt)),
    [refs, titles, q],
  );

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col" data-testid="shared-with-me">
      <PageTitle compact icon={<Users className="text-ink-2" />} title={t("sharedWithMe.title")} subtitle={refs.length ? String(refs.length) : undefined} />
      {refs.length > 0 && (
        <div className="px-5 pb-3 sm:px-10">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[14px] focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-accent)_15%,transparent)]">
            <Search className="size-4 shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder={t("sharedWithMe.search")}
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
              data-testid="shared-search"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={t("common.clear")} className="text-ink-3 hover:text-ink">
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>
      )}
      {!refs.length ? (
        <EmptyState icon={<Users className="size-7" />} title={t("sharedWithMe.emptyTitle")} description={t("sharedWithMe.emptyText")} />
      ) : !rows.length ? (
        <EmptyState icon={<Search className="size-7" />} title={t("sharedWithMe.noResults")} />
      ) : (
        <ul className="flex flex-col px-3 pb-10 sm:px-8">
          {rows.map(({ ref }) => (
            <SharedListRow key={`${ref.kind}:${ref.id}`} shared={ref} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SharedListRow({ shared }: { shared: SharedRef }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const key = sharedKey(shared.kind, shared.id);
  const item = useShared((s) => s.items[key]);
  const isNew = isSharedNew(shared);
  const nb = useWorkspace(useShallow((s) => (shared.kind === "notebook" ? findNotebook(s, shared.id) : undefined)));
  const note = useWorkspace((s) => (shared.kind === "note" ? s.notes[shared.id] : undefined));
  const title = shared.kind === "notebook" ? nb?.name || t("app.untitled") : noteTitle(note, t("app.untitled"));
  const glyph = shared.kind === "notebook" ? iconGlyph(nb?.icon) : iconGlyph(note?.icon);
  const ready = item?.keyed && (shared.kind === "notebook" ? !!nb : !!note);
  const who = item?.ownerEmail ?? "";
  const role = item ? t(`sharedWithMe.role.${item.role}`) : "";
  const subtitle = [who, role, sharedDate(shared.addedAt, t)].filter(Boolean).join(" · ");

  function open() {
    if (!ready) return;
    markSharedOpened(shared.kind, shared.id);
    if (shared.kind === "notebook") void navigate({ to: "/notebook/$notebookId", params: { notebookId: shared.id } });
    else {
      openTab(shared.id);
      void navigate({ to: "/doc/$noteId", params: { noteId: shared.id } });
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={open}
        disabled={!ready}
        className={cn(
          "group relative flex h-16 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors hover:bg-ink/[0.04] disabled:cursor-default disabled:opacity-60",
        )}
        data-testid="shared-item"
        data-shared-id={shared.id}
        data-new={isNew || undefined}
      >
        <span className={cn("absolute left-0.5 size-1.5 rounded-full bg-accent transition-opacity", isNew ? "opacity-100" : "opacity-0")} aria-hidden />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink/[0.05] text-[17px] text-ink-2">
          {glyph || (shared.kind === "notebook" ? <BookOpen className="size-4" /> : <FileText className="size-4" />)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("truncate text-[15px] text-ink", isNew ? "font-semibold" : "font-medium")}>{ready ? title : t("shared.waiting")}</span>
          <span className="truncate text-[12.5px] text-ink-3">
            <span className="sr-only">{shared.kind === "notebook" ? t("sharedWithMe.notebook") : t("sharedWithMe.document")} · </span>
            {subtitle}
          </span>
        </span>
      </button>
    </li>
  );
}
