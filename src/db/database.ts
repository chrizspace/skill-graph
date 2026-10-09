import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Any Drizzle Postgres database with our schema: postgres.js in the app and scripts, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
