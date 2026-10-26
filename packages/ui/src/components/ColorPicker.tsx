import { Check } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "../lib/cn";
import { useLocale } from "../lib/i18n";

interface HSV {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export function hexToHsv(hex: string): HSV {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1]!, 16) : 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`.toUpperCase();
}

export interface ColorPickerProps {
  initial?: string;
  /** Called with `#RRGGBB` when the user confirms. */
  onPick: (hex: string) => void;
  className?: string;
}

/** Compact HSV picker in Quiet Paper style: saturation/brightness field, hue rail, hex input. */
export function ColorPicker({ initial = "#2B58DA", onPick, className }: ColorPickerProps) {
  const locale = useLocale();
  const L =
    locale === "ru"
      ? { field: "Насыщенность и яркость", hue: "Оттенок", hex: "HEX", apply: "Выбрать" }
      : { field: "Saturation and brightness", hue: "Hue", hex: "HEX", apply: "Use color" };
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initial));
  const [text, setText] = useState(initial.toUpperCase());
  const hex = hsvToHex(hsv);
  useEffect(() => setText(hex), [hex]);

  const field = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const drag = (
    el: HTMLDivElement | null,
    e: ReactPointerEvent,
    apply: (x: number, y: number) => void,
  ) => {
    if (!el) return;
    el.setPointerCapture?.(e.pointerId);
    const move = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      apply(
        Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)),
      );
    };
    move(e);
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const nudge = (dx: number, dy: number) =>
    setHsv((c) => ({
      ...c,
      s: Math.min(1, Math.max(0, c.s + dx)),
      v: Math.min(1, Math.max(0, c.v - dy)),
    }));

  return (
    <div className={cn("flex w-[232px] flex-col gap-3", className)}>
      <div
        ref={field}
        role="slider"
        tabIndex={0}
        aria-label={L.field}
        aria-valuetext={hex}
        onPointerDown={(e) =>
          drag(field.current, e, (x, y) => setHsv((c) => ({ ...c, s: x, v: 1 - y })))
        }
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.02;
          const map: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const m = map[e.key];
          if (m) {
            e.preventDefault();
            nudge(m[0], m[1]);
          }
        }}
        className="relative h-36 cursor-crosshair touch-none rounded-md outline-none focus-visible:focus-ring"
        style={{
          backgroundColor: `hsl(${hsv.h} 100% 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_2px_6px_rgb(0_0_0/0.25)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hex }}
        />
      </div>
      <div
        ref={rail}
        role="slider"
        tabIndex={0}
        aria-label={L.hue}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onPointerDown={(e) => drag(rail.current, e, (x) => setHsv((c) => ({ ...c, h: x * 360 })))}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const d = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 15 : 3);
            setHsv((c) => ({ ...c, h: (c.h + d + 360) % 360 }));
          }
        }}
        className="relative h-3 cursor-pointer touch-none rounded-full outline-none focus-visible:focus-ring"
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className="size-7 shrink-0 rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.2)]"
          style={{ backgroundColor: hex }}
        />
        <input
          aria-label={L.hex}
          value={text}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setText(v);
            if (/^#?[0-9A-F]{6}$/.test(v)) setHsv(hexToHsv(v.startsWith("#") ? v : `#${v}`));
          }}
          className="h-8 min-w-0 flex-1 rounded-full bg-[color-mix(in_oklab,var(--ds-text-primary)_6%,transparent)] px-3 font-mono text-footnote text-fg outline-none focus:shadow-[0_0_0_2px_color-mix(in_oklab,var(--ds-accent)_35%,transparent)]"
        />
        <button
          type="button"
          onClick={() => onPick(hex)}
          aria-label={L.apply}
          data-testid="color-apply"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent outline-none hover:brightness-105 focus-visible:focus-ring"
        >
          <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}
