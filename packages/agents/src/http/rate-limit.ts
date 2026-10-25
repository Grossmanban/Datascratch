/**
 * Token-bucket rate limiter kept in process memory: the server runs as a
 * single process (D-25, no Redis), so no shared store is needed.
 */
import { AgentError } from "../errors.js";

export interface RateLimitRule {
  /** Sustained requests per minute. */
  perMinute: number;
  /** Bucket size (short bursts). Defaults to perMinute / 2, at least 5. */
  burst?: number;
}

interface Bucket {
  tokens: number;
  updated: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly rule: RateLimitRule,
    private readonly now: () => number = Date.now,
  ) {}

  /** Consumes one request for `key` or throws `rate_limited` with a retry hint. */
  take(key: string): void {
    const capacity = this.rule.burst ?? Math.max(5, Math.floor(this.rule.perMinute / 2));
    const ratePerMs = this.rule.perMinute / 60_000;
    const t = this.now();
    const b = this.buckets.get(key) ?? { tokens: capacity, updated: t };
    b.tokens = Math.min(capacity, b.tokens + (t - b.updated) * ratePerMs);
    b.updated = t;
    if (b.tokens < 1) {
      this.buckets.set(key, b);
      const retryAfterSec = Math.max(1, Math.ceil((1 - b.tokens) / ratePerMs / 1000));
      throw new AgentError("rate_limited", `Too many requests. Retry in ${retryAfterSec} s.`, { retryAfterSec });
    }
    b.tokens -= 1;
    this.buckets.set(key, b);
    if (this.buckets.size > 10_000) this.sweep(t, capacity, ratePerMs);
  }

  private sweep(t: number, capacity: number, ratePerMs: number): void {
    for (const [k, b] of this.buckets) if (b.tokens + (t - b.updated) * ratePerMs >= capacity) this.buckets.delete(k);
  }
}
