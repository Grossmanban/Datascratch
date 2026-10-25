import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/cn";

const field =
  "w-full rounded-md border border-hairline bg-surface text-callout text-fg placeholder:text-fg-tertiary outline-none " +
  "transition-[border-color,box-shadow] duration-fast ease-snappy " +
  "hover:border-[color-mix(in_oklab,var(--ds-line-separator),var(--ds-text-primary)_12%)] " +
  "focus:border-[color-mix(in_oklab,var(--ds-accent)_60%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ds-accent)_16%,transparent)] " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ds-danger)_16%,transparent)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  leading?: ReactNode;
  trailing?: ReactNode;
  size?: "md" | "lg";
  /** Borderless variant for titles and inline editing. */
  bare?: boolean;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leading, trailing, size = "md", bare, invalid, className, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        bare ? "w-full bg-transparent text-fg outline-none placeholder:text-fg-tertiary" : field,
        !bare && (size === "lg" ? "h-11 px-3.5 text-body" : "h-9 px-3"),
        !bare && leading && (size === "lg" ? "pl-10" : "pl-9"),
        !bare && trailing && "pr-9",
        !(leading || trailing) && className,
      )}
      {...rest}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className={cn("relative flex items-center", className)}>
      {leading && (
        <span className="pointer-events-none absolute left-3 flex text-fg-tertiary [&_svg]:size-4">
          {leading}
        </span>
      )}
      {input}
      {trailing && (
        <span className="absolute right-2.5 flex text-fg-tertiary [&_svg]:size-4">{trailing}</span>
      )}
    </div>
  );
});

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Grow with content up to `maxRows`. */
  autoGrow?: boolean;
  maxRows?: number;
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { autoGrow = true, maxRows = 12, invalid, className, onInput, rows = 3, ...rest },
  forwarded,
) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [forwarded],
  );
  const fit = useCallback(() => {
    const el = inner.current;
    if (!el || !autoGrow) return;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, lh * maxRows + 16)}px`;
  }, [autoGrow, maxRows]);
  useLayoutEffect(fit, [fit, rest.value]);
  return (
    <textarea
      ref={setRef}
      rows={rows}
      aria-invalid={invalid || undefined}
      onInput={(e) => {
        fit();
        onInput?.(e);
      }}
      className={cn(field, "resize-none px-3 py-2 leading-[1.5]", className)}
      {...rest}
    />
  );
});
