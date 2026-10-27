import { Writable } from 'node:stream';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { describe, expect, it } from 'vitest';
import { createLogger } from '../src/lib/log.js';

// Security audit 2026-10-27, item 7: query parameters and PostgreSQL details never reach the logs.
describe('error logging', () => {
  it('drops query parameters and PostgreSQL details, keeps what helps debugging', () => {
    const lines: string[] = [];
    const log = createLogger(
      'info',
      new Writable({
        write(chunk, _enc, cb) {
          lines.push(String(chunk));
          cb();
        },
      }),
    );
    const pgErr = Object.assign(new Error('duplicate key value violates unique constraint "users_email_unique"'), {
      code: '23505',
      detail: 'Key (email)=(victim@example.com) already exists.',
      constraint: 'users_email_unique',
    });
    const err = new DrizzleQueryError(
      'insert into "users" ("email", "login_hash") values ($1, $2)',
      ['victim@example.com', '$argon2id$v=19$secret-hash'],
      pgErr,
    );
    log.error({ err }, 'request failed');
    log.error({ error: err }, 'job failed');
    const out = lines.join('');
    expect(out).not.toContain('victim@example.com');
    expect(out).not.toContain('secret-hash');
    expect(out).toContain('insert into');
    expect(out).toContain('users_email_unique');
    expect(out).toContain('23505');
    expect(out).toContain('    at ');
  });
});
