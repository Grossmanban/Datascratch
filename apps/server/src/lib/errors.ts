export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'device_revoked'
  | 'internal';

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  device_revoked: 401,
  internal: 500,
};

/** An error with a contract error code (api.md, "Ошибки"). */
export class ApiError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: ApiErrorCode,
    message: string = code,
    /** Extra detail for the client (device_revoked: why). */
    readonly reason?: string,
    /** rate_limited: when to try again. */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.statusCode = STATUS[code];
  }
}

/** Why a device stopped working; the client wipes its local data (api.md, «Аутентификация»). */
export type RevokeReason = 'user' | 'password_change' | 'recovery' | 'token_reuse' | 'account_deleted';

export const deviceRevoked = (reason: RevokeReason) =>
  new ApiError('device_revoked', 'this device was signed out; local data must be removed', reason);

export const badRequest = (m?: string) => new ApiError('bad_request', m);
export const unauthorized = (m?: string) => new ApiError('unauthorized', m);
export const forbidden = (m?: string) => new ApiError('forbidden', m);
export const notFound = (m?: string) => new ApiError('not_found', m);
export const conflict = (m?: string) => new ApiError('conflict', m);
