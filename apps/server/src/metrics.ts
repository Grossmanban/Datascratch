/**
 * Minimal Prometheus metrics (text exposition format), no extra dependency.
 * Served at GET /metrics when METRICS_TOKEN is set (Bearer METRICS_TOKEN).
 */
type Labels = Record<string, string>;

const key = (l: Labels) =>
  Object.entries(l)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v.replace(/["\\\n]/g, '_')}"`)
    .join(',');

export class Counter {
  readonly #values = new Map<string, number>();
  constructor(
    readonly name: string,
    readonly help: string,
  ) {}
  inc(labels: Labels = {}, by = 1) {
    const k = key(labels);
    this.#values.set(k, (this.#values.get(k) ?? 0) + by);
  }
  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    if (this.#values.size === 0) lines.push(`${this.name} 0`);
    for (const [k, v] of this.#values) lines.push(`${this.name}${k ? `{${k}}` : ''} ${v}`);
    return lines.join('\n');
  }
}

export interface Gauge {
  name: string;
  help: string;
  read(): number;
}

const gaugeText = (g: Gauge) => `# HELP ${g.name} ${g.help}\n# TYPE ${g.name} gauge\n${g.name} ${g.read()}`;

export class Metrics {
  readonly httpRequests = new Counter('ds_http_requests_total', 'HTTP requests by method and status class.');
  readonly syncMessages = new Counter('ds_sync_messages_total', 'Sync messages received, by type.');
  readonly syncUpdates = new Counter('ds_sync_updates_total', 'Document updates stored, by source.');
  readonly syncErrors = new Counter('ds_sync_errors_total', 'Sync errors sent to clients, by code.');
  readonly #gauges: Gauge[] = [];

  constructor() {
    const started = Date.now();
    this.gauge('ds_uptime_seconds', 'Process uptime.', () => Math.round((Date.now() - started) / 1000));
    this.gauge('ds_process_resident_memory_bytes', 'Resident memory.', () => process.memoryUsage().rss);
    this.gauge('ds_process_heap_used_bytes', 'V8 heap used.', () => process.memoryUsage().heapUsed);
  }

  gauge(name: string, help: string, read: () => number) {
    this.#gauges.push({ name, help, read });
  }

  render(): string {
    return (
      [this.httpRequests, this.syncMessages, this.syncUpdates, this.syncErrors]
        .map((c) => c.render())
        .concat(this.#gauges.map(gaugeText))
        .join('\n') + '\n'
    );
  }
}
