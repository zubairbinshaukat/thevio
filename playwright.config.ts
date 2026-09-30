import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build (`pnpm build` first), the
// same output CI measures with perf:budget.
// An uncommon port, so a dev server already running doesn't get in the way.
const PORT = Number(process.env.E2E_PORT ?? 4317);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/llms.txt`,
    reuseExistingServer: !process.env.CI,
  },
});
