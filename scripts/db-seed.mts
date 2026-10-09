// `pnpm db:seed`: adds the seed graph and demo people (idempotent). On Vercel it runs before every build (vercel.json);
// in production it only seeds an empty database and never adds demo people.
import { directDatabaseUrl, loadLocalEnv } from "../src/db/env";
import { runSeed } from "../src/db/seed/run";

loadLocalEnv();
await runSeed(directDatabaseUrl());
