// `pnpm db:migrate`: applies pending migrations. Runs before `next build` on Vercel (see vercel.json).
import { directDatabaseUrl, loadLocalEnv } from "../src/db/env";
import { runMigrations } from "../src/db/migrate";

loadLocalEnv();
await runMigrations(directDatabaseUrl());
