import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { describeUrl } from "./env";

/** Applies the migrations in ./drizzle and logs what it did and where (endpoint only, no credentials). */
export async function runMigrations(url: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const count = async () => {
      const [row] = await client`select to_regclass('drizzle.__drizzle_migrations') is not null as present`;
      if (!row.present) return 0;
      const [{ n }] = await client`select count(*)::int as n from drizzle.__drizzle_migrations`;
      return n as number;
    };
    const before = await count();
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    const after = await count();
    console.log(
      `migrations: ${after - before} applied, ${after} in total, on ${describeUrl(url)} (${process.env.VERCEL_ENV ?? "local"})`,
    );
  } finally {
    await client.end();
  }
}
