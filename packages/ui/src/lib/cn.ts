import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the token-based font-size names so `text-body` and
// `text-fg` are not treated as conflicting.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title", "h1", "h2", "h3", "body", "callout", "footnote", "caption"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
