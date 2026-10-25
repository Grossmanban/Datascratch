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
  /** Set right after signup until the user confirms they saved the recovery key. */
  pendingRecoveryKey: string | null;
};

export const useAuth = create<AuthState>(() => ({
  status: "loading",
  userId: null,
  email: null,
  accountDocId: null,
  pendingRecoveryKey: null,
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

async function persist() {
  const st = useAuth.getState();
  if (!session || !masterKey || !st.userId || !st.email) return;
  const stored: StoredAccount = {
    userId: st.userId,
    email: st.email,
    session,
    masterKey: await sealLocal(masterKey),
  };
  await kvSet("account", stored);
}

async function refresh(): Promise<Session | null> {
  if (!session) return null;
  if (!refreshing) {
    const token = session.refreshToken;
    refreshing = authApi
      .refresh(token)
      .then(async (next) => {
        session = { ...next, wrappedMasterKeyPassword: next.wrappedMasterKeyPassword ?? session?.wrappedMasterKeyPassword };
        await persist();
        return session;
      })
      .catch(async (e) => {
        if (e instanceof ApiError && (e.status === 401 || e.code === "unauthorized")) {
          // Refresh token revoked (device removed elsewhere) → sign out locally.
          await signOutLocal();
          return null;
        }
        return session;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
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
  useAuth.setState({
    status: "ready",
    userId: params.userId,
    email: params.email,
    accountDocId: params.session.accountDocId,
    pendingRecoveryKey: params.pendingRecoveryKey ?? null,
  });
  await persist();
  if (params.pendingRecoveryKey) {
    await kvSet("pendingRecovery", await sealLocal(new TextEncoder().encode(params.pendingRecoveryKey)));
    await kvSet("freshAccount", params.userId);
  }
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
    const pending = await kvGet<SealedBlob>("pendingRecovery");
    useAuth.setState({
      status: "ready",
      userId: stored.userId,
      email: stored.email,
      accountDocId: stored.session.accountDocId,
      pendingRecoveryKey: pending ? new TextDecoder().decode(await openLocal(pending)) : null,
    });
  } catch (e) {
    console.error("Failed to restore session", e);
    useAuth.setState({ status: "signedOut" });
  }
}

export async function confirmRecoveryKeySaved() {
  await kvDelete("pendingRecovery");
  useAuth.setState({ pendingRecoveryKey: null });
}

async function signOutLocal() {
  const userId = useAuth.getState().userId;
  for (const fn of signedOutListeners) fn();
  session = null;
  masterKey?.fill(0);
  masterKey = null;
  await kvDelete("account");
  await kvDelete("pendingRecovery");
  if (userId) await deleteAccountDb(userId);
  useAuth.setState({ status: "signedOut", userId: null, email: null, accountDocId: null, pendingRecoveryKey: null });
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
