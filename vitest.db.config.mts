import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database tests: real Postgres in-process (PGlite), migrations applied per test file. Run with `pnpm test:db`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.db.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
