import { FileText } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useLocale } from "../lib/i18n";
import type { TintName } from "../lib/tokens";
import { TagChip } from "./Badge";
import { TaskCheckbox, type TaskState } from "./Checkbox";
import { DateChip } from "./DateChip";

export interface TaskTag {
  name: string;
  tint?: TintName;
}

export interface TaskRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  state: TaskState;
  onStateChange?: (state: TaskState) => void;
  note?: ReactNode;
  scheduled?: Date | null;
  deadline?: Date | null;
  tags?: TaskTag[];
  /** Document the task lives in (Tasks screen). */
  source?: string;
  onOpenSource?: () => void;
  onDateClick?: (kind: "scheduled" | "deadline") => void;
  now?: Date;
  selected?: boolean;
  /** Plain-text title for screen readers when `title` is not a string. */
  label?: string;
}

/** Task line for lists (Inbox / Today / Upcoming): checkbox, title, note, dates, tags, source. */
export const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(function TaskRow(
  { title, state, onStateChange, note, scheduled, deadline, tags, source, onOpenSource, onDateClick, now, selected, label, className, ...rest },
  ref,
) {
  const locale = useLocale();
  const muted = state !== "open";
  const a11y = label ?? (typeof title === "string" ? title : undefined);
  return (
    <div
      ref={ref}
      data-task-state={state}
      data-selected={selected || undefined}
      className={cn(
        "group flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-fast",
        "hover:bg-hover data-[selected]:bg-selected",
        className,
      )}
      {...rest}
    >
      <TaskCheckbox
        state={state}
        {...(onStateChange ? { onStateChange } : {})}
        {...(a11y ? { "aria-label": a11y } : {})}
        className="mt-[3px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "min-w-0 text-body leading-[1.45] transition-colors duration-base",
              muted ? "text-fg-tertiary line-through decoration-[color-mix(in_oklab,var(--ds-text-tertiary)_60%,transparent)]" : "text-fg",
            )}
          >
            {title}
          </span>
        </div>
        {note && <p className={cn("mt-0.5 line-clamp-2 text-footnote", muted ? "text-fg-tertiary" : "text-fg-secondary")}>{note}</p>}
        {(scheduled || deadline || tags?.length || source) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {scheduled && (
              <DateChip
                date={scheduled}
                completed={muted}
                {...(now ? { now } : {})}
                {...(onDateClick ? { onClick: () => onDateClick("scheduled") } : {})}
              />
            )}
            {deadline && (
              <DateChip
                date={deadline}
                kind="deadline"
                completed={muted}
                {...(now ? { now } : {})}
                {...(onDateClick ? { onClick: () => onDateClick("deadline") } : {})}
              />
            )}
            {tags?.map((t) => <TagChip key={t.name} name={t.name} tint={t.tint ?? "gray"} size="sm" />)}
            {source &&
              (onOpenSource ? (
                <button
                  type="button"
                  onClick={onOpenSource}
                  className="inline-flex h-5 items-center gap-1 rounded-sm px-1 text-caption text-fg-tertiary outline-none hover:text-fg-secondary focus-visible:focus-ring"
                >
                  <FileText className="size-3" aria-hidden />
                  {locale === "ru" ? `из «${source}»` : `in “${source}”`}
                </button>
              ) : (
                <span className="inline-flex h-5 items-center gap-1 px-1 text-caption text-fg-tertiary">
                  <FileText className="size-3" aria-hidden />
                  {locale === "ru" ? `из «${source}»` : `in “${source}”`}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
});
