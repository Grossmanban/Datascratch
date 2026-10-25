import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { IconButton } from "./IconButton";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const overlay =
  "animate-overlay fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ds-text-primary)_18%,transparent)] backdrop-blur-[2px] dark:bg-black/45";

export interface DialogContentProps extends Omit<ComponentPropsWithoutRef<typeof D.Content>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** Visually hide the title (still announced). */
  hideTitle?: boolean;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  showClose?: boolean;
}

const widths = { sm: "max-w-[400px]", md: "max-w-[520px]", lg: "max-w-[720px]" };

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { title, description, hideTitle, size = "md", footer, showClose = true, className, children, ...rest },
  ref,
) {
  const t = useStrings();
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <D.Content
          ref={ref}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "animate-pop pointer-events-auto relative w-full rounded-xl border border-hairline bg-surface shadow-popover outline-none",
            widths[size],
            className,
          )}
          {...rest}
        >
          <div className={cn("px-6 pt-6", hideTitle && "sr-only")}>
            <D.Title className="font-display text-h2 text-fg">{title}</D.Title>
            {description && <D.Description className="mt-1.5 text-callout text-fg-secondary">{description}</D.Description>}
          </div>
          {children && <div className="px-6 py-5">{children}</div>}
          {footer && <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>}
          {showClose && (
            <D.Close asChild>
              <IconButton label={t.close} icon={<X />} size="sm" tooltip={false} className="absolute right-3 top-3" />
            </D.Close>
          )}
        </D.Content>
      </div>
    </D.Portal>
  );
});

export interface SheetContentProps extends Omit<ComponentPropsWithoutRef<typeof D.Content>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  side?: "right" | "bottom";
  hideTitle?: boolean;
}

/** Side panel (inspector) or bottom sheet (narrow screens). */
export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(function SheetContent(
  { title, description, side = "right", hideTitle, className, children, ...rest },
  ref,
) {
  const t = useStrings();
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        ref={ref}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-popover outline-none",
          side === "right"
            ? "animate-sheet-right inset-y-2 right-2 w-[min(400px,calc(100vw-16px))] rounded-xl border border-hairline"
            : "animate-sheet-bottom inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl border-t border-hairline pb-[env(safe-area-inset-bottom)]",
          className,
        )}
        {...rest}
      >
        {side === "bottom" && <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-[color-mix(in_oklab,var(--ds-text-primary)_18%,transparent)]" />}
        <div className={cn("flex items-start justify-between gap-4 px-5 pb-2 pt-5", hideTitle && "sr-only")}>
          <div>
            <D.Title className="font-display text-h3 text-fg">{title}</D.Title>
            {description && <D.Description className="mt-1 text-footnote text-fg-secondary">{description}</D.Description>}
          </div>
          <D.Close asChild>
            <IconButton label={t.close} icon={<X />} size="sm" tooltip={false} className="-mr-1.5 -mt-1" />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </D.Content>
    </D.Portal>
  );
});

export const Sheet = D.Root;
export const SheetTrigger = D.Trigger;
export const SheetClose = D.Close;
