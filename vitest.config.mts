import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/*.db.test.ts", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/testing/**", "**/*.test.ts"],
      // docs/PLAN.md M3: at least 90% of the domain logic is covered
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
  },
});
