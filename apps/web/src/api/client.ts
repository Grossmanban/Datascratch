import { classifyApiFailure, type DeviceRevokedReason } from "@datascratch/shared";
import { apiBase } from "@/config";
import type { ApiErrorCode, Session } from "@/lib/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** The server could not be reached (offline, DNS, CORS, server down). */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Network unavailable");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/**
 * D-53: the server said this device was disconnected from the account (401 `device_revoked`).
 * Not an expired token: the app wipes the device's data (TokenSource.deviceRevoked).
 */
export class DeviceRevokedError extends Error {
  constructor(readonly reason: DeviceRevokedReason) {
    super(`device revoked (${reason})`);
    this.name = "DeviceRevokedError";
  }
}

export type TokenSource = {
  get(): Session | null;
  refresh(): Promise<Session | null>;
  /** The server answered `device_revoked` (D-53): wipe local data. */
  deviceRevoked?(reason: DeviceRevokedReason): void;
};

/** A 401 that is `device_revoked` (classifyApiFailure, D-53): tell the app and throw. */
async function checkRevoked(res: Response) {
  if (res.status !== 401) return;
  const body = await res.clone().text().catch(() => "");
  const failure = classifyApiFailure(res.status, body);
  if (failure.kind !== "device_revoked") return;
  tokens?.deviceRevoked?.(failure.reason);
  throw new DeviceRevokedError(failure.reason);
}

let tokens: TokenSource | null = null;
export function setTokenSource(source: TokenSource | null) {
  tokens = source;
}

type RequestOptions = {
  auth?: boolean;
  body?: unknown;
  signal?: AbortSignal;
  raw?: boolean;
  /**
   * The write is safe to repeat (it sets a state, e.g. a notebook's mode): retried after a network
   * failure like a GET. Safari does not repeat a write itself when it went out on a connection the
   * server had already closed, and reports «Load failed».
   */
  retry?: boolean;
  /** Response timeout instead of the default (for a request the server itself works on a while). */
  timeoutMs?: number;
};

/**
 * From some networks a share of new HTTPS connections hangs in the TLS handshake. A request that
 * gets no response in time is abandoned (NetworkError, so writes stay queued in the outbox/ops),
 * and idempotent reads are retried at once with a short backoff.
 */
const RESPONSE_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const READ_RETRY_DELAYS_MS = [300, 1200];

class TimeoutError extends Error {
  constructor() {
    super("No response in time");
    this.name = "TimeoutError";
  }
}

async function doFetch(method: string, path: string, opts: RequestOptions, accessToken?: string): Promise<Response> {
  const idempotent = method === "GET" || method === "HEAD" || !!opts.retry;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(method, path, opts, accessToken);
    } catch (e) {
      const delay = READ_RETRY_DELAYS_MS[attempt];
      if (!idempotent || delay === undefined || !(e instanceof NetworkError) || opts.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * `fetch` with the same response timeout as API requests; GETs (and requests the caller marks
 * `retry`, i.e. safe to repeat) are retried after a network failure.
 */
export async function timedFetch(url: string, init: RequestInit = {}, opts: { retry?: boolean } = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const retry = opts.retry ?? method === "GET";
  const timeout = init.body instanceof Uint8Array ? UPLOAD_TIMEOUT_MS : RESPONSE_TIMEOUT_MS;
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError()), timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (e) {
      const delay = READ_RETRY_DELAYS_MS[attempt];
      if (!retry || delay === undefined) throw e;
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function fetchOnce(method: string, path: string, opts: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined && !(opts.body instanceof Uint8Array)) headers["content-type"] = "application/json";
  if (opts.body instanceof Uint8Array) headers["content-type"] = "application/octet-stream";
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  const controller = new AbortController();
  const onAbort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new TimeoutError()), opts.timeoutMs ?? (opts.body instanceof Uint8Array ? UPLOAD_TIMEOUT_MS : RESPONSE_TIMEOUT_MS));
  try {
    return await fetch(`${apiBase()}${path}`, {
      method,
      headers,
      body:
        opts.body === undefined
          ? undefined
          : opts.body instanceof Uint8Array
            ? (opts.body as BodyInit)
            : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (e) {
    // The caller's own abort stays an abort; our timeout is a network failure.
    if (opts.signal?.aborted) throw e;
    console.warn(`[ds] ${method} ${path} failed:`, (e as Error)?.name, (e as Error)?.message ?? e);
    throw new NetworkError(e);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(res.status, body.error?.code ?? "internal", body.error?.message ?? res.statusText);
  } catch {
    return new ApiError(res.status, res.status === 404 ? "not_found" : "internal", res.statusText);
  }
}

/** An API request with the session (refreshed as needed); the response is returned as is, whatever its status. */
export async function requestResponse(method: string, path: string, opts: RequestOptions = {}): Promise<Response> {
  const auth = opts.auth ?? true;
  let session = auth ? tokens?.get() ?? null : null;
  if (auth && session && Date.parse(session.accessExpiresAt) - Date.now() < 30_000) {
    session = (await tokens?.refresh()) ?? session;
  }
  let res = await doFetch(method, path, opts, session?.accessToken);
  // A disconnected device is not refreshed (the refresh would be refused the same way).
  await checkRevoked(res);
  if (res.status === 401 && auth && tokens) {
    const refreshed = await tokens.refresh();
    if (refreshed) res = await doFetch(method, path, opts, refreshed.accessToken);
    await checkRevoked(res);
  }
  return res;
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await requestResponse(method, path, opts);
  if (!res.ok) throw await toError(res);
  if (opts.raw) return (await res.arrayBuffer()) as T;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
  del: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("DELETE", path, { ...opts, body }),
};
