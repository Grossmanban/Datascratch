import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E runs the production build (with its service worker, for the offline test) against
// the in-memory mock server (e2e/mock-server), so no real server or database is needed.
// Set E2E_SERVER_URL to run against a real apps/server instead (the build must then use the
// same VITE_DS_SERVER_URL).
const MOCK_PORT = 8787;
const WEB_PORT = 4173;
const EXT_PORT = 4174;
const realServer = process.env.E2E_SERVER_URL;
// D-51: the default build has no tasks or calendar (tabs are on since the 2026-11-02 amendment).
// The extended features are tested against a second build made with VITE_DS_EXTENDED_MODE=1 into
// dist-ext (mock server only).
const extended = !realServer && existsSync("dist-ext");
const EXTENDED_ONLY = /tasks\.spec\.ts$/;
// Specs that behave differently by mode run in both projects (they branch on the project name).
const BOTH_MODES = /(spaces|layout|a11y|theme)\.spec\.ts$/;
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 860 } };
// spec/05 «Веб на телефоне»: the key scenarios on an iPhone (WebKit) and an Android phone
// (Chromium). E2E_PHONE_CHROMIUM=1 runs «iphone» in Chromium where WebKit is not installed.
const PHONE = /(mobile|launch)\.spec\.ts$/;
const iphone = { ...devices["iPhone 15"], ...(process.env.E2E_PHONE_CHROMIUM ? { browserName: "chromium" as const } : {}) };
const phones = process.env.E2E_NO_PHONES
  ? []
  : [
      { name: "iphone", use: iphone, testMatch: PHONE },
      // The smallest common Android screen (360 × 800), with Pixel 7 touch and user agent.
      { name: "android", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 800 } }, testMatch: PHONE },
    ];

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
    { name: "desktop", use: desktop, testIgnore: [EXTENDED_ONLY, /mobile\.spec\.ts$/] },
    ...phones,
    ...(extended
      ? [{ name: "extended", use: { ...desktop, baseURL: `http://localhost:${EXT_PORT}` }, testMatch: [EXTENDED_ONLY, BOTH_MODES] }]
      : []),
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
    ...(extended
      ? [
          {
            command: `pnpm exec vite preview --outDir dist-ext --port ${EXT_PORT} --strictPort`,
            port: EXT_PORT,
            env: { VITE_DS_SERVER_URL: `http://localhost:${MOCK_PORT}` },
            reuseExistingServer: !process.env.CI,
          },
        ]
      : []),
  ],
});
