import { isSharedRefNew, markSharedRefOpened, type SharedRef } from "@datascratch/shared";
import { useWorkspace } from "@/domain/workspace";
import { runtime } from "./runtime";

// D-63 «Поделились со мной»: an item is new (bold, a dot, counted in the switcher) until it is
// first opened on any device — `SharedRef.openedAt` in the account document.

/** What was shared before this section existed is not all «new» at once. */
const SECTION_SINCE = Date.parse("2026-11-08T00:00:00Z");

export function isSharedNew(ref: Pick<SharedRef, "openedAt" | "addedAt">): boolean {
  return isSharedRefNew(ref) && Date.parse(ref.addedAt) >= SECTION_SINCE;
}

/** Opened here: the account document remembers it for every device. */
export function markSharedOpened(kind: SharedRef["kind"], id: string) {
  const ref = useWorkspace.getState().account.shared.find((r) => r.kind === kind && r.id === id);
  if (!ref || ref.openedAt) return;
  const rt = runtime();
  rt.account.transact(() => markSharedRefOpened(rt.account, kind, id));
}

/** `kind:id` of a shared item, as in `account.shared`. */
export const sharedKey = (kind: "notebook" | "note", id: string) => `${kind}:${id}`;
