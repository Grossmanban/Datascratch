import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Hash, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace, visibleNotes, notesInSpace } from "@/domain/workspace";
import { tintFg } from "@/lib/tokens";
import { cn, Dialog } from "@/ui";

// Long sidebar sections stay calm (spec/12 §12.6): a section collapses from its header (kept on
// this device per space), shows up to 7 rows and folds the rest into «Ещё N».

export const SECTION_LIMIT = 7;

function readFlag(key: string): boolean | null {
  try {
    const s = localStorage.getItem(key);
    return s === null ? null : s === "1";
  } catch {
    return null;
  }
}

function writeFlag(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? "1" : "0");
  } catch {
    // private mode: kept for this tab only
  }
}

/** Collapsed state of a sidebar section in the current space (D-48), stored on this device. */
export function useSpaceCollapsed(id: string, def = false) {
  const spaceId = useWorkspace((s) => s.activeSpaceId) ?? "none";
  const key = `ds.collapsed.${spaceId}.${id}`;
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const value = local[key] ?? readFlag(key) ?? def;
  const toggle = () => {
    writeFlag(key, !value);
    setLocal((m) => ({ ...m, [key]: !value }));
  };
  return [value, toggle] as const;
}

export type Row = { key: string; node: ReactNode; keep?: boolean };

/**
 * Up to `limit` rows, then a quiet «Ещё N» row that unfolds the rest in place and ends with
 * «Свернуть». Rows marked `keep` (e.g. the open notebook) stay visible while folded.
 */
export function MoreList({ rows, limit = SECTION_LIMIT, testId }: { rows: Row[]; limit?: number; testId?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (rows.length <= limit) return <>{rows.map((r) => <Frag key={r.key}>{r.node}</Frag>)}</>;
  const head = rows.slice(0, limit);
  const rest = rows.slice(limit);
  const hidden = rest.filter((r) => !r.keep).length;
  return (
    <>
      {head.map((r) => (
        <Frag key={r.key}>{r.node}</Frag>
      ))}
      {/* In order: kept rows stay put, the others unfold around them. */}
      <AnimatePresence initial={false}>
        {rest.map((r) =>
          r.keep ? (
            <Frag key={r.key}>{r.node}</Frag>
          ) : open ? (
            <motion.div
              key={r.key}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              {r.node}
            </motion.div>
          ) : null,
        )}
      </AnimatePresence>
      {(open || hidden > 0) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-7 items-center gap-2 rounded-md px-2 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          data-testid={testId ? `${testId}-more` : undefined}
        >
          <ChevronRight className={cn("size-3 transition-transform duration-200", open && "-rotate-90", !open && "rotate-90")} aria-hidden />
          {open ? t("common.collapse") : t("nav.moreCount", { count: hidden })}
        </button>
      )}
    </>
  );
}

