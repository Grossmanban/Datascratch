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

export type TokenSource = {
  get(): Session | null;
  refresh(): Promise<Session | null>;
};

let tokens: TokenSource | null = null;
export function setTokenSource(source: TokenSource | null) {
  tokens = source;
}

type RequestOptions = { auth?: boolean; body?: unknown; signal?: AbortSignal; raw?: boolean };

async function doFetch(method: string, path: string, opts: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined && !(opts.body instanceof Uint8Array)) headers["content-type"] = "application/json";
  if (opts.body instanceof Uint8Array) headers["content-type"] = "application/octet-stream";
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
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
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new NetworkError(e);
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

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;
  let session = auth ? tokens?.get() ?? null : null;
  if (auth && session && Date.parse(session.accessExpiresAt) - Date.now() < 30_000) {
    session = (await tokens?.refresh()) ?? session;
  }
  let res = await doFetch(method, path, opts, session?.accessToken);
  if (res.status === 401 && auth && tokens) {
    const refreshed = await tokens.refresh();
    if (refreshed) res = await doFetch(method, path, opts, refreshed.accessToken);
  }
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
