import { defineConfig, devices } from "@playwright/test";

// E2E runs the production build (with its service worker, for the offline test) against
// the in-memory mock server (e2e/mock-server), so no real server or database is needed.
// Set E2E_SERVER_URL to run against a real apps/server instead (the build must then use the
// same VITE_DS_SERVER_URL).
const MOCK_PORT = 8787;
const WEB_PORT = 4173;
const realServer = process.env.E2E_SERVER_URL;

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ru-RU",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 860 } } },
  ],
  webServer: [
    ...(realServer
      ? []
      : [
          {
            command: `node e2e/mock-server/server.mjs`,
            port: MOCK_PORT,
            env: { PORT: String(MOCK_PORT) },
            reuseExistingServer: !process.env.CI,
          },
        ]),
    {
      command: `pnpm exec vite preview --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      // The preview sends the production CSP; its connect-src must allow the test server.
      env: { VITE_DS_SERVER_URL: realServer ?? `http://localhost:${MOCK_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
