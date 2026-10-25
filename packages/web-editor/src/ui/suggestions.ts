import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

/** State of an open suggestion popup, rendered by React (`SuggestionPopup`). */
export interface SuggestionState<T> {
  open: boolean;
  items: T[];
  selected: number;
  query: string;
  rect: DOMRect | null;
  pick: (item: T) => void;
}

/** Minimal external store (useSyncExternalStore-compatible). */
export class Store<S> {
  private listeners = new Set<() => void>();
  constructor(private state: S) {}
  get = (): S => this.state;
  set = (patch: Partial<S>): void => {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  };
  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export function createSuggestionStore<T>(): Store<SuggestionState<T>> {
  return new Store<SuggestionState<T>>({ open: false, items: [], selected: 0, query: "", rect: null, pick: () => {} });
}

export interface SuggestionMenuOptions<T> {
  name: string;
  char: string;
  store: Store<SuggestionState<T>>;
  items: (query: string, editor: Editor) => T[] | Promise<T[]>;
  command: (args: { editor: Editor; range: Range; item: T }) => void;
  allowSpaces?: boolean;
  startOfLine?: boolean;
  allow?: SuggestionOptions["allow"];
}

/** A TipTap Suggestion whose popup state goes into a store instead of the DOM. */
export function createSuggestionExtension<T>(opts: SuggestionMenuOptions<T>) {
  const key = new PluginKey(opts.name);
  return Extension.create({
    name: opts.name,
    addProseMirrorPlugins() {
      const store = opts.store;
      return [
        Suggestion<T, T>({
          editor: this.editor,
          pluginKey: key,
          char: opts.char,
          allowSpaces: opts.allowSpaces ?? false,
          startOfLine: opts.startOfLine ?? false,
          allow: opts.allow,
          items: ({ query, editor }) => opts.items(query, editor),
          command: ({ editor, range, props }) => opts.command({ editor, range, item: props }),
          render: () => {
            let commandFn: ((item: T) => void) | null = null;
            return {
              onStart: (props) => {
                commandFn = props.command;
                store.set({ open: true, items: props.items, selected: 0, query: props.query, rect: props.clientRect?.() ?? null, pick: (item) => commandFn?.(item) });
              },
              onUpdate: (props) => {
                commandFn = props.command;
                const prev = store.get();
                store.set({
                  items: props.items,
                  query: props.query,
                  selected: prev.query === props.query ? Math.min(prev.selected, Math.max(0, props.items.length - 1)) : 0,
                  rect: props.clientRect?.() ?? null,
                  pick: (item) => commandFn?.(item),
                });
              },
              onKeyDown: ({ event }) => {
                const s = store.get();
                if (!s.open) return false;
                if (event.key === "ArrowDown") {
                  store.set({ selected: s.items.length ? (s.selected + 1) % s.items.length : 0 });
                  return true;
                }
                if (event.key === "ArrowUp") {
                  store.set({ selected: s.items.length ? (s.selected - 1 + s.items.length) % s.items.length : 0 });
                  return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  const item = s.items[s.selected];
                  if (!item) return false;
                  s.pick(item);
                  return true;
                }
                if (event.key === "Escape") {
                  store.set({ open: false });
                  return true;
                }
                return false;
              },
              onExit: () => {
                commandFn = null;
                store.set({ open: false, items: [], rect: null });
              },
            };
          },
        }),
      ];
    },
  });
}
