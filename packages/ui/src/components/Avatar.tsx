import { Avatar as A } from "radix-ui";
import { cn } from "../lib/cn";
import { useStrings } from "../lib/i18n";
import { tintBg, tintFg, tintFor } from "../lib/tokens";

export type Presence = "online" | "away" | "offline";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  presence?: Presence;
  /** Ring colour for live cursors / collaborators. */
  ring?: boolean;
  className?: string;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function Avatar({ name, src, size = 28, presence, ring, className }: AvatarProps) {
  const t = useStrings();
  const tint = tintFor(name);
  const dot = Math.max(8, Math.round(size * 0.3));
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <A.Root
        className={cn(
          "inline-flex size-full select-none items-center justify-center overflow-hidden rounded-full",
          ring && "ring-2 ring-surface",
        )}
        style={{ backgroundColor: tintBg(tint), color: tintFg(tint) }}
      >
        {src && <A.Image src={src} alt={name} className="size-full object-cover" />}
        <A.Fallback
          delayMs={src ? 400 : 0}
          className="font-medium leading-none"
          style={{ fontSize: Math.round(size * 0.4) }}
          aria-label={name}
          role="img"
        >
          {initials(name)}
        </A.Fallback>
      </A.Root>
      {presence && (
        <span
          role="status"
          aria-label={t[presence]}
          className={cn(
            "absolute -bottom-px -right-px rounded-full ring-2 ring-surface",
            presence === "online" && "bg-success",
            presence === "away" && "bg-warning",
            presence === "offline" && "bg-fg-tertiary",
          )}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}

export interface AvatarStackProps {
  people: { name: string; src?: string | null }[];
  max?: number;
  size?: number;
  className?: string;
}

/** Overlapping avatars of who is in the document. */
export function AvatarStack({ people, max = 4, size = 26, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((p, i) => (
        <Avatar
          key={`${p.name}-${i}`}
          name={p.name}
          src={p.src ?? null}
          size={size}
          ring
          className={i ? "-ml-1.5" : ""}
        />
      ))}
      {rest > 0 && (
        <span
          className="-ml-1.5 inline-flex items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--ds-text-primary)_8%,var(--ds-bg-surface))] font-medium text-fg-secondary ring-2 ring-surface"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
