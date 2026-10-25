import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { BlobStorage } from './types.js';

/** Stores blobs as files under a directory (default driver). Writes are atomic (temp file + rename). */
export class DiskStorage implements BlobStorage {
  readonly #root: string;

  constructor(root: string) {
    this.#root = resolve(root);
  }

  #path(key: string): string {
    if (!/^[A-Za-z0-9/_.-]+$/.test(key) || key.split('/').some((p) => p === '' || p === '.' || p === '..')) {
      throw new Error(`invalid storage key: ${key}`);
    }
    const p = join(this.#root, ...key.split('/'));
    if (!p.startsWith(this.#root + sep)) throw new Error(`invalid storage key: ${key}`);
    return p;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const p = this.#path(key);
    await mkdir(dirname(p), { recursive: true });
    const tmp = `${p}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, p);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.#path(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.#path(key), { force: true });
  }

  async check(): Promise<void> {
    await mkdir(this.#root, { recursive: true });
    const probe = join(this.#root, '.probe');
    await writeFile(probe, 'ok');
    await rm(probe, { force: true });
  }
}
