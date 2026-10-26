import { ChevronDown, Eraser, Highlighter, Lasso, PenLine, Pencil, Type, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EditorApi } from "@/editor";
import { togglePenPalette, useUi } from "@/hooks/useUi";

type Pen = EditorApi["pen"];
type Settings = ReturnType<Pen["getSettings"]>;

const TOOL_ICONS: Record<string, LucideIcon> = {
  pen: PenLine,
  pencil: Pencil,
  marker: Highlighter,
  highlighter: Highlighter,
  eraser: Eraser,
  lasso: Lasso,
};

/** `ink.blue` → the theme's colour variable (as the editor resolves tokens). */
const tokenColor = (token: string) => (token.startsWith("#") ? token : `var(--ds-${token.replace(/\./g, "-")}, currentColor)`);

/**
 * The pen palette folds into a round button at the edge of the page showing the current tool and
 * colour (as on iOS); tapping it unfolds the palette. While unfolded, the same corner button folds it.
 */
export function PenPaletteToggle({ pen }: { pen: Pen }) {
  const { t } = useTranslation();
  const collapsed = useUi((s) => s.penPaletteCollapsed);
  const [settings, setSettings] = useState<Settings>(() => pen.getSettings());
  useEffect(() => pen.subscribe(setSettings), [pen]);
  // On narrow screens the unfolded palette reaches the corner: the button then sits above it.
  const ref = useRef<HTMLButtonElement>(null);
  const [lift, setLift] = useState(0);
  useLayoutEffect(() => {
    if (collapsed) return setLift(0);
    const measure = () => {
      const pal = document.querySelector(".ds-palette")?.getBoundingClientRect();
      const btn = ref.current?.getBoundingClientRect();
      setLift(pal && btn && pal.right > btn.left - 8 ? pal.height + 8 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const pal = document.querySelector(".ds-palette");
    if (pal) ro.observe(pal);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [collapsed]);
  const Icon = (settings.tool && TOOL_ICONS[settings.tool]) || Type;
  const toolName = settings.tool ? t(`pen.tool.${settings.tool}`) : t("pen.tool.text");
  const label = collapsed ? t("pen.showPalette", { tool: toolName }) : t("pen.hidePalette");
  return (
    <div className="pointer-events-none sticky bottom-4 z-30 flex h-0 justify-end overflow-visible px-4 sm:px-6">
      <motion.button
        ref={ref}
        key={collapsed ? "collapsed" : "open"}
        style={lift ? { marginTop: -lift } : undefined}
        type="button"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        onClick={togglePenPalette}
        aria-label={label}
        aria-expanded={!collapsed}
        title={label}
        data-testid="pen-palette-toggle"
        data-state={collapsed ? "collapsed" : "open"}
        className={
          collapsed
            ? "pointer-events-auto relative flex size-11 -translate-y-full items-center justify-center rounded-full border border-line bg-[var(--ds-bg-elevated,#ffffffcc)] text-ink shadow-[0_4px_16px_rgb(40_30_10/0.14)] backdrop-blur-xl transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"
            : "pointer-events-auto flex size-8 -translate-y-full items-center justify-center rounded-full border border-line bg-[var(--ds-bg-elevated,#ffffffcc)] text-ink-2 shadow-[0_2px_8px_rgb(40_30_10/0.10)] backdrop-blur-xl transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
        }
      >
        {collapsed ? (
          <>
            <Icon className="size-5" style={{ color: settings.tool && settings.tool !== "eraser" && settings.tool !== "lasso" ? tokenColor(settings.color) : undefined }} />
            {settings.tool && settings.tool !== "eraser" && settings.tool !== "lasso" && (
              <span className="absolute bottom-1.5 right-1.5 size-2.5 rounded-full ring-2 ring-[var(--ds-bg-surface,#fff)]" style={{ background: tokenColor(settings.color) }} />
            )}
          </>
        ) : (
          <ChevronDown className="size-4" />
        )}
      </motion.button>
    </div>
  );
}
