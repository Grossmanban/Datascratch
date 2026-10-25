import type { PresenceUser } from "@/data/presence";
import { Tooltip } from "@/ui";

export function PresenceStack({ users }: { users: PresenceUser[] }) {
  if (!users.length) return null;
  return (
    <div className="mr-1 flex -space-x-1.5" data-testid="presence">
      {users.slice(0, 4).map((u, i) => (
        <Tooltip key={i} content={u.name}>
          <span
            className="flex size-6 items-center justify-center rounded-full text-[10.5px] font-semibold text-white ring-2 ring-canvas"
            style={{ background: u.color }}
          >
            {u.name.slice(0, 1).toUpperCase()}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}
