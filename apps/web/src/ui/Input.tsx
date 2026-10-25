import { useId, type ReactNode } from "react";

export { Input, TextArea } from "@datascratch/ui";

/** Label + control + hint/error, with the control wired to the label by id. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[12px] text-ink-2">{hint}</p> : null}
    </div>
  );
}
