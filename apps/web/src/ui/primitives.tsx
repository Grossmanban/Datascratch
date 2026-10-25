// App-facing composition over @datascratch/ui (design-system stream). The design system ships
// Radix-style building blocks; these wrappers give screens the compact props they use
// (menus described as data, dialogs/popovers with a trigger, imperative toasts).
import {
  Button as UIButton,
  ContextMenu as UIContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Dialog as UIDialog,
  DialogContent,
  DropdownMenu as UIDropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState as UIEmptyState,
  IconButton as UIIconButton,
  Kbd as UIKbd,
  Popover as UIPopover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl as UISegmentedControl,
  Spinner as UISpinner,
  TaskCheckbox as UITaskCheckbox,
  useToast,
  type ButtonProps as UIButtonProps,
  type ToastOptions,
} from "@datascratch/ui";
import { Check, Sparkles } from "lucide-react";
import { forwardRef, useEffect, type ReactNode } from "react";
import { cn } from "@datascratch/ui";

export { cn, Tooltip, TooltipProvider, UIProvider, Switch } from "@datascratch/ui";

// ---------- buttons ----------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonProps = Omit<UIButtonProps, "variant"> & { variant?: Variant; icon?: ReactNode };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", icon, leading, ...rest }, ref) {
  return <UIButton ref={ref} variant={variant === "subtle" ? "secondary" : variant} leading={leading ?? icon} {...rest} />;
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "icon"> & { label: string; children: ReactNode; size?: "sm" | "md" | "lg"; shortcut?: string }
>(function IconButton({ label, children, size = "md", variant, className, loading: _loading, leading: _l, trailing: _t, asChild: _a, ...rest }, ref) {
  return (
    <UIIconButton
      ref={ref}
      label={label}
      icon={children}
      size={size}
      variant={variant === "secondary" ? "secondary" : "ghost"}
      className={className}
      {...rest}
    />
  );
});

export function Spinner({ className, size }: { className?: string; size?: number }) {
  const px = size ?? (className?.includes("size-5") ? 20 : 16);
  return <UISpinner size={px} className={className} label={null} />;
}

export function Kbd({ children }: { children: string }) {
  return <UIKbd shortcut={children} />;
}

// ---------- dialogs ----------

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <UIDialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title ?? "Dialog"} hideTitle={!title} description={description} size={wide ? "lg" : "md"} className={className}>
        {children}
      </DialogContent>
    </UIDialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}

// ---------- menus (described as data) ----------

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

const Drop = {
  Item: DropdownMenuItem,
  Label: DropdownMenuLabel,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};
const Ctx = {
  Item: ContextMenuItem,
  Label: ContextMenuLabel,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

function renderItems(P: typeof Drop | typeof Ctx, items: MenuItem[]): ReactNode {
  return items.map((it, i) => {
    if (it.kind === "separator") return <P.Separator key={i} />;
    if (it.kind === "label") return <P.Label key={i}>{it.label}</P.Label>;
    if (it.kind === "sub")
      return (
        <P.Sub key={i}>
          <P.SubTrigger icon={it.icon}>{it.label}</P.SubTrigger>
          <P.SubContent>{renderItems(P, it.items)}</P.SubContent>
        </P.Sub>
      );
    return (
      <P.Item
        key={i}
        icon={it.icon}
        shortcut={it.shortcut}
        danger={it.danger}
        disabled={it.disabled}
        onSelect={it.onSelect}
      >
        <span className="flex-1 truncate">{it.label}</span>
        {it.checked ? <Check className="ml-2 size-3.5 text-accent" /> : null}
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
    <UIDropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side}>
        {renderItems(Drop, items)}
      </DropdownMenuContent>
    </UIDropdownMenu>
  );
}

export function ContextMenu({ children, items, disabled }: { children: ReactNode; items: MenuItem[] | (() => MenuItem[]); disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <UIContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>{renderItems(Ctx, typeof items === "function" ? items() : items)}</ContextMenuContent>
    </UIContextMenu>
  );
}

// ---------- popover, segmented, empty state, task checkbox ----------

export function Popover({
  trigger,
  children,
  align = "start",
  open,
  onOpenChange,
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  className?: string;
}) {
  return (
    <UIPopover {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className={cn("p-3", className)}>
        {children}
      </PopoverContent>
    </UIPopover>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  className?: string;
}) {
  return (
    <UISegmentedControl
      value={value}
      onValueChange={onChange}
      className={className}
      options={options.map((o) => ({ value: o.value, label: o.label, ...(o.title ? { "aria-label": o.title } : {}) }))}
    />
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <UIEmptyState icon={icon ?? <Sparkles />} title={title} description={description} action={action} />
    </div>
  );
}

export function TaskCheckbox({
  state,
  onToggle,
  label,
  size = 18,
}: {
  state: "open" | "done" | "cancelled";
  onToggle: () => void;
  label: string;
  size?: number;
}) {
  return <UITaskCheckbox state={state} size={size} aria-label={label} onStateChange={() => onToggle()} />;
}

// ---------- toasts (imperative API over the design system's provider) ----------

let push: ((o: ToastOptions) => number) | null = null;
const queue: ToastOptions[] = [];

export function toast(message: ReactNode, opts: { action?: { label: string; run: () => void }; tone?: "default" | "danger"; duration?: number } = {}) {
  const o: ToastOptions = {
    title: message,
    tone: opts.tone === "danger" ? "danger" : "neutral",
    ...(opts.action ? { action: { label: opts.action.label, onClick: opts.action.run } } : {}),
    ...(opts.duration ? { duration: opts.duration } : {}),
  };
  if (push) push(o);
  else queue.push(o);
}

/** Mount once inside UIProvider: connects `toast()` to the design system's toast stack. */
export function Toaster() {
  const api = useToast();
  useEffect(() => {
    push = api.toast;
    while (queue.length) api.toast(queue.shift()!);
    return () => {
      push = null;
    };
  }, [api]);
  return null;
}
