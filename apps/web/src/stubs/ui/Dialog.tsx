import { Dialog as D } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(20_18_14/0.28)] backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </D.Overlay>
            <D.Content asChild forceMount {...(description ? {} : { "aria-describedby": undefined })}>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-24px)] -translate-x-1/2 rounded-xl border border-line bg-surface p-6 shadow-popover outline-none",
                  wide ? "max-w-2xl" : "max-w-md",
                  className,
                )}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              >
                {title ? (
                  <D.Title className="font-display text-[22px] leading-tight font-medium tracking-[-0.01em] text-ink">{title}</D.Title>
                ) : (
                  <D.Title className="sr-only">Dialog</D.Title>
                )}
                {description ? <D.Description className="mt-1.5 text-[14px] text-ink-2">{description}</D.Description> : null}
                <div className={cn(title || description ? "mt-5" : "")}>{children}</div>
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
