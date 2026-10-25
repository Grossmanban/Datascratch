// Generates packages/test-vectors/vectors/**. Deterministic: running it twice
// yields identical files. `--check` fails if the committed files differ.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initCrypto } from "@datascratch/shared/crypto";
import sodium from "libsodium-wrappers-sumo";
import { cryptoVectors } from "./crypto.js";
import { documentVectors } from "./document.js";
import { idVectors } from "./ids.js";
import { strokeVectors } from "./strokes.js";
import { syncVectors } from "./sync.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "vectors");
const check = process.argv.includes("--check");

await initCrypto();
await sodium.ready;

const files: Record<string, unknown> = {
  ...cryptoVectors(),
  ...idVectors(),
  ...strokeVectors(),
  ...documentVectors(),
  ...syncVectors(),
};

let stale = 0;
for (const [name, content] of Object.entries(files)) {
  const path = join(root, name);
  const text = JSON.stringify({ version: 1, ...(content as object) }, null, 2) + "\n";
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== text) {
      console.error(`stale: vectors/${name}`);
      stale++;
    }
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}
if (stale > 0) {
  console.error(
    `${stale} vector file(s) out of date: run \`pnpm --filter @datascratch/test-vectors generate\``,
  );
  process.exit(1);
}
console.warn(check ? "vectors are up to date" : `wrote ${Object.keys(files).length} vector files`);
