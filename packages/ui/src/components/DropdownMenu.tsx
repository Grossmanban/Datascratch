import { Check, ChevronRight } from "lucide-react";
import { DropdownMenu as M } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { shortcutLabel } from "./Kbd";
import {
  menuContent,
  menuItem,
  menuItemDanger,
  menuLabel,
  menuSeparator,
  menuShortcut,
} from "./menu-styles";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuGroup = M.Group;
export const DropdownMenuSub = M.Sub;
export const DropdownMenuRadioGroup = M.RadioGroup;

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.Content>
>(function DropdownMenuContent(
  { className, sideOffset = 6, collisionPadding = 8, align = "start", ...rest },
  ref,
) {
  return (
    <M.Portal>
      <M.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        align={align}
        className={cn(menuContent, className)}
        {...rest}
      />
    </M.Portal>
  );
});

export interface MenuItemProps extends ComponentPropsWithoutRef<typeof M.Item> {
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function DropdownMenuItem(
  { icon, shortcut, danger, className, children, ...rest },
  ref,
) {
  return (
    <M.Item ref={ref} className={cn(menuItem, danger && menuItemDanger, className)} {...rest}>
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className={menuShortcut}>{shortcutLabel(shortcut)}</span>}
    </M.Item>
  );
});

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...rest }, ref) {
  return (
    <M.CheckboxItem ref={ref} className={cn(menuItem, "pl-8", className)} {...rest}>
      <M.ItemIndicator className="absolute left-2 flex text-accent">
        <Check className="size-4" />
      </M.ItemIndicator>
      {children}
    </M.CheckboxItem>
  );
});

export const DropdownMenuRadioItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...rest }, ref) {
  return (
    <M.RadioItem ref={ref} className={cn(menuItem, "pl-8", className)} {...rest}>
      <M.ItemIndicator className="absolute left-2 flex text-accent">
        <Check className="size-4" />
      </M.ItemIndicator>
      {children}
    </M.RadioItem>
  );
});

export function DropdownMenuLabel({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof M.Label>) {
  return <M.Label className={cn(menuLabel, className)} {...rest} />;
}

export function DropdownMenuSeparator({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof M.Separator>) {
  return <M.Separator className={cn(menuSeparator, className)} {...rest} />;
}

export function DropdownMenuSubTrigger({
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

export function DropdownMenuSubContent({
  className,
  ...rest
}: ComponentPropsWithoutRef<typeof M.SubContent>) {
  return (
    <M.Portal>
      <M.SubContent
        sideOffset={4}
        alignOffset={-4}
        className={cn(menuContent, className)}
        {...rest}
      />
    </M.Portal>
  );
}
