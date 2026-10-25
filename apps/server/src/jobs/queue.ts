import { PgBoss } from 'pg-boss';
import type { Logger } from 'pino';

export type JobHandler<T extends object> = (data: T) => Promise<void>;

export interface EnqueueOptions {
  /** Collapse duplicate jobs with the same key while one is queued. */
  singletonKey?: string;
  /** Delay before the job may run. */
  startAfterSec?: number;
  retryLimit?: number;
}

export interface RegisterOptions {
  concurrency?: number;
  /** `short`: at most one queued job per singletonKey (deduplicated work such as compaction). */
  policy?: 'standard' | 'short';
}

/** Background jobs (pg-boss on PostgreSQL, no Redis — D-25). */
export interface JobQueue {
  register<T extends object>(name: string, handler: JobHandler<T>, opts?: RegisterOptions): Promise<void>;
  enqueue<T extends object>(name: string, data: T, opts?: EnqueueOptions): Promise<void>;
  /** Cron schedule (UTC). */
  schedule(name: string, cron: string, data?: object): Promise<void>;
  stop(): Promise<void>;
}

export class PgBossQueue implements JobQueue {
  readonly #boss: PgBoss;
  readonly #queues = new Set<string>();

  private constructor(
    boss: PgBoss,
    private readonly log: Logger,
  ) {
    this.#boss = boss;
  }

  static async start(connectionString: string, log: Logger): Promise<PgBossQueue> {
    const boss = new PgBoss({ connectionString, max: 3, application_name: 'datascratch-jobs' });
    boss.on('error', (err) => log.error({ err }, 'pg-boss error'));
    await boss.start();
    return new PgBossQueue(boss, log);
  }

  async #ensure(name: string, policy: RegisterOptions['policy'] = 'standard') {
    if (this.#queues.has(name)) return;
    await this.#boss.createQueue(name, { policy });
    this.#queues.add(name);
  }

  async register<T extends object>(name: string, handler: JobHandler<T>, opts: RegisterOptions = {}) {
    await this.#ensure(name, opts.policy);
    await this.#boss.work<T>(name, { localConcurrency: opts.concurrency ?? 1 }, async (jobs) => {
      for (const job of jobs) {
        try {
          await handler(job.data);
        } catch (err) {
          this.log.error({ err, job: name }, 'job failed');
          throw err;
        }
      }
    });
  }

  async enqueue<T extends object>(name: string, data: T, opts: EnqueueOptions = {}) {
    await this.#ensure(name);
    await this.#boss.send(name, data, {
      ...(opts.singletonKey ? { singletonKey: opts.singletonKey } : {}),
      ...(opts.startAfterSec ? { startAfter: opts.startAfterSec } : {}),
      retryLimit: opts.retryLimit ?? 3,
    });
  }

  async schedule(name: string, cron: string, data: object = {}) {
    await this.#ensure(name);
    await this.#boss.schedule(name, cron, data);
  }

  stop() {
    return this.#boss.stop({ graceful: true, timeout: 10_000 });
  }
}

/**
 * Runs jobs in-process right away (tests, JOBS_ENABLED=false). Schedules are ignored;
 * call `drain()` to wait for enqueued jobs.
 */
export class InlineQueue implements JobQueue {
  readonly #handlers = new Map<string, JobHandler<object>>();
  readonly #pending = new Set<Promise<void>>();

  constructor(private readonly log?: Logger) {}

  async register<T extends object>(name: string, handler: JobHandler<T>) {
    this.#handlers.set(name, handler as JobHandler<object>);
  }

  async enqueue<T extends object>(name: string, data: T) {
    const h = this.#handlers.get(name);
    if (!h) return;
    const p = h(data)
      .catch((err) => this.log?.error({ err, job: name }, 'job failed'))
      .finally(() => this.#pending.delete(p));
    this.#pending.add(p);
  }

  async schedule() {}

  async drain() {
    while (this.#pending.size > 0) await Promise.all([...this.#pending]);
  }

  /** Run a registered job now and wait for it (tests). */
  async run<T extends object>(name: string, data: T) {
    const h = this.#handlers.get(name);
    if (!h) throw new Error(`no handler for ${name}`);
    await h(data);
  }

  async stop() {
    await this.drain();
  }
}
