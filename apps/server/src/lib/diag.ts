/**
 * Request diagnostics (no content): the step a handler has reached, for the `request stalled` /
 * `request aborted` log lines (app.ts, watchStalls).
 */
const steps = new WeakMap<object, string>();

/** Record the step `req` is at (a short fixed word, never data). */
export function markStep(req: object, step: string): void {
  steps.set(req, step);
}

export function stepOf(req: object): string | null {
  return steps.get(req) ?? null;
}
