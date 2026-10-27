import { describe, expect, it } from 'vitest';
import { KEY_TTL_MS, noteKeyCache } from '../src/plugins/agent-key-cache.js';

describe('agent note-key cache (security audit 7)', () => {
  it('expires keys and forgets a notebook on demand', () => {
    const t0 = 1_000_000;
    noteKeyCache.set('n1', 'nb1', new Uint8Array([1]), t0);
    noteKeyCache.set('n2', 'nb2', new Uint8Array([2]), t0);
    expect(noteKeyCache.get('n1', t0 + 1000)).toEqual(new Uint8Array([1]));
    expect(noteKeyCache.get('n1', t0 + KEY_TTL_MS + 1)).toBeUndefined();
    noteKeyCache.forgetNotebooks(['nb2']);
    expect(noteKeyCache.get('n2', t0 + 1000)).toBeUndefined();
  });
});
