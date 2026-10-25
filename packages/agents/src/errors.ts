/** Error codes shared with the server REST API (contracts/api.md) plus agent-specific ones. */
export type AgentErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "payload_too_large"
  | "internal";

const STATUS: Record<AgentErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  internal: 500,
};

/**
 * An error meant to be shown to the agent. Messages are written for a model:
 * they say what went wrong and what to do instead.
 */
export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly status: number;
  readonly retryAfterSec: number | undefined;

  constructor(code: AgentErrorCode, message: string, options: { retryAfterSec?: number } = {}) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.status = STATUS[code];
    this.retryAfterSec = options.retryAfterSec;
  }
}

export function toAgentError(err: unknown): AgentError {
  if (err instanceof AgentError) return err;
  return new AgentError("internal", "Internal error while processing the request. Try again later.");
}

export function errorBody(err: AgentError): { error: { code: string; message: string } } {
  return { error: { code: err.code, message: err.message } };
}
