import { create } from "zustand";
import { authApi } from "@/api/endpoints";
import { ApiError, setTokenSource } from "@/api/client";
import { deleteAccountDb, kvDelete, kvGet, kvSet, openAccountDb } from "@/data/db";
import type { Session } from "@/lib/shared";
import { openLocal, sealLocal, type SealedBlob } from "./deviceKey";

type StoredAccount = { userId: string; email: string; session: Session; masterKey: SealedBlob };

export type AuthStatus = "loading" | "signedOut" | "ready";

type AuthState = {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  accountDocId: string | null;
  /** Right after signup: the recovery key screen is shown (until confirmed or skipped). */
  recoveryStep: boolean;
  /**
   * The current recovery key is stored (sealed) on this device — the device it was created
   * on (spec/07, option A). Whether it is confirmed lives in the account doc
   * (`settings.recoveryKeyConfirmed`), see auth/recovery.ts.
   */
  recoveryOnDevice: boolean;
};

export const useAuth = create<AuthState>(() => ({
  status: "loading",
  userId: null,
  email: null,
  accountDocId: null,
  recoveryStep: false,
  recoveryOnDevice: false,
}));

// Secrets live only in module memory (and sealed in IndexedDB), never in React state.
let session: Session | null = null;
let masterKey: Uint8Array | null = null;
let refreshing: Promise<Session | null> | null = null;
const signedOutListeners = new Set<() => void>();

export function getSession(): Session | null {
  return session;
}

export function getMasterKey(): Uint8Array {
  if (!masterKey) throw new Error("Not signed in");
  return masterKey;
}

export function onSignedOut(fn: () => void): () => void {
  signedOutListeners.add(fn);
  return () => signedOutListeners.delete(fn);
}

async function persist(who: { userId: string | null; email: string | null } = useAuth.getState()) {
  if (!session || !masterKey || !who.userId || !who.email) return;
  const stored: StoredAccount = {
    userId: who.userId,
    email: who.email,
    session,
    masterKey: await sealLocal(masterKey),
  };
  await kvSet("account", stored);
}

async function refresh(): Promise<Session | null> {
  if (!session) return null;
  if (!refreshing) {
    refreshing = withRefreshLock(async () => {
      if (!session) return null;
      // The server treats a reused refresh token as theft and revokes the device. Tabs of this
      // app share one session: if another tab already rotated it, take its result instead.
      const stored = await kvGet<StoredAccount>("account");
      if (stored && stored.userId === useAuth.getState().userId && stored.session.refreshToken !== session.refreshToken) {
        session = stored.session;
        return session;
      }
      try {
        const next = await authApi.refresh(session.refreshToken);
        session = { ...next, wrappedMasterKeyPassword: next.wrappedMasterKeyPassword ?? session?.wrappedMasterKeyPassword };
        await persist();
        return session;
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.code === "unauthorized")) {
          // Refresh token revoked (device removed elsewhere) → sign out locally.
          await signOutLocal();
          return null;
        }
        return session;
      }
    }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** One refresh at a time across this app's tabs (Web Locks; plain call where unsupported). */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request("ds-session-refresh", fn) as Promise<T>) : fn();
}

setTokenSource({ get: () => session, refresh });

export const refreshSession = refresh;

export async function establish(params: {
  userId: string;
  email: string;
  session: Session;
  masterKey: Uint8Array;
  pendingRecoveryKey?: string;
}) {
  session = params.session;
  masterKey = params.masterKey;
  openAccountDb(params.userId);
  if (params.pendingRecoveryKey) {
    // Kept sealed on this device so it can be shown again from the settings (spec/07).
    // Written before the state flips: the key screen reads it as soon as it mounts.
    await storeRecoveryKey(params.pendingRecoveryKey);
    await kvSet("recoveryStep", true);
    await kvSet("freshAccount", params.userId);
  }
  // Stored before the state flips: "ready" navigates into the app, and a reload right after
  // must find the session (otherwise the device is back on the login screen).
  await persist(params);
  useAuth.setState({
    status: "ready",
    userId: params.userId,
    email: params.email,
    accountDocId: params.session.accountDocId,
    recoveryStep: !!params.pendingRecoveryKey,
    recoveryOnDevice: !!params.pendingRecoveryKey,
  });
}

/** The recovery key, if it is stored on this device. */
export async function getRecoveryKey(): Promise<string | null> {
  const sealed = await kvGet<SealedBlob>("recoveryKey");
  return sealed ? new TextDecoder().decode(await openLocal(sealed)) : null;
}

