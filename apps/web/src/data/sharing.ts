// D-54 account sharing: core's sharing client (packages/shared/sharing) over this app's REST layer,
// so its calls share the session refresh and the device_revoked handling (api/client.ts).
import {
  API_ROUTES,
  ApiRequestError,
  classifyApiFailure,
  createSharingApi,
  ensureAccountKeyPair,
  type BoxKeyPair,
  type HttpClient,
} from "@datascratch/shared";
import { DeviceRevokedError, requestResponse } from "@/api/client";
import { getMasterKey, useAuth } from "@/auth/session";

const http: HttpClient = async (route, { params = {}, query, body, schema, nullOn } = {}) => {
  const { method, path } = API_ROUTES[route];
  const filled = path.replace(/:(\w+)/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`${route}: missing path parameter ${name}`);
    return encodeURIComponent(value);
  });
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  let res: Response;
  try {
    res = await requestResponse(method, filled + qs, { body });
  } catch (e) {
    if (e instanceof DeviceRevokedError) throw new ApiRequestError(route, { kind: "device_revoked", reason: e.reason });
    throw new ApiRequestError(route, classifyApiFailure(null, null));
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    if (nullOn?.includes(res.status)) return null as never;
    throw new ApiRequestError(route, classifyApiFailure(res.status, text));
  }
  if (!schema) return undefined as never;
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    throw new ApiRequestError(route, { kind: "error", status: res.status, code: null, message: `invalid response: ${parsed.error.message}` });
  return parsed.data;
};

export const sharingApi = createSharingApi(http);

let boxKeys: Promise<BoxKeyPair> | null = null;
let boxKeysOf: string | null = null;

/**
 * This account's key pair (crypto.md §10.1): published on first use (a new account, or the first
 * sign-in of an account made before D-54), then read back. Kept for the session; a failed attempt
 * (offline) is retried on the next call.
 */
export function accountBoxKeys(): Promise<BoxKeyPair> {
  const userId = useAuth.getState().userId;
  if (!userId) return Promise.reject(new Error("not signed in"));
  if (boxKeys && boxKeysOf === userId) return boxKeys;
  boxKeysOf = userId;
  boxKeys = ensureAccountKeyPair(sharingApi, userId, getMasterKey()).catch((e) => {
    boxKeys = null;
    throw e;
  });
  return boxKeys;
}

/** Signing out: the pair leaves memory with the rest of the account's keys. */
export function forgetBoxKeys() {
  void boxKeys?.then((p) => p.secretKey.fill(0)).catch(() => undefined);
  boxKeys = null;
  boxKeysOf = null;
}
