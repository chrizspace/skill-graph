import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on port 3100 and a freshly reset LOCAL database (e2e/global-setup.ts),
// so they never touch a running `pnpm dev`. Locally `pnpm db:up` must be running; CI provides a Postgres service.
const port = 3100;

export default defineConfig({
  testDir: "e2e",
  // the tests share one database, so they run one after the other
  // one test at most 30 s, the whole run at most 20 min: a hang fails instead of waiting
  timeout: 30_000,
  globalTimeout: 1_200_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // `list` prints every test as it passes or fails: that is the progress checklist
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `exec` and the next binary itself, so Playwright's stop signal reaches the server (through `pnpm start` it didn't,
    // and the run waited 10 minutes for the teardown after every test had passed)
    command: `pnpm build && exec node_modules/.bin/next start -p ${port}`,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    url: `http://localhost:${port}/sign-in`,
    timeout: 300_000,
    // only with E2E_KEEP_DB (README, "End-to-end tests"): a server that was started before the database was reset holds
    // stale ids in its graph cache, so a normal run always starts its own
    reuseExistingServer: Boolean(process.env.E2E_KEEP_DB),
  },
});
