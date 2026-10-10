import { execSync } from "node:child_process";

/**
 * A fresh, seeded database for every run. `db:reset` refuses anything but a local database.
 * Set E2E_KEEP_DB=1 when you run single files against a server you started yourself: the server caches the graph with
 * its row ids, which a reset replaces, so the server and the database have to be reset together.
 */
export default function globalSetup() {
  if (process.env.E2E_KEEP_DB) return;
  execSync("pnpm db:reset", { stdio: "inherit" });
}
