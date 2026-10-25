// Recovery key after signup (spec/07, coordinator decision "option A"): the key lives sealed
// on the device it was created on; whether the user confirmed saving it lives in the account
// doc (`settings.recoveryKeyConfirmed`, document-model.md) so the reminder clears everywhere.
import { accountApi, authApi } from "@/api/endpoints";
import { hasRuntime } from "@/data/runtime";
import { setSetting } from "@/domain/actions";
import { useWorkspace } from "@/domain/workspace";
import { fromBase64Url, rotateRecoveryKey } from "@/lib/shared";
import { deriveKeys } from "./kdf";
import {
  forgetRecoveryKey,
  getMasterKey,
  getSession,
  onRecoveryConfirmed,
  recoveryConfirmedLocally,
  recoveryKeyStoredAt,
  storeRecoveryKey,
  useAuth,
} from "./session";

const FLAG = "recoveryKeyConfirmed";

/** True while the current recovery key is not confirmed (only `false` counts: older accounts have no flag). */
export function useRecoveryUnconfirmed(): boolean {
  return useWorkspace((s) => s.account.settings[FLAG] === false);
}

/** Once the account doc is live: apply what the signup screen noted on this device. */
export async function syncRecoveryFlag() {
  if (!hasRuntime()) return;
  const local = await recoveryConfirmedLocally();
  const flag = useWorkspace.getState().account.settings[FLAG];
  if (local === true && flag !== true) setSetting(FLAG, true);
  if (local === false && flag === undefined) setSetting(FLAG, false);
}

onRecoveryConfirmed((confirmed) => {
  if (hasRuntime()) setSetting(FLAG, confirmed);
});

/** A new recovery key (crypto.md §4), from any device; needs the current password. */
export async function createNewRecoveryKey(password: string): Promise<string> {
  const { email, userId } = useAuth.getState();
  if (!email || !userId) throw new Error("Not signed in");
  const pre = await authApi.prelogin(email);
  const { loginKey } = await deriveKeys(password, fromBase64Url(pre.salt), pre.kdf);
  const rotated = await rotateRecoveryKey(getMasterKey(), loginKey, userId);
  await authApi.rotateRecoveryKey(rotated.body);
  await storeRecoveryKey(rotated.recoveryKeyText);
  if (hasRuntime()) setSetting(FLAG, false);
  return rotated.recoveryKeyText;
}

/** The key stored here was replaced on another device (security log): forget the stale one. */
export async function dropStaleRecoveryKey(): Promise<void> {
  if (!useAuth.getState().recoveryOnDevice) return;
  const storedAt = await recoveryKeyStoredAt();
  const me = getSession()?.deviceId ?? null;
  const events = await accountApi.securityEvents().catch(() => null);
  if (!events) return;
  const replaced = events.some(
    (e) => e.kind === "recovery_key_rotated" && e.deviceId !== me && (!storedAt || Date.parse(e.at) > Date.parse(storedAt)),
  );
  if (replaced) await forgetRecoveryKey();
}