function Frag({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ---------- tags ----------

type TagNode = { name: string; path: string; count: number; recent: number; children: TagNode[] };

/** Tags of a space as a «/» tree, with counts (a parent counts its subtags) and last use. */
export function useTagTree(): { roots: TagNode[]; flat: { path: string; count: number }[] } {
  const notes = useWorkspace((s) => s.notes);
  const notebooks = useWorkspace((s) => s.account.notebooks);
  const spaceId = useWorkspace((s) => s.activeSpaceId);
  return useMemo(() => {
    const st = { ...useWorkspace.getState(), notes, account: { ...useWorkspace.getState().account, notebooks } };
    const nodes = new Map<string, TagNode>();
    const roots: TagNode[] = [];
    const node = (path: string): TagNode => {
      let n = nodes.get(path);
      if (n) return n;
      const i = path.lastIndexOf("/");
      n = { name: i < 0 ? path : path.slice(i + 1), path, count: 0, recent: 0, children: [] };
      nodes.set(path, n);
      if (i < 0) roots.push(n);
      else node(path.slice(0, i)).children.push(n);
      return n;
    };
    for (const note of visibleNotes(notesInSpace(st, spaceId))) {
      const when = Date.parse(note.updatedAt) || 0;
      // Each note counts once per tag path, even with #a/b and #a/c.
      const paths = new Set<string>();
      for (const tag of note.tags) {
        const parts = tag.split("/").filter(Boolean);
        for (let i = 1; i <= parts.length; i++) paths.add(parts.slice(0, i).join("/"));
      }
      for (const p of paths) {
        const n = node(p);
        n.count++;
        n.recent = Math.max(n.recent, when);
      }
    }
    const byName = (a: TagNode, b: TagNode) => a.name.localeCompare(b.name);
    for (const n of nodes.values()) n.children.sort(byName);
    // The first rows are the most recently used tags (spec/12 §12.6).
    roots.sort((a, b) => b.recent - a.recent || byName(a, b));
    const flat = [...nodes.values()].map((n) => ({ path: n.path, count: n.count })).sort((a, b) => a.path.localeCompare(b.path));
    return { roots, flat };
  }, [notes, notebooks, spaceId]);
}

export function TagRow({ node, depth = 0 }: { node: TagNode; depth?: number }) {
  const { t } = useTranslation();
  const [collapsed, toggle] = useSpaceCollapsed(`tag.${node.path}`, true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const color = useWorkspace((s) => s.tagProps[node.path]?.color);
  const active = decodeURIComponent(pathname) === `/tag/${node.path}`;
  return (
    <>
      <div
        style={{ paddingLeft: depth * 14 }}
        className={cn(
          "group flex h-8 items-center gap-1 rounded-md pr-2 transition-colors",
          active ? "bg-ink/[0.07] text-ink" : "text-ink-2 hover:bg-ink/[0.04] hover:text-ink",
        )}
        data-testid="tag-row"
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={`${collapsed ? t("common.expand") : t("common.collapse")} «#${node.path}»`}
          aria-expanded={!collapsed}
          className={cn("flex size-5 shrink-0 items-center justify-center rounded text-ink-3 hover:text-ink", !node.children.length && "invisible")}
          tabIndex={node.children.length ? 0 : -1}
        >
          <ChevronRight className={cn("size-3 transition-transform", !collapsed && "rotate-90")} />
        </button>
        <Link to="/tag/$" params={{ _splat: node.path }} className="flex min-w-0 flex-1 items-center gap-1.5 pl-0.5">
          <Hash className="size-3.5 shrink-0" style={color ? { color: tintFg(color) } : undefined} />
          <span className="truncate">{node.name}</span>
        </Link>
        <span className="text-[11.5px] tabular-nums text-ink-2">{node.count}</span>
      </div>
      {!collapsed && node.children.map((c) => <TagRow key={c.path} node={c} depth={depth + 1} />)}
    </>
  );
}

/** «Все теги»: every tag of the space with search, colour dots and counts. */
export function AllTagsDialog({ open, onOpenChange, tags }: { open: boolean; onOpenChange: (o: boolean) => void; tags: { path: string; count: number }[] }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const tagProps = useWorkspace((s) => s.tagProps);
  const list = useMemo(() => {
    const lower = q.trim().toLowerCase().replace(/^#/, "");
    return lower ? tags.filter((x) => x.path.toLowerCase().includes(lower)) : tags;
  }, [q, tags]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("nav.allTags")}>
      <div className="flex flex-col gap-3" data-testid="all-tags">
        <label className="flex h-9 items-center gap-2 rounded-lg bg-ink/[0.05] px-3 text-ink-2 focus-within:ring-2 focus-within:ring-accent/40">
          <Search className="size-4 shrink-0" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("nav.searchTags")}
            aria-label={t("nav.searchTags")}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <div className="scrollbar-thin -mx-2 max-h-[min(55vh,420px)] overflow-y-auto">
          {list.length ? (
            list.map((x) => {
              const color = tagProps[x.path]?.color;
              return (
                <Link
                  key={x.path}
                  to="/tag/$"
                  params={{ _splat: x.path }}
                  onClick={() => onOpenChange(false)}
                  className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[14px] text-ink transition-colors hover:bg-ink/[0.05]"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: color ? tintFg(color) : "var(--ds-ink-3, currentColor)", opacity: color ? 1 : 0.35 }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">#{x.path}</span>
                  <span className="text-[12.5px] tabular-nums text-ink-2">{x.count}</span>
                </Link>
              );
            })
          ) : (
            <p className="px-2 py-6 text-center text-[13.5px] text-ink-2">{t("palette.noResults")}</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
