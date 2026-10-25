import { tokens, type MotionName, type TintName } from "@datascratch/design-tokens";
import type { Transition } from "motion/react";

export type { TintName, BackdropName, InkName } from "@datascratch/design-tokens";
export { tintNames, backdropNames } from "@datascratch/design-tokens";

/** Motion spring equivalent to the SwiftUI spring of the same name. */
export function spring(name: MotionName): Transition {
  const { visualDuration, bounce } = tokens.motion[name].web;
  return { type: "spring", visualDuration, bounce };
}

export const tintFg = (tint: TintName): string => `var(--ds-tint-${tint}-fg)`;
export const tintBg = (tint: TintName): string => `var(--ds-tint-${tint}-bg)`;

/** Stable tint for an arbitrary string (avatars, untagged colours). */
export function tintFor(seed: string): TintName {
  const palette: TintName[] = [
    "red",
    "orange",
    "yellow",
    "green",
    "teal",
    "blue",
    "indigo",
    "purple",
    "pink",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}
