import pino from 'pino';

/**
 * Logging that never writes user data. Errors are serialized from an allowlist:
 * query parameters (DrizzleQueryError puts them into `params`, the message and the
 * stack) and PostgreSQL `detail` (e.g. "Key (email)=(...)") are dropped, messages are
 * truncated.
 */
const MESSAGE_MAX = 300;
const KEEP = ['type', 'code', 'statusCode', 'constraint', 'table', 'column', 'routine'] as const;

function cleanMessage(message: unknown): string {
  let m = typeof message === 'string' ? message : '';
  const params = m.indexOf('\nparams:');
  if (params >= 0) m = m.slice(0, params);
  return m.length > MESSAGE_MAX ? `${m.slice(0, MESSAGE_MAX)}…` : m;
}

export function safeErr(err: unknown, depth = 0): Record<string, unknown> | unknown {
  if (!(err instanceof Error) && (typeof err !== 'object' || err === null)) return err;
  const e = err as Error & Record<string, unknown>;
  const message = cleanMessage(e.message);
  const out: Record<string, unknown> = { type: e.constructor?.name ?? 'Error', message };
  for (const k of KEEP) if (typeof e[k] === 'string' || typeof e[k] === 'number') out[k] = e[k];
  if (typeof e.query === 'string') out.query = e.query.slice(0, 1000);
  if (typeof e.stack === 'string') {
    // The first lines of a stack repeat the (uncleaned) message.
    const at = e.stack.indexOf('\n    at ');
    out.stack = `${out.type}: ${message}${at >= 0 ? e.stack.slice(at) : ''}`;
  }
  if (e.cause !== undefined && depth < 3) out.cause = safeErr(e.cause, depth + 1);
  return out;
}

export function createLogger(level: string, destination?: pino.DestinationStream) {
  const options: pino.LoggerOptions = {
    level,
    redact: ['req.headers.authorization', 'req.headers.cookie', '*.accessToken', '*.refreshToken', '*.loginKey', '*.token'],
    serializers: { err: (e: unknown) => safeErr(e), error: (e: unknown) => safeErr(e) },
  };
  return destination ? pino(options, destination) : pino(options);
}
