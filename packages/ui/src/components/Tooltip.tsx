import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { Kbd } from "./Kbd";

export interface TooltipProps {
  content: ReactNode;
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  shortcut,
  side = "top",
  children,
  delayDuration,
  className,
}: TooltipProps) {
  return (
    <T.Root {...(delayDuration !== undefined ? { delayDuration } : {})}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "animate-pop z-50 flex items-center gap-2 rounded-sm bg-fg px-2 py-1 text-footnote font-medium text-canvas shadow-popover",
            className,
          )}
        >
          {content}
          {shortcut && (
            <Kbd
              shortcut={shortcut}
              className="[&>span]:border-transparent [&>span]:bg-[color-mix(in_oklab,var(--ds-bg-canvas)_16%,transparent)] [&>span]:text-canvas"
            />
          )}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

export const TooltipProvider = T.Provider;
