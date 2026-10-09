import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/*.db.test.ts", "node_modules/**"],
    // the first tests arrive with the domain logic (M2)
    passWithNoTests: true,
  },
});
