import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { create } from "zustand";

type Toast = { id: number; message: ReactNode; action?: { label: string; run: () => void }; tone?: "default" | "danger" };
const useToasts = create<{ items: Toast[] }>(() => ({ items: [] }));
let nextId = 1;

export function toast(message: ReactNode, opts: { action?: Toast["action"]; tone?: Toast["tone"]; duration?: number } = {}) {
  const id = nextId++;
  useToasts.setState((s) => ({ items: [...s.items.slice(-2), { id, message, action: opts.action, tone: opts.tone }] }));
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((t) => t.id !== id) })), opts.duration ?? 4200);
}

export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            role="status"
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-2.5 text-[14px] text-canvas shadow-popover"
          >
            <span className={t.tone === "danger" ? "text-[color-mix(in_srgb,var(--ds-danger)_70%,white)]" : undefined}>{t.message}</span>
            {t.action ? (
              <button
                className="font-semibold text-[color-mix(in_srgb,var(--ds-accent)_60%,white)] hover:underline"
                onClick={() => {
                  t.action!.run();
                  useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== t.id) }));
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
