// `pnpm db:reset`: drops everything in the LOCAL database and rebuilds it from the migrations. Refuses any other database.
import postgres from "postgres";
import { describeUrl, directDatabaseUrl, isLocalUrl, loadLocalEnv } from "../src/db/env";
import { runMigrations } from "../src/db/migrate";

loadLocalEnv();
const url = directDatabaseUrl();
if (!isLocalUrl(url)) {
  console.error(`Refusing to reset ${describeUrl(url)}: db:reset only runs against a local database.`);
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
await client.unsafe(
  "drop schema if exists drizzle cascade; drop schema public cascade; create schema public;",
);
await client.end();
console.log(`reset: dropped everything in ${describeUrl(url)}`);
await runMigrations(url);
