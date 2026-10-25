import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "contracts/index": "src/contracts/index.ts",
    "crypto/index": "src/crypto/index.ts",
    ids: "src/ids.ts",
    "document/index": "src/document/index.ts",
    "strokes/index": "src/strokes/index.ts",
    "sync/index": "src/sync/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  platform: "neutral",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  external: ["yjs", "libsodium-wrappers-sumo", "zod"],
});
