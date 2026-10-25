import { Command } from "cmdk";
import { Search } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { useEffect, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { formatShortcut } from "./Kbd";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  placeholder?: string;
  /** Controlled search text (e.g. to search documents asynchronously). */
  search?: string;
  onSearchChange?: (search: string) => void;
  /** Set to false when results are filtered by the app (server/index search). */
  shouldFilter?: boolean;
  loading?: boolean;
  footer?: ReactNode;
}

/** ⌘K palette: actions and navigation without buttons on screen (spec 05). */
export function CommandPalette({
  open,
  onOpenChange,
  children,
  placeholder,
  search,
  onSearchChange,
  shouldFilter = true,
  loading,
  footer,
}: CommandPaletteProps) {
  const t = useStrings();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="animate-overlay fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ds-text-primary)_10%,transparent)] dark:bg-black/35" />
        <D.Content
          aria-describedby={undefined}
          className="animate-pop glass fixed left-1/2 top-[14vh] z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-xl outline-none"
        >
          <D.Title className="sr-only">{placeholder ?? t.commandPlaceholder}</D.Title>
          <Command shouldFilter={shouldFilter} loop className="flex max-h-[min(480px,70vh)] flex-col">
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search className="size-[18px] shrink-0 text-fg-tertiary" aria-hidden />
              <Command.Input
                {...(search !== undefined ? { value: search } : {})}
                {...(onSearchChange ? { onValueChange: onSearchChange } : {})}
                placeholder={placeholder ?? t.commandPlaceholder}
                className="h-14 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-tertiary"
              />
            </div>
            <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col">
              {loading && <Command.Loading className="px-3 py-6 text-center text-callout text-fg-tertiary">{t.loading}…</Command.Loading>}
              <Command.Empty className="px-3 py-10 text-center text-callout text-fg-tertiary">{t.commandEmpty}</Command.Empty>
              {children}
            </Command.List>
            {footer && <div className="border-t border-hairline px-4 py-2 text-footnote text-fg-tertiary">{footer}</div>}
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function CommandGroup({ heading, children }: { heading?: ReactNode; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-tertiary"
    >
      {children}
    </Command.Group>
  );
}

export interface CommandItemProps {
  onSelect: () => void;
  icon?: ReactNode;
  shortcut?: string;
  /** Extra search terms. */
  keywords?: string[];
  value?: string;
  hint?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}

export function CommandItem({ onSelect, icon, shortcut, keywords, value, hint, children, disabled }: CommandItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      {...(keywords ? { keywords } : {})}
      {...(value ? { value } : {})}
      disabled={disabled}
      className={cn(
        "flex h-10 cursor-default select-none items-center gap-3 rounded-md px-2.5 text-callout text-fg",
        "data-[selected=true]:bg-hover data-[disabled=true]:opacity-40",
        "[&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-fg-secondary",
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {hint && <span className="truncate text-footnote text-fg-tertiary">{hint}</span>}
      {shortcut && (
        <span className="flex gap-0.5">
          {formatShortcut(shortcut).map((k, i) => (
            <kbd key={i} className="grid h-5 min-w-5 place-items-center rounded-[5px] bg-[color-mix(in_oklab,var(--ds-text-primary)_7%,transparent)] px-1 font-text text-caption text-fg-secondary">
              {k}
            </kbd>
          ))}
        </span>
      )}
    </Command.Item>
  );
}

/** Opens the palette on ⌘K / Ctrl+K. */
export function useCommandPaletteShortcut(setOpen: (fn: (open: boolean) => boolean) => void, key = "k") {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [setOpen, key]);
}
