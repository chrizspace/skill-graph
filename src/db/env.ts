import { existsSync } from "node:fs";

/** Scripts outside Next.js (migrations, seed, drizzle-kit) load .env.local themselves; values already set (CI, Vercel) win. */
export function loadLocalEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}

/** Neon endpoint id (or host) of a connection string, without credentials: safe to print in build logs. */
export function describeUrl(url: string) {
  const { hostname, pathname } = new URL(url);
  const endpoint = hostname.endsWith(".neon.tech")
    ? hostname.split(".")[0].replace(/-pooler$/, "")
    : hostname;
  return `${endpoint}${pathname}`;
}

export function isLocalUrl(url: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
}

/**
 * The connection string for migrations and the seed: the direct (unpooled) endpoint when there is one, because the
 * pooler doesn't suit DDL. Refuses to continue if the pooled and direct URLs point at different databases, so a preview
 * deploy can never migrate a database other than its own branch.
 */
export function directDatabaseUrl() {
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DATABASE_URL_UNPOOLED;
  if (!pooled && !direct)
    throw new Error("DATABASE_URL is not set (copy .env.example to .env.local for local development).");
  if (pooled && direct && describeUrl(pooled) !== describeUrl(direct)) {
    throw new Error(
      `DATABASE_URL (${describeUrl(pooled)}) and DATABASE_URL_UNPOOLED (${describeUrl(direct)}) point at different databases.`,
    );
  }
  return (direct ?? pooled)!;
}
