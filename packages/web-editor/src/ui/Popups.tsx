import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
  }, [s.selected]);
  if (!s.open || !s.rect) return null;
  let lastGroup = "";
  return (
    <Floating rect={s.rect} className="ds-menu ds-slash-menu">
      <div ref={listRef} className="ds-menu-list" role="listbox" aria-label="Блоки">
        {s.items.length === 0 && <div className="ds-menu-empty">Ничего не найдено</div>}
        {s.items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {header && <div className="ds-menu-group">{header}</div>}
              <button
                type="button"
                role="option"
                aria-selected={i === s.selected}
                className={`ds-menu-item${i === s.selected ? " is-active" : ""}`}
                onMouseEnter={() => store.set({ selected: i })}
                onClick={() => s.pick(item)}
              >
                <span className="ds-menu-icon">{item.icon}</span>
                <span className="ds-menu-text">
                  <span className="ds-menu-title">{item.title}</span>
                  <span className="ds-menu-hint">{item.hint}</span>
                </span>
                {item.shortcut && <kbd className="ds-menu-kbd">{item.shortcut}</kbd>}
              </button>
            </div>
          );
        })}
      </div>
    </Floating>
  );
}

export type LinkItem = NoteSummary & { create?: boolean };

export function NoteLinkMenu({ store }: { store: Store<SuggestionState<LinkItem>> }) {
  const s = useStore(store);
  if (!s.open || !s.rect) return null;
  return (
    <Floating rect={s.rect} className="ds-menu ds-link-menu">
      <div className="ds-menu-list" role="listbox" aria-label="Заметки">
        {s.items.length === 0 && <div className="ds-menu-empty">{s.query ? "Нет заметок" : "Начните вводить название"}</div>}
        {s.items.map((item, i) => (
          <button
            key={item.create ? "__create" : item.noteId}
            type="button"
            role="option"
            aria-selected={i === s.selected}
            className={`ds-menu-item${i === s.selected ? " is-active" : ""}`}
            onMouseEnter={() => store.set({ selected: i })}
            onClick={() => s.pick(item)}
          >
            <span className="ds-menu-icon">{item.create ? "+" : (item.icon ?? "📄")}</span>
            <span className="ds-menu-text">
              <span className="ds-menu-title">{item.create ? `Создать «${item.title}»` : item.title || "Без названия"}</span>
            </span>
          </button>
        ))}
      </div>
    </Floating>
  );
}
