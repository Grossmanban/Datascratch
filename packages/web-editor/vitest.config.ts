import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    // Each test builds a TipTap editor in happy-dom; under a parallel monorepo run that can exceed 5 s.
    testTimeout: 30_000,
  },
});
