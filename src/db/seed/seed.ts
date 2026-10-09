import { count, eq } from "drizzle-orm";
import { changesSchema, type Change } from "../../domain/change-requests";
import { normalizeName, slugify, specializationSlug } from "../../domain/names";
import type { Database } from "../database";
import {
  changeRequestComments,
  changeRequests,
  edges,
  nodes,
  practiceLeads,
  practices,
  profileItems,
  profiles,
  recommendations,
  siteLeads,
  sites,
  user,
} from "../schema";
import * as data from "./data";

const weights = ["critical", "important", "nice"] as const;
type Weight = (typeof weights)[number];
const certificationNames = new Set(data.certifications.map((c) => normalizeName(c.name)));

function findRole(name: string) {
  const role = data.practices.flatMap((p) => p.roles).find((r) => r.name === name);
  if (!role) throw new Error(`Seed data refers to role "${name}", which doesn't exist.`);
  return role;
}

/** Effective requirements in the seed data: the role's core plus the specialisation's own, whose weight wins. */
export function seedRequirements(roleName: string, specializationName?: string) {
  const role = findRole(roleName);
  const result = new Map<string, Weight>();
  const add = (requires: data.Weighted) => {
    for (const w of weights) for (const item of requires[w] ?? []) result.set(item, w);
  };
  add(role.requires);
  if (specializationName) {
    const spec = role.specializations?.find((s) => s.name === specializationName);
    if (!spec) throw new Error(`"${roleName}" has no specialisation "${specializationName}".`);
    add(spec.requires);
  }
  return result;
}

