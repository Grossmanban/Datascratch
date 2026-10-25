import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

/** Server version (package.json), reported by /v1/health and OpenAPI. */
export const VERSION: string = process.env.DS_VERSION ?? pkg.version;
