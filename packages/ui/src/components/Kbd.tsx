import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Format "mod+k" as ⌘K on Apple platforms and Ctrl K elsewhere. */
export function formatShortcut(shortcut: string): string[] {
  const mac = isMac();
  const map: Record<string, string> = mac
    ? { mod: "⌘", cmd: "⌘", shift: "⇧", alt: "⌥", option: "⌥", ctrl: "⌃", enter: "↩", backspace: "⌫", esc: "esc" }
    : { mod: "Ctrl", cmd: "Ctrl", shift: "Shift", alt: "Alt", option: "Alt", ctrl: "Ctrl", enter: "Enter", backspace: "Backspace", esc: "Esc" };
  return shortcut.split("+").map((k) => map[k.toLowerCase()] ?? (k.length === 1 ? k.toUpperCase() : k));
}

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** Shortcut like "mod+shift+k". */
  shortcut: string;
}

export function Kbd({ shortcut, className, ...rest }: KbdProps) {
  return (
    <kbd className={cn("inline-flex items-center gap-0.5 font-text text-caption text-fg-tertiary", className)} {...rest}>
      {formatShortcut(shortcut).map((k, i) => (
        <span
          key={i}
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-hairline bg-surface px-1 leading-none"
        >
          {k}
        </span>
      ))}
    </kbd>
  );
}
