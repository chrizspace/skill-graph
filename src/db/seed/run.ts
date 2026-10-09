import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describeUrl } from "../env";
import * as schema from "../schema";
import { hasGraphData, seed } from "./seed";

/**
 * Production: seeds the site, practices and graph only into an empty database (never demo people, recommendations or
 * change requests), so it can't undo edits made in the app. Everywhere else (local, previews): the full seed,
 * idempotently, so demo sign-in always has its people.
 */
export async function runSeed(url: string) {
  const production = process.env.VERCEL_ENV === "production";
  const where = `${describeUrl(url)} (${process.env.VERCEL_ENV ?? "local"})`;
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle({ client, schema });
    if (production && (await hasGraphData(db))) {
      console.log(`seed: skipped, ${where} already has graph data`);
      return;
    }
    const added = await seed(db, { demo: !production });
    console.log(
      `seed: added ${added.nodes} nodes, ${added.links} links, ${added.people} demo people on ${where}`,
    );
  } finally {
    await client.end();
  }
}
