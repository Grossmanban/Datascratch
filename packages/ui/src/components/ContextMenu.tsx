import { Check, ChevronRight } from "lucide-react";
import { ContextMenu as M } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatShortcut } from "./Kbd";
import { menuContent, menuItem, menuItemDanger, menuLabel, menuSeparator, menuShortcut } from "./menu-styles";

/** Right-click / long-press menu: the primary way to act on things (D-38). */
export const ContextMenu = M.Root;
export const ContextMenuTrigger = M.Trigger;
export const ContextMenuGroup = M.Group;
export const ContextMenuSub = M.Sub;
export const ContextMenuRadioGroup = M.RadioGroup;

export const ContextMenuContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof M.Content>>(
  function ContextMenuContent({ className, collisionPadding = 8, ...rest }, ref) {
    return (
      <M.Portal>
        <M.Content ref={ref} collisionPadding={collisionPadding} className={cn(menuContent, className)} {...rest} />
      </M.Portal>
    );
  },
);

export interface ContextMenuItemProps extends ComponentPropsWithoutRef<typeof M.Item> {
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
}

export const ContextMenuItem = forwardRef<HTMLDivElement, ContextMenuItemProps>(function ContextMenuItem(
  { icon, shortcut, danger, className, children, ...rest },
  ref,
) {
  return (
    <M.Item ref={ref} className={cn(menuItem, danger && menuItemDanger, className)} {...rest}>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className={menuShortcut}>{formatShortcut(shortcut).join("")}</span>}
    </M.Item>
  );
});

export const ContextMenuCheckboxItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof M.CheckboxItem>>(
  function ContextMenuCheckboxItem({ className, children, ...rest }, ref) {
    return (
      <M.CheckboxItem ref={ref} className={cn(menuItem, "pl-8", className)} {...rest}>
        <M.ItemIndicator className="absolute left-2 flex text-accent">
          <Check className="size-4" />
        </M.ItemIndicator>
        {children}
      </M.CheckboxItem>
    );
  },
);

export const ContextMenuRadioItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof M.RadioItem>>(
  function ContextMenuRadioItem({ className, children, ...rest }, ref) {
    return (
      <M.RadioItem ref={ref} className={cn(menuItem, "pl-8", className)} {...rest}>
        <M.ItemIndicator className="absolute left-2 flex text-accent">
          <Check className="size-4" />
        </M.ItemIndicator>
        {children}
      </M.RadioItem>
    );
  },
);

export function ContextMenuLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof M.Label>) {
  return <M.Label className={cn(menuLabel, className)} {...rest} />;
}

export function ContextMenuSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof M.Separator>) {
  return <M.Separator className={cn(menuSeparator, className)} {...rest} />;
}

export function ContextMenuSubTrigger({
  icon,
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<typeof M.SubTrigger> & { icon?: ReactNode }) {
  return (
    <M.SubTrigger className={cn(menuItem, "data-[state=open]:bg-hover", className)} {...rest}>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      <ChevronRight className="ml-auto !size-3.5 text-fg-tertiary" />
    </M.SubTrigger>
  );
}

export function ContextMenuSubContent({ className, ...rest }: ComponentPropsWithoutRef<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent sideOffset={4} alignOffset={-4} className={cn(menuContent, className)} {...rest} />
    </M.Portal>
  );
}
