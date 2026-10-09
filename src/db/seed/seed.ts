import { count } from "drizzle-orm";
import { normalizeName, slugify } from "../../domain/names";
import type { Database } from "../database";
import { edges, nodes, profiles, profileSkills, user } from "../schema";
import {
  buildsOn,
  demoUsers,
  nextSteps,
  relatedTo,
  requirementStrength,
  roles,
  skills,
  technologies,
  type SeedNode,
} from "./data";

const priorities = ["critical", "important", "nice"] as const;

/**
 * Inserts the seed graph (and the demo people unless told not to) in one transaction. Idempotent: anything that
 * already exists (same slug, name or link) is left alone, so it never overwrites edits made in the app.
 * Returns how many rows it added.
 */
export async function seed(db: Database, { demoPeople = true } = {}) {
  return db.transaction(async (tx) => {
    const row = (type: "role" | "skill" | "technology") => (n: SeedNode) => ({
      type,
      name: n.name,
      slug: slugify(n.name),
      normalizedName: normalizeName(n.name),
      description: n.description,
      category: n.category,
      source: "seed",
    });
    const addedNodes = await tx
      .insert(nodes)
      .values([
        ...roles.map(row("role")),
        ...skills.map(row("skill")),
        ...technologies.map(row("technology")),
      ])
      .onConflictDoNothing()
      .returning({ id: nodes.id });

    const ids = new Map(
      (await tx.select({ id: nodes.id, key: nodes.normalizedName }).from(nodes)).map((n) => [n.key, n.id]),
    );
    const id = (name: string) => {
      const found = ids.get(normalizeName(name));
      if (!found) throw new Error(`Seed data refers to "${name}", which isn't a node.`);
      return found;
    };

    const links = [
      ...roles.flatMap((r) =>
        priorities.flatMap((priority) =>
          r.requires[priority].map((target) => ({
            kind: "requires" as const,
            sourceId: id(r.name),
            targetId: id(target),
            priority,
            strength: requirementStrength[priority],
          })),
        ),
      ),
      ...buildsOn.map(([from, to, strength]) => ({
        kind: "builds_on" as const,
        sourceId: id(from),
        targetId: id(to),
        strength,
      })),
      // undirected: stored once, smaller id first (lowercase uuid strings sort like Postgres compares uuids)
      ...relatedTo.map(([a, b, strength]) => {
        const [sourceId, targetId] = [id(a), id(b)].sort();
        return { kind: "related_to" as const, sourceId, targetId, strength };
      }),
      ...nextSteps.map(([from, to, strength]) => ({
        kind: "next_step" as const,
        sourceId: id(from),
        targetId: id(to),
        strength,
      })),
    ].map((link) => ({ ...link, source: "seed" }));
    const addedLinks = await tx.insert(edges).values(links).onConflictDoNothing().returning({ id: edges.id });

    let addedPeople = 0;
    if (demoPeople) {
      const people = await tx
        .insert(user)
        .values(demoUsers.map((u) => ({ id: u.id, name: u.name, email: u.email, emailVerified: true })))
        .onConflictDoNothing()
        .returning({ id: user.id });
      addedPeople = people.length;
      await tx
        .insert(profiles)
        .values(
          demoUsers.map((u) => ({
            userId: u.id,
            appRole: u.appRole,
            currentRoleId: id(u.currentRole),
            managerId: u.manager,
          })),
        )
        .onConflictDoNothing();
      const declared = demoUsers.flatMap((u) =>
        u.declares.map((skill) => ({ userId: u.id, nodeId: id(skill) })),
      );
      if (declared.length) await tx.insert(profileSkills).values(declared).onConflictDoNothing();
    }

    return { nodes: addedNodes.length, links: addedLinks.length, people: addedPeople };
  });
}

export async function hasGraphData(db: Database) {
  const [{ n }] = await db.select({ n: count() }).from(nodes);
  return n > 0;
}
