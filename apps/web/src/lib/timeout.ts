/** A step that did not finish in time (named, so the stage that hung can be reported). */
export class StageTimeout extends Error {
  constructor(readonly stage: string) {
    super(`Timed out: ${stage}`);
    this.name = "StageTimeout";
  }
}

/** Rejects with StageTimeout if `p` has not settled within `ms`. */
export function withTimeout<T>(p: Promise<T>, ms: number, stage: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new StageTimeout(stage)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
