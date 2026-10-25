import { useEffect, useRef, useState } from "react";

export function InlineRename({
  value,
  onDone,
  className,
}: {
  value: string;
  onDone: (next: string | null) => void;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = () => onDone(text.trim() ? text.trim() : null);
  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone(null);
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className={
        className ??
        "h-6 w-full min-w-0 rounded-[5px] border border-accent/50 bg-surface px-1.5 text-[13.5px] text-ink outline-none shadow-[0_0_0_3px_color-mix(in_srgb,var(--ds-accent)_15%,transparent)]"
      }
    />
  );
}
