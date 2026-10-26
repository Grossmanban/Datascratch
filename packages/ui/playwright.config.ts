import { defineConfig, devices } from "@playwright/test";

// Layout tests run real Chromium against the built showcase (jsdom has no layout).
// Build first: pnpm --filter @datascratch/ui showcase:build
const PORT = 61010;

export default defineConfig({
  testDir: "./layout",
  timeout: 30_000,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, locale: "ru-RU" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "phone",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, hasTouch: true },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --directory showcase-dist`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
