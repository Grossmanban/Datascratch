/** Delays that grow on each `next()` and stay at the last one; `reset()` starts over. */
export function growingDelay(steps: readonly number[]) {
  let i = 0;
  return {
    next: () => steps[Math.min(i++, steps.length - 1)]!,
    reset: () => {
      i = 0;
    },
  };
}
