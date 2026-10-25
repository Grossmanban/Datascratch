import { ContextMenu as CM, DropdownMenu as DM } from "radix-ui";
import { Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

// One description of a menu renders both as a dropdown (button) and a context menu (right click).
export type MenuItem =
  | {
      kind?: "item";
      label: ReactNode;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      onSelect: () => void;
    }
  | { kind: "separator" }
  | { kind: "label"; label: ReactNode }
  | { kind: "sub"; label: ReactNode; icon?: ReactNode; items: MenuItem[] };

const panel =
  "z-50 min-w-[200px] overflow-hidden rounded-lg border border-line glass p-1 shadow-popover outline-none data-[state=open]:animate-[ds-pop_140ms_ease-out]";
const itemCls =
  "relative flex h-8 select-none items-center gap-2.5 rounded-[7px] px-2 text-[13.5px] text-ink outline-none data-[highlighted]:bg-ink/[0.06] data-[disabled]:opacity-40";

type Prims = typeof DM | typeof CM;

function renderItems(P: Prims, items: MenuItem[]): ReactNode {
  return items.map((it, i) => {
    if (it.kind === "separator") return <P.Separator key={i} className="my-1 h-px bg-line" />;
    if (it.kind === "label")
      return (
        <P.Label key={i} className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
          {it.label}
        </P.Label>
      );
    if (it.kind === "sub")
      return (
        <P.Sub key={i}>
          <P.SubTrigger className={itemCls}>
            <span className="flex size-4 items-center justify-center text-ink-2">{it.icon}</span>
            <span className="flex-1">{it.label}</span>
            <ChevronRight className="size-3.5 text-ink-3" />
          </P.SubTrigger>
          <P.Portal>
            <P.SubContent className={panel} sideOffset={4} alignOffset={-4}>
              {renderItems(P, it.items)}
            </P.SubContent>
          </P.Portal>
        </P.Sub>
      );
    return (
      <P.Item
        key={i}
        disabled={it.disabled}
        onSelect={it.onSelect}
        className={cn(itemCls, it.danger && "text-danger data-[highlighted]:bg-danger/10")}
      >
        <span className={cn("flex size-4 items-center justify-center", it.danger ? "text-danger" : "text-ink-2")}>{it.icon}</span>
        <span className="flex-1 truncate">{it.label}</span>
        {it.checked ? <Check className="size-3.5 text-accent" /> : null}
        {it.shortcut ? <span className="ml-4 text-[12px] text-ink-3">{it.shortcut}</span> : null}
      </P.Item>
    );
  });
}

export function DropdownMenu({
  trigger,
  items,
  align = "start",
  side = "bottom",
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "end" | "center";
  side?: "bottom" | "top" | "right" | "left";
}) {
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content className={panel} align={align} side={side} sideOffset={6} collisionPadding={8}>
          {renderItems(DM, items)}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function ContextMenu({ children, items, disabled }: { children: ReactNode; items: MenuItem[] | (() => MenuItem[]); disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <CM.Root modal={false}>
      <CM.Trigger asChild>{children}</CM.Trigger>
      <CM.Portal>
        <CM.Content className={panel} collisionPadding={8}>
          {renderItems(CM, typeof items === "function" ? items() : items)}
        </CM.Content>
      </CM.Portal>
    </CM.Root>
  );
}
