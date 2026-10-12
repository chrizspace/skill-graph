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

/**
 * The accounts offered on the demo sign-in, one for each way of using the app: an Employee, a Career Advisor with two
 * direct reports, a Practice Lead, a Practice Lead who is also the Career Advisor of one person, the Site Lead, and a second Site Lead who is also a
 * Practice Lead and a Career Advisor.
 * The seed holds more people; any of them can still sign in by address (the tests do).
 */
export const DEMO_ACCOUNTS = [
  "alex.rivera@example.com",
  "riley.nowak@example.com",
  "taylor.brooks@example.com",
  "casey.lin@example.com",
  "jordan.kim@example.com",
  "robin.weiss@example.com",
] as const;

export async function listDemoAccounts(db: Database) {
  const people = await listDemoPeople(db);
  return DEMO_ACCOUNTS.flatMap((email) => people.filter((p) => p.email === email));
}
