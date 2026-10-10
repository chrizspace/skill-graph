import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { skillGraphDb?: ReturnType<typeof create> };

function create() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is not set (copy .env.example to .env.local for local development).");
  // prepare: false because Neon's pooled endpoint is a transaction pooler
  return drizzle({ client: postgres(url, { prepare: false, max: 5 }), schema });
}

/** The app's database connection, created on first use and reused across hot reloads. */
export function getDb() {
  return (globalForDb.skillGraphDb ??= create());
}
