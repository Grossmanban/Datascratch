import { create } from "zustand";
import { authApi } from "@/api/endpoints";
import { ApiError, setTokenSource } from "@/api/client";
import { accountDb, closeAccountDb, deleteAccountDb, hasAccountDb, kvDelete, kvGet, kvSet, openAccountDb } from "@/data/db";
import type { Session } from "@/lib/shared";
import { openLocal, sealLocal, type SealedBlob } from "./deviceKey";
import { StageTimeout, withTimeout } from "@/lib/timeout";

type StoredAccount = { userId: string; email: string; session: Session; masterKey: SealedBlob };

export type AuthStatus = "loading" | "signedOut" | "ready";

/**
 * This device was signed out from elsewhere (device revoked: refresh answers 401). Its local
 * data — unsent changes included — stays until the next sign-in, which sends it (same account)
 * or deletes it (another account), or until the user deletes it from the login screen.
 */
export type RevokedInfo = { userId: string; email: string; at: string; unsent: number };

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
  /** Set on the login screen after a revocation (see RevokedInfo). */
  revoked: RevokedInfo | null;
  /**
   * Opening the saved session did not finish (device storage or key unsealing hung, e.g. in an
   * in-app browser): the stage that hung. The saved session is kept; signing in works anyway.
   */
  restoreFailed: string | null;
};

export const useAuth = create<AuthState>(() => ({
  status: "loading",
  userId: null,
  email: null,
  accountDocId: null,
  recoveryStep: false,
  recoveryOnDevice: false,
  revoked: null,
  restoreFailed: null,
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
  try {
    await persistNow(who);
  } catch (e) {
    // Device storage unavailable or hung: this tab keeps working with the session in memory.
    console.warn("[ds] could not store the session on this device", e);
  }
}

async function persistNow(who: { userId: string | null; email: string | null }) {
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
          // Refresh token revoked (session ended from another device): leave, keeping local data.
          await endRevoked();
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
  // Data left by a revoked session: kept for the same account (its unsent changes go out now),
  // deleted for another one.
  const revoked = await kvGet<RevokedInfo>("revoked").catch(() => undefined);
  if (revoked) {
    if (revoked.userId !== params.userId) await forgetLocalData(revoked.userId);
    await kvDelete("revoked");
  }
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
    revoked: null,
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

/** Opening the saved session gives up after this, instead of an endless splash. */
const RESTORE_TIMEOUT_MS = 6_000;
let restoreAttempt = 0;

export async function restore(): Promise<void> {
  const attempt = ++restoreAttempt;
  let stage = "start";
  const step = <T,>(name: string, p: Promise<T>) => {
    stage = name;
    return p;
  };
  try {
    await withTimeout(restoreSteps(step, () => attempt === restoreAttempt), RESTORE_TIMEOUT_MS, "restore");
  } catch (e) {
    if (attempt !== restoreAttempt) return;
    const hung = e instanceof StageTimeout ? stage : `${stage}: ${(e as Error)?.message ?? e}`;
    console.error(`[ds] restoring the session failed at «${hung}»`, e);
    restoreAttempt++; // a late finish of the abandoned attempt must not flip the state back
    session = null;
    masterKey = null;
    useAuth.setState({ status: "signedOut", restoreFailed: hung });
  }
}

/** «Войти заново» on the splash: stop waiting and show the login screen (the saved session stays). */
export function abandonRestore(stage = "splash") {
  if (useAuth.getState().status !== "loading") return;
  restoreAttempt++;
  useAuth.setState({ status: "signedOut", restoreFailed: stage });
}

async function restoreSteps(step: <T>(name: string, p: Promise<T>) => Promise<T>, current: () => boolean): Promise<void> {
  {
    const stored = await step("device storage", kvGet<StoredAccount>("account"));
    if (!current()) return;
    if (!stored) {
      useAuth.setState({ status: "signedOut", revoked: (await kvGet<RevokedInfo>("revoked").catch(() => undefined)) ?? null });
      return;
    }
    const key = await step("device key", openLocal(stored.masterKey));
    if (!current()) return;
    masterKey = key;
    session = stored.session;
    openAccountDb(stored.userId);
    // Before the key became optional to confirm it was kept only while pending.
    const legacy = await step("recovery key", kvGet<SealedBlob>("pendingRecovery"));
    if (legacy) {
      await kvSet("recoveryKey", legacy);
      await kvSet("recoveryConfirmed", false);
      await kvSet("recoveryStep", true);
      await kvDelete("pendingRecovery");
    }
    const hasKey = !!(await kvGet<SealedBlob>("recoveryKey"));
    const recoveryStep = hasKey && !!(await kvGet<boolean>("recoveryStep"));
    if (!current()) return;
    useAuth.setState({
      status: "ready",
      userId: stored.userId,
      email: stored.email,
      accountDocId: stored.session.accountDocId,
      recoveryStep,
      recoveryOnDevice: hasKey,
      restoreFailed: null,
    });
  }
}

async function endRevoked() {
  const { userId, email } = useAuth.getState();
  let unsent = 0;
  if (hasAccountDb()) {
    const db = accountDb();
    unsent = await Promise.all([db.syncOutbox.count(), db.ops.count()]).then(([a, b]) => a + b, () => 0);
  }
  const info: RevokedInfo | null = userId && email ? { userId, email, at: new Date().toISOString(), unsent } : null;
  for (const fn of signedOutListeners) fn();
  session = null;
  masterKey?.fill(0);
  masterKey = null;
  await kvDelete("account");
  if (info) await kvSet("revoked", info);
  closeAccountDb();
  useAuth.setState({ status: "signedOut", userId: null, email: null, accountDocId: null, recoveryStep: false, recoveryOnDevice: false, revoked: info });
}

async function forgetLocalData(userId: string) {
  for (const k of ["pendingRecovery", "recoveryKey", "recoveryKeyAt", "recoveryConfirmed", "recoveryStep"]) await kvDelete(k);
  await deleteAccountDb(userId);
}

/** «Удалить данные с этого устройства» after a revocation (e.g. the device was lost). */
export async function forgetRevokedData() {
  const revoked = await kvGet<RevokedInfo>("revoked");
  if (revoked) await forgetLocalData(revoked.userId);
  await kvDelete("revoked");
  useAuth.setState({ revoked: null });
}

async function signOutLocal() {
  const userId = useAuth.getState().userId;
  for (const fn of signedOutListeners) fn();
  session = null;
  masterKey?.fill(0);
  masterKey = null;
  await kvDelete("account");
  if (userId) await forgetLocalData(userId);
  useAuth.setState({ status: "signedOut", userId: null, email: null, accountDocId: null, recoveryStep: false, recoveryOnDevice: false, revoked: null });
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
