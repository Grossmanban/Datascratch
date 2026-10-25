// Shared look for DropdownMenu and ContextMenu (Radix data attributes).
export const menuContent =
  "glass animate-pop z-50 min-w-[200px] overflow-hidden rounded-lg p-1 text-callout text-fg outline-none";

export const menuItem =
  "group relative flex h-8 cursor-default select-none items-center gap-2.5 rounded-[7px] px-2 outline-none " +
  "data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-40 " +
  "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-fg-secondary data-[highlighted]:[&>svg]:text-fg";

export const menuItemDanger = "text-danger [&>svg]:!text-danger data-[highlighted]:bg-danger-soft";

export const menuLabel =
  "px-2 pb-1 pt-2 text-caption font-medium uppercase tracking-[0.04em] text-fg-tertiary";
export const menuSeparator = "-mx-1 my-1 h-px bg-separator";
export const menuShortcut = "ml-auto pl-4 text-footnote text-fg-tertiary";
