import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Tabs as T } from "radix-ui";
import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { spring } from "../lib/tokens";

const ActiveContext = createContext<string | undefined>(undefined);

export interface TabsProps extends Omit<
  ComponentPropsWithoutRef<typeof T.Root>,
  "value" | "onValueChange"
> {
  value: string;
  onValueChange: (value: string) => void;
}

export function Tabs({ value, onValueChange, className, children, ...rest }: TabsProps) {
  const id = useId();
  return (
    <ActiveContext.Provider value={value}>
      <LayoutGroup id={id}>
        <T.Root
          value={value}
          onValueChange={onValueChange}
          className={cn("flex flex-col", className)}
          {...rest}
        >
          {children}
        </T.Root>
      </LayoutGroup>
    </ActiveContext.Provider>
  );
}

export function TabsList({ className, ...rest }: ComponentPropsWithoutRef<typeof T.List>) {
  return (
    <T.List
      className={cn("relative flex items-center gap-1 border-b border-hairline", className)}
      {...rest}
    />
  );
}

export interface TabProps extends ComponentPropsWithoutRef<typeof T.Trigger> {
  icon?: ReactNode;
  count?: number;
}

export function Tab({ value, icon, count, className, children, ...rest }: TabProps) {
  const active = useContext(ActiveContext) === value;
  const reduce = useReducedMotion();
  return (
    <T.Trigger
      value={value}
      className={cn(
        "relative -mb-px inline-flex h-9 select-none items-center gap-1.5 px-2.5 text-callout font-medium outline-none",
        "text-fg-secondary transition-colors duration-fast hover:text-fg data-[state=active]:text-fg",
        "focus-visible:focus-ring rounded-t-sm [&_svg]:size-4",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className="text-footnote tabular-nums text-fg-tertiary">{count}</span>
      )}
      {active && (
        <motion.span
          layoutId="tab-underline"
          transition={reduce ? { duration: 0 } : spring("snappy")}
          className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-fg"
        />
      )}
    </T.Trigger>
  );
}

export function TabPanel({ className, ...rest }: ComponentPropsWithoutRef<typeof T.Content>) {
  return <T.Content className={cn("pt-4 outline-none", className)} {...rest} />;
}
