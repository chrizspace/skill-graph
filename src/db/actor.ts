import { eq, count } from "drizzle-orm";
import type { Actor } from "../domain/access";
import type { Database } from "./database";
import { practiceLeads, practices, profiles, siteLeads, user } from "./schema";

/** Who someone is in the organisation, from the data: reporting lines, practice leads and site leads. */
export async function loadActor(db: Database, userId: string): Promise<Actor | null> {
  const [person] = await db.select().from(user).where(eq(user.id, userId));
  if (!person) return null;
  const [[profile], [reports], led, [site]] = await Promise.all([
    db.select({ practiceId: profiles.practiceId }).from(profiles).where(eq(profiles.userId, userId)),
    db.select({ n: count() }).from(profiles).where(eq(profiles.managerId, userId)),
    db
      .select({ id: practices.id, slug: practices.slug, name: practices.name })
      .from(practiceLeads)
      .innerJoin(practices, eq(practices.id, practiceLeads.practiceId))
      .where(eq(practiceLeads.userId, userId))
      .orderBy(practices.name),
    db.select({ n: count() }).from(siteLeads).where(eq(siteLeads.userId, userId)),
  ]);
  return {
    userId,
    name: person.name,
    email: person.email,
    practiceId: profile?.practiceId ?? null,
    reportCount: reports.n,
    leadOf: led,
    siteLead: site.n > 0,
  };
}

/** The demo people: seeded accounts on example.com. Used by demo sign-in and its picker. */
export async function listDemoPeople(db: Database) {
  const people = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(user.name);
  return people.filter((p) => p.email.endsWith(DEMO_EMAIL_DOMAIN));
}

export const DEMO_EMAIL_DOMAIN = "@example.com";
