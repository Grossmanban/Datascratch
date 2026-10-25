import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SuggestionMenu, type SuggestionGroup } from "@datascratch/ui";
import type { BlockItem } from "./blockItems";
import type { NoteSummary } from "../host";
import type { Store, SuggestionState } from "./suggestions";

/** Glass floating panel positioned under (or above) an anchor rect, kept inside the viewport. */
export function Floating({ rect, children, placement = "below", className = "", onDismiss }: { rect: DOMRect | null; children: ReactNode; placement?: "below" | "above"; className?: string; onDismiss?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !rect) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = 8;
    let top = placement === "below" ? rect.bottom + gap : rect.top - h - gap;
    if (placement === "below" && top + h > window.innerHeight - 8) top = rect.top - h - gap;
    if (placement === "above" && top < 8) top = rect.bottom + gap;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - w - 8);
    setPos({ left, top: Math.max(8, top) });
  }, [rect, placement, children]);
  useEffect(() => {
    if (!onDismiss) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);
  if (!rect) return null;
  return createPortal(
    <div ref={ref} className={`ds-floating ds-glass ${className}`} style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }} onMouseDown={(e) => e.preventDefault()}>
      {children}
    </div>,
    document.body,
  );
}

function useStore<S>(store: Store<S>): S {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function SlashMenu({ store }: { store: Store<SuggestionState<BlockItem>> }) {
  const s = useStore(store);
  if (!s.open || !s.rect) return null;
  const groups: SuggestionGroup[] = [];
  for (const item of s.items) {
    let g = groups.find((x) => x.heading === item.group);
    if (!g) groups.push((g = { heading: item.group, items: [] }));
    g.items.push({ id: item.id, label: item.title, description: item.hint, icon: <span className="ds-menu-glyph">{item.icon}</span>, ...(item.shortcut ? { hint: item.shortcut } : {}) });
  }
  // Order of `s.items` already follows the groups, so the flat index matches the store's selection.
  const flat = groups.flatMap((g) => g.items.map((i) => i.id));
  const selected = flat.indexOf(s.items[s.selected]?.id ?? "");
  return (
    <SuggestionMenu
      groups={groups}
      selectedIndex={Math.max(0, selected)}
      anchorRect={s.rect}
      empty="Ничего не найдено"
      idPrefix="ds-slash"
      onPick={(it) => {
        const item = s.items.find((x) => x.id === it.id);
        if (item) s.pick(item);
      }}
    />
  );
}

export type LinkItem = NoteSummary & { create?: boolean };

export function NoteLinkMenu({ store }: { store: Store<SuggestionState<LinkItem>> }) {
  const s = useStore(store);
  if (!s.open || !s.rect) return null;
  const key = (i: LinkItem) => (i.create ? "__create" : i.noteId);
  return (
    <SuggestionMenu
      groups={[
        {
          items: s.items.map((i) => ({
            id: key(i),
            label: i.create ? `Создать «${i.title}»` : i.title || "Без названия",
            icon: <span className="ds-menu-glyph">{i.create ? "+" : (i.icon ?? "📄")}</span>,
          })),
        },
      ]}
      selectedIndex={s.selected}
      anchorRect={s.rect}
      empty={s.query ? "Нет заметок" : "Начните вводить название"}
      idPrefix="ds-links"
      onPick={(it) => {
        const item = s.items.find((x) => key(x) === it.id);
        if (item) s.pick(item);
      }}
    />
  );
}
