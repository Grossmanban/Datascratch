// Minimal typed REST transport (api.md): JSON bodies, Bearer auth, failures
// classified with classifyApiFailure so callers can tell a revoked device
// from an expired token or a network error.
import type { z } from "zod";
import {
  API_PREFIX,
  API_ROUTES,
  classifyApiFailure,
  type ApiFailure,
  type ApiRouteName,
} from "../contracts/api.js";

export interface HttpClientOptions {
  /** Server origin, e.g. `https://ds.example.com` (the `/v1` prefix is added). */
  baseUrl: string;
  /** Current access token; refreshing it is the app's job. */
  accessToken: () => string | Promise<string>;
  fetch?: typeof fetch;
}

export class ApiRequestError extends Error {
  constructor(
    readonly route: ApiRouteName,
    readonly failure: ApiFailure,
  ) {
    super(
      `${route}: ${failure.kind}${failure.kind === "error" ? ` ${failure.status} ${failure.message}` : ""}`,
    );
    this.name = "ApiRequestError";
  }

  /** HTTP status, or null for network failures. */
  get status(): number | null {
    if (this.failure.kind === "error") return this.failure.status;
    if (this.failure.kind === "network") return null;
    return 401;
  }
}

export type HttpClient = <T = void>(
  route: ApiRouteName,
  options?: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
    /** Response schema; omitted = no body expected. */
    schema?: z.ZodType<T>;
    /** Statuses answered with `null` instead of an error (e.g. 404). */
    nullOn?: number[];
  },
) => Promise<T>;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.baseUrl.replace(/\/+$/, "") + API_PREFIX;
  return async (route, { params = {}, query, body, schema, nullOn } = {}) => {
    const { method, path } = API_ROUTES[route];
    const filled = path.replace(/:(\w+)/g, (_, name: string) => {
      const value = params[name];
      if (value === undefined) throw new Error(`${route}: missing path parameter ${name}`);
      return encodeURIComponent(value);
    });
    const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
    const headers: Record<string, string> = {
      authorization: `Bearer ${await options.accessToken()}`,
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    let res: Response;
    try {
      res = await doFetch(base + filled + qs, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
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
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiRequestError(route, {
        kind: "error",
        status: res.status,
        code: null,
        message: `invalid response: ${parsed.error.message}`,
      });
    }
    return parsed.data;
  };
}
