import { Popover as P } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof P.Content>
>(function PopoverContent(
  { className, sideOffset = 8, collisionPadding = 12, align = "start", ...rest },
  ref,
) {
  return (
    <P.Portal>
      <P.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        align={align}
        className={cn(
          "glass animate-pop z-50 rounded-lg p-3 text-callout text-fg outline-none",
          className,
        )}
        {...rest}
      />
    </P.Portal>
  );
});
