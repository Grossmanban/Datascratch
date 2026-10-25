import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Toast as T } from "radix-ui";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { spring } from "../lib/tokens";

export type ToastTone = "neutral" | "success" | "danger" | "warning";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** e.g. { label: "Undo", onClick } — undo is the default way to make deletes safe. */
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  toast: (o: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons = {
  neutral: <Info className="text-fg-secondary" />,
  success: <CheckCircle2 className="text-success" />,
  danger: <XCircle className="text-danger" />,
  warning: <AlertTriangle className="text-warning" />,
};

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const t = useStrings();
  const reduce = useReducedMotion();
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback((o: ToastOptions) => {
    const id = ++seq;
    setItems((xs) => [...xs.slice(-3), { ...o, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <T.Provider swipeDirection="down" label={t.notifications}>
        {children}
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <T.Root
              key={it.id}
              asChild
              forceMount
              duration={it.duration ?? (it.action ? 6000 : 4000)}
              onOpenChange={(open) => !open && dismiss(it.id)}
            >
              <motion.li
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.14 } }
                }
                transition={spring("snappy")}
                className={cn(
                  "glass pointer-events-auto flex w-[min(380px,calc(100vw-24px))] items-start gap-3 rounded-lg px-3.5 py-3",
                  "[&_svg]:size-[18px] [&_svg]:shrink-0",
                )}
              >
                <span className="mt-px">{icons[it.tone ?? "neutral"]}</span>
                <div className="min-w-0 flex-1">
                  <T.Title className="text-callout font-medium text-fg">{it.title}</T.Title>
                  {it.description && (
                    <T.Description className="mt-0.5 text-footnote text-fg-secondary">
                      {it.description}
                    </T.Description>
                  )}
                </div>
                {it.action && (
                  <T.Action altText={it.action.label} asChild>
                    <button
                      type="button"
                      onClick={it.action.onClick}
                      className="rounded-sm px-1.5 text-callout font-medium text-accent outline-none hover:bg-accent-soft focus-visible:focus-ring"
                    >
                      {it.action.label}
                    </button>
                  </T.Action>
                )}
                <T.Close
                  aria-label={t.close}
                  className="-mr-1 rounded-sm p-0.5 text-fg-tertiary outline-none hover:text-fg focus-visible:focus-ring"
                >
                  <X className="!size-4" />
                </T.Close>
              </motion.li>
            </T.Root>
          ))}
        </AnimatePresence>
        <T.Viewport className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 outline-none" />
      </T.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <UIProvider> or <ToastProvider>");
  return ctx;
}
