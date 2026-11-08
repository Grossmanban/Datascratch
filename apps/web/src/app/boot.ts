/**
 * Tells the boot screen (public/boot-anim.js) that the app knows what to show, so the launch
 * animation can hand off to it. Without the script (it failed to load) the boot screen is
 * simply removed, so it can never cover the app.
 */
export function bootReady() {
  const w = window as unknown as { __dsBootReady?: () => void };
  if (w.__dsBootReady) w.__dsBootReady();
  else document.getElementById("ds-boot")?.remove();
}

/** Marks an element as the place the launch animation's mark flies to. */
export const BOOT_TARGET = { "data-ds-boot-target": "" } as const;

/** The boot screen is still up: the first screen should not run an entrance of its own (the hand-off is it). */
export const underBootScreen = () => typeof document !== "undefined" && !!document.getElementById("ds-boot");
