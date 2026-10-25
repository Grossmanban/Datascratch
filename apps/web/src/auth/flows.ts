import { authApi } from "@/api/endpoints";
import {
  ad,
  DEFAULT_KDF,
  decodeRecoveryKey,
  encodeRecoveryKey,
  fromBase64Url,
  randomKey,
  randomSalt,
  recoveryLoginKey,
  toBase64Url,
  unwrapKey,
  uuidv7,
  wrapKey,
  type KdfParams,
} from "@/lib/shared";
import { deviceName } from "./deviceKey";
import { deriveKeys } from "./kdf";
import { establish, getMasterKey, getSession, updateSession, useAuth } from "./session";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Registration (crypto.md §1–4). Returns the recovery key to show once. */
export async function signUp(emailRaw: string, password: string, kdf: KdfParams = DEFAULT_KDF): Promise<string> {
  const email = normalizeEmail(emailRaw);
  const salt = randomSalt();
  const { loginKey, passwordKey } = await deriveKeys(password, salt, kdf);
  const masterKey = randomKey();
  const recoveryKey = randomKey();
  const userId = uuidv7();
  const accountDocId = uuidv7();
  const session = await authApi.signup({
    email,
    salt: toBase64Url(salt),
    kdf,
    loginKey: toBase64Url(loginKey),
    recoveryLoginKey: toBase64Url(await recoveryLoginKey(recoveryKey)),
    wrappedMasterKeyPassword: await wrapKey(passwordKey, masterKey, ad.masterPassword(userId)),
    wrappedMasterKeyRecovery: await wrapKey(recoveryKey, masterKey, ad.masterRecovery(userId)),
    userId,
    accountDocId,
  });
  const recoveryText = encodeRecoveryKey(recoveryKey);
  await establish({ userId: session.userId, email, session, masterKey, pendingRecoveryKey: recoveryText });
  return recoveryText;
}

export async function signIn(emailRaw: string, password: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const pre = await authApi.prelogin(email);
  const { loginKey, passwordKey } = await deriveKeys(password, fromBase64Url(pre.salt), pre.kdf);
  const session = await authApi.login(email, toBase64Url(loginKey), deviceName());
  const masterKey = await unwrapKey(passwordKey, session.wrappedMasterKeyPassword, ad.masterPassword(session.userId));
  await establish({ userId: session.userId, email, session, masterKey });
}

/** Proves knowledge of the recovery key, then sets a new password (crypto.md §4). */
export async function recoverAccount(emailRaw: string, recoveryText: string, newPassword: string): Promise<void> {
  const email = normalizeEmail(emailRaw);
  const recoveryKey = decodeRecoveryKey(recoveryText);
  const start = await authApi.recoveryStart(email, toBase64Url(await recoveryLoginKey(recoveryKey)));
  const masterKey = await unwrapKey(recoveryKey, start.wrappedMasterKeyRecovery, ad.masterRecovery(start.userId));
  const salt = randomSalt();
  const kdf = DEFAULT_KDF;
  const { loginKey, passwordKey } = await deriveKeys(newPassword, salt, kdf);
  const session = await authApi.recoveryFinish({
    recoveryToken: start.recoveryToken,
    salt: toBase64Url(salt),
    kdf,
    loginKey: toBase64Url(loginKey),
    wrappedMasterKeyPassword: await wrapKey(passwordKey, masterKey, ad.masterPassword(start.userId)),
  });
  await establish({ userId: session.userId, email, session, masterKey });
}

/** Re-wraps only the master key (crypto.md §5). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { email, userId } = useAuth.getState();
  if (!email || !userId) throw new Error("Not signed in");
  const pre = await authApi.prelogin(email);
  const current = await deriveKeys(currentPassword, fromBase64Url(pre.salt), pre.kdf);
  const salt = randomSalt();
  const kdf = DEFAULT_KDF;
  const next = await deriveKeys(newPassword, salt, kdf);
  const wrapped = await wrapKey(next.passwordKey, getMasterKey(), ad.masterPassword(userId));
  await authApi.changePassword({
    currentLoginKey: toBase64Url(current.loginKey),
    salt: toBase64Url(salt),
    kdf,
    loginKey: toBase64Url(next.loginKey),
    wrappedMasterKeyPassword: wrapped,
  });
  const s = getSession();
  if (s) await updateSession({ ...s, wrappedMasterKeyPassword: wrapped });
}

/** Proves the password locally (for destructive confirmations such as account deletion). */
export async function loginKeyFor(password: string): Promise<string> {
  const { email } = useAuth.getState();
  if (!email) throw new Error("Not signed in");
  const pre = await authApi.prelogin(email);
  const { loginKey } = await deriveKeys(password, fromBase64Url(pre.salt), pre.kdf);
  return toBase64Url(loginKey);
}