/**
 * Keep a recovery key sealed on this device. `recoveryConfirmed` mirrors the account flag
 * until the account doc can take it (the signup screen runs before the account syncs).
 */
export async function storeRecoveryKey(text: string) {
  await kvSet("recoveryKey", await sealLocal(new TextEncoder().encode(text)));
  await kvSet("recoveryKeyAt", new Date().toISOString());
  await kvSet("recoveryConfirmed", false);
  useAuth.setState({ recoveryOnDevice: true });
}

/** When this device's key was stored (to notice a rotation made elsewhere). */
export async function recoveryKeyStoredAt(): Promise<string | null> {
  return (await kvGet<string>("recoveryKeyAt")) ?? null;
}

/** The key here was replaced on another device: it no longer works, forget it. */
export async function forgetRecoveryKey() {
  for (const k of ["recoveryKey", "recoveryKeyAt", "recoveryConfirmed"]) await kvDelete(k);
  useAuth.setState({ recoveryOnDevice: false });
}

/** Device-side note that the user confirmed (applied to the account doc by auth/recovery.ts). */
export async function recoveryConfirmedLocally(): Promise<boolean | null> {
  return (await kvGet<boolean>("recoveryConfirmed")) ?? null;
}

/** The user typed the end of the key back: it is written down. */
export async function confirmRecoveryKeySaved() {
  await kvSet("recoveryConfirmed", true);
  await kvDelete("recoveryStep");
  useAuth.setState({ recoveryStep: false });
  recoveryListeners.forEach((fn) => fn(true));
}

const recoveryListeners = new Set<(confirmed: boolean) => void>();
/** The account doc subscribes here to store `settings.recoveryKeyConfirmed`. */
export function onRecoveryConfirmed(fn: (confirmed: boolean) => void) {
  recoveryListeners.add(fn);
  return () => recoveryListeners.delete(fn);
}

/** "Skip" on the signup screen: the settings keep a gentle reminder. */
export async function skipRecoveryStep() {
  await kvDelete("recoveryStep");
  useAuth.setState({ recoveryStep: false });
}

/** True once for an account created on this device (so the shell creates the default space). */
export async function consumeFreshAccount(userId: string): Promise<boolean> {
  const v = await kvGet<string>("freshAccount");
  if (v !== userId) return false;
  await kvDelete("freshAccount");
  return true;
}

export async function updateSession(next: Session) {
  session = next;
  await persist();
}

export async function restore(): Promise<void> {
  try {
    const stored = await kvGet<StoredAccount>("account");
    if (!stored) {
      useAuth.setState({ status: "signedOut" });
      return;
    }
    masterKey = await openLocal(stored.masterKey);
    session = stored.session;
    openAccountDb(stored.userId);
    // Before the key became optional to confirm it was kept only while pending.
    const legacy = await kvGet<SealedBlob>("pendingRecovery");
    if (legacy) {
      await kvSet("recoveryKey", legacy);
      await kvSet("recoveryConfirmed", false);
      await kvSet("recoveryStep", true);
      await kvDelete("pendingRecovery");
    }
    const hasKey = !!(await kvGet<SealedBlob>("recoveryKey"));
    useAuth.setState({
      status: "ready",
      userId: stored.userId,
      email: stored.email,
      accountDocId: stored.session.accountDocId,
      recoveryStep: hasKey && !!(await kvGet<boolean>("recoveryStep")),
      recoveryOnDevice: hasKey,
    });
  } catch (e) {
    console.error("Failed to restore session", e);
    useAuth.setState({ status: "signedOut" });
  }
}

async function signOutLocal() {
  const userId = useAuth.getState().userId;
  for (const fn of signedOutListeners) fn();
  session = null;
  masterKey?.fill(0);
  masterKey = null;
  await kvDelete("account");
  for (const k of ["pendingRecovery", "recoveryKey", "recoveryKeyAt", "recoveryConfirmed", "recoveryStep"]) await kvDelete(k);
  if (userId) await deleteAccountDb(userId);
  useAuth.setState({ status: "signedOut", userId: null, email: null, accountDocId: null, recoveryStep: false, recoveryOnDevice: false });
}

export async function signOut() {
  const token = session?.refreshToken;
  if (token) {
    try {
      await authApi.logout(token);
    } catch {
      // Offline logout still wipes local data; the server session expires on its own.
    }
  }
  await signOutLocal();
}
