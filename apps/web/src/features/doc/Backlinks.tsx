import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { accountDb } from "@/data/db";
import { noteTitle, useWorkspace } from "@/domain/workspace";

export function Backlinks({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const notes = useWorkspace((s) => s.notes);
  const rows = useLiveQuery(() => accountDb().noteIndex.where("links").equals(noteId).toArray(), [noteId], []);
  const list = rows.filter((r) => r.noteId !== noteId && notes[r.noteId] && !notes[r.noteId]!.trashedAt);
  return (
    <section className="mt-16 border-t border-line pt-6" data-testid="backlinks">
      <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-2">{t("docs.backlinks")}</h2>
      {list.length === 0 ? (
        <p className="text-[13.5px] text-ink-2">{t("docs.noBacklinks")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((r) => (
            <Link
              key={r.noteId}
              to="/doc/$noteId"
              params={{ noteId: r.noteId }}
              className="group rounded-lg border border-line bg-surface/70 px-3.5 py-2.5 transition hover:border-ink/15 hover:bg-surface"
            >
              <div className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                <span className="truncate">{noteTitle(notes[r.noteId], t("app.untitled"))}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-ink-3 transition group-hover:text-accent" />
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">{r.text.replace(/\s+/g, " ").slice(0, 160)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
