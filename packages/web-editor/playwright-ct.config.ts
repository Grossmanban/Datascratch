import { defineConfig, devices } from "@playwright/experimental-ct-react";

const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./ct",
  snapshotDir: "./ct/__snapshots__",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ctPort: 3109,
    trace: "retain-on-failure",
    viewport: { width: 1000, height: 800 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: executablePath ? { executablePath } : {} } }],
});