const isoDate = (today: Date, days: number) =>
  new Date(today.getTime() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Inserts the seed site, practices and graph, and (unless `demo` is false) the demo people, their profiles,
 * recommendations and change requests, in one transaction. Idempotent: anything that already exists (same slug,
 * name, link or id) is left alone, so it never overwrites edits made in the app. Returns how many rows it added.
 */
export async function seed(db: Database, { demo = true, today = new Date() } = {}) {
  return db.transaction(async (tx) => {
    const added = { nodes: 0, links: 0, people: 0 };

    await tx.insert(sites).values(data.site).onConflictDoNothing();
    const [site] = await tx.select({ id: sites.id }).from(sites).where(eq(sites.slug, data.site.slug));
    await tx
      .insert(practices)
      .values(
        data.practices.map((p) => ({
          siteId: site.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
        })),
      )
      .onConflictDoNothing();
    const practiceIds = new Map(
      (await tx.select({ id: practices.id, slug: practices.slug }).from(practices)).map((p) => [
        p.slug,
        p.id,
      ]),
    );
    const practiceId = (slug: string) => {
      const found = practiceIds.get(slug);
      if (!found) throw new Error(`Seed data refers to practice "${slug}", which doesn't exist.`);
      return found;
    };

    // catalogue and roles
    const item = (type: "technical_skill" | "soft_skill" | "certification") => (i: data.SeedItem) => ({
      type,
      name: i.name,
      slug: slugify(i.name),
      normalizedName: normalizeName(i.name),
      description: i.description,
      category: i.category,
      tags: i.tags ?? [],
      issuer: i.issuer ?? null,
      source: "seed",
    });
    const roleRows = data.practices.flatMap((p) =>
      p.roles.map((r) => ({
        type: "role" as const,
        name: r.name,
        slug: slugify(r.name),
        normalizedName: normalizeName(r.name),
        description: r.description,
        category: p.name,
        practiceId: practiceId(p.slug),
        source: "seed",
      })),
    );
    added.nodes += (
      await tx
        .insert(nodes)
        .values([
          ...data.technicalSkills.map(item("technical_skill")),
          ...data.softSkills.map(item("soft_skill")),
          ...data.certifications.map(item("certification")),
          ...roleRows,
        ])
        .onConflictDoNothing()
        .returning({ id: nodes.id })
    ).length;

    const all = await tx
      .select({ id: nodes.id, type: nodes.type, key: nodes.normalizedName, parent: nodes.parentRoleId })
      .from(nodes);
    const ids = new Map(all.filter((n) => n.type !== "specialization").map((n) => [n.key, n.id]));
    const id = (name: string) => {
      const found = ids.get(normalizeName(name));
      if (!found) throw new Error(`Seed data refers to "${name}", which isn't a node.`);
      return found;
    };

    // specialisations (named per role, so looked up by role + name)
    const specRows = data.practices.flatMap((p) =>
      p.roles.flatMap((r) =>
        (r.specializations ?? []).map((s) => ({
          type: "specialization" as const,
          name: s.name,
          slug: specializationSlug(r.name, s.name),
          normalizedName: normalizeName(s.name),
          description: s.description,
          category: p.name,
          parentRoleId: id(r.name),
          source: "seed",
        })),
      ),
    );
    added.nodes += (
      await tx.insert(nodes).values(specRows).onConflictDoNothing().returning({ id: nodes.id })
    ).length;
    const specIds = new Map(
      (
        await tx
          .select({ id: nodes.id, key: nodes.normalizedName, parent: nodes.parentRoleId })
          .from(nodes)
          .where(eq(nodes.type, "specialization"))
      ).map((s) => [`${s.parent}|${s.key}`, s.id]),
    );
    const specId = (role: string, spec: string) => {
      const found = specIds.get(`${id(role)}|${normalizeName(spec)}`);
      if (!found) throw new Error(`Seed data refers to "${role}: ${spec}", which isn't a specialisation.`);
      return found;
    };

    // links
    const requires = (sourceId: string, requirements: data.Weighted) =>
      weights.flatMap((priority) =>
        (requirements[priority] ?? []).map((target) => ({
          kind: "requires" as const,
          sourceId,
          targetId: id(target),
          priority,
          strength: data.requirementStrength[priority],
        })),
      );
    const links = [
      ...data.practices.flatMap((p) =>
        p.roles.flatMap((r) => [
          ...requires(id(r.name), r.requires),
          ...(r.specializations ?? []).flatMap((s) => requires(specId(r.name, s.name), s.requires)),
        ]),
      ),
      ...data.buildsOn.map(([from, to, strength]) => ({
        kind: "builds_on" as const,
        sourceId: id(from),
        targetId: id(to),
        strength,
      })),
      // undirected: stored once, smaller id first (lowercase uuid strings sort like Postgres compares uuids)
      ...data.relatedTo.map(([a, b, strength]) => {
        const [sourceId, targetId] = [id(a), id(b)].sort();
        return { kind: "related_to" as const, sourceId, targetId, strength };
      }),
      ...data.nextSteps.map(([from, to, strength, note, typicalMonths]) => ({
        kind: "next_step" as const,
        sourceId: id(from),
        targetId: id(to),
        strength,
        note: note ?? null,
        typicalMonths: typicalMonths ?? null,
      })),
    ].map((link) => ({ ...link, source: "seed" }));
    added.links += (
      await tx.insert(edges).values(links).onConflictDoNothing().returning({ id: edges.id })
    ).length;

    if (!demo) return added;

    // demo people
    added.people = (
      await tx
        .insert(user)
        .values(data.people.map((p) => ({ id: p.id, name: p.name, email: p.email, emailVerified: true })))
        .onConflictDoNothing()
        .returning({ id: user.id })
    ).length;
    await tx
      .insert(profiles)
      .values(
        data.people.map((p) => ({
          userId: p.id,
          practiceId: practiceId(p.practice),
          currentRoleId: id(p.role),
          currentSpecializationId: p.specialization ? specId(p.role, p.specialization) : null,
          targetRoleId: p.target ? id(p.target.role) : null,
          targetSpecializationId: p.target?.specialization
            ? specId(p.target.role, p.target.specialization)
            : null,
          managerId: p.manager ?? null,
        })),
      )
      .onConflictDoNothing();
    const siteLeadRows = data.people
      .filter((p) => p.siteLead)
      .map((p) => ({ siteId: site.id, userId: p.id }));
    if (siteLeadRows.length) await tx.insert(siteLeads).values(siteLeadRows).onConflictDoNothing();
    const leadRows = data.people.flatMap((p) =>
      (p.leads ?? []).map((slug) => ({ practiceId: practiceId(slug), userId: p.id })),
    );
    if (leadRows.length) await tx.insert(practiceLeads).values(leadRows).onConflictDoNothing();

    // profiles are pre-filled from the role's skill requirements (certifications need dates, so they're listed)
    const itemRows = data.people.flatMap((p) => {
      const skills = new Set(
        [...seedRequirements(p.role, p.specialization).keys()].filter(
          (n) => !certificationNames.has(normalizeName(n)),
        ),
      );
      for (const lack of p.lacks ?? []) skills.delete(lack);
      for (const extra of p.extras ?? []) skills.add(extra);
      return [
        ...[...skills].map((name) => ({ userId: p.id, nodeId: id(name) })),
        ...(p.certifications ?? []).map((c) => ({
          userId: p.id,
          nodeId: id(c.name),
          obtainedOn: isoDate(today, -c.obtainedDaysAgo),
          expiresOn: c.expiresInDays === null ? null : isoDate(today, c.expiresInDays),
        })),
      ];
    });
    await tx.insert(profileItems).values(itemRows).onConflictDoNothing();

    await tx
      .insert(recommendations)
      .values(
        data.seedRecommendations.map((r) => ({
          id: r.id,
          personId: r.person,
          authorId: r.author,
          nodeId: r.specialization ? specId(r.target, r.specialization) : id(r.target),
          comment: r.comment,
          status: r.status,
          answeredAt: r.status === "open" ? null : today,
        })),
      )
      .onConflictDoNothing();

    const toChange = (c: data.SeedChange): Change => {
      switch (c.op) {
        case "add_requirement":
          return c.item
            ? { op: c.op, itemId: id(c.item), priority: c.priority, note: c.note }
            : { op: c.op, newItem: c.newItem, priority: c.priority, note: c.note };
        case "update_requirement":
          return { op: c.op, itemId: id(c.item), priority: c.priority, note: c.note };
        case "remove_requirement":
          return { op: c.op, itemId: id(c.item) };
        case "propose_specialization":
          return c;
      }
    };
    await tx
      .insert(changeRequests)
      .values(
        data.seedChangeRequests.map((r) => ({
          id: r.id,
          practiceId: practiceId(r.practice),
          roleId: id(r.role),
          authorId: r.author,
          status: r.status,
          reason: r.reason,
          changes: changesSchema.parse(r.changes.map(toChange)),
          decidedBy: r.decidedBy ?? null,
          decidedAt: r.decidedBy ? today : null,
          decisionNote: r.decisionNote ?? null,
        })),
      )
      .onConflictDoNothing();
    const comments = data.seedChangeRequests.flatMap((r) =>
      (r.comments ?? []).map((c) => ({ requestId: r.id, ...c })),
    );
    if (comments.length) {
      await tx
        .insert(changeRequestComments)
        .values(
          comments.map((c, i) => ({
            id: `00000000-0000-4000-8000-${String(301 + i).padStart(12, "0")}`,
            requestId: c.requestId,
            authorId: c.author,
            body: c.body,
          })),
        )
        .onConflictDoNothing();
    }

    return added;
  });
}

export async function hasGraphData(db: Database) {
  const [{ n }] = await db.select({ n: count() }).from(nodes);
  return n > 0;
}
