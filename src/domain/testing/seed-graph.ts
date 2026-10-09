/**
 * The seed data (src/db/seed/data.ts) as an in-memory Graph, for unit tests without a database. Ids are readable:
 * roles and catalogue items use their name, specialisations "Role: Specialisation", practices their slug.
 */
import * as data from "../../db/seed/data";
import {
  buildGraph,
  requirementsOf,
  type GraphEdge,
  type GraphNode,
  type Target,
  type Weight,
} from "../graph";
import { slugify, specializationSlug } from "../names";
import type { HeldItem, Profile } from "../profile";

const base = {
  category: null,
  practiceId: null,
  parentRoleId: null,
  status: "published" as const,
  issuer: null,
};

export function seedGraph() {
  const nodes: GraphNode[] = [
    ...data.technicalSkills.map((i) => ({
      ...base,
      id: i.name,
      type: "technical_skill" as const,
      name: i.name,
      slug: slugify(i.name),
      category: i.category,
    })),
    ...data.softSkills.map((i) => ({
      ...base,
      id: i.name,
      type: "soft_skill" as const,
      name: i.name,
      slug: slugify(i.name),
      category: i.category,
    })),
    ...data.certifications.map((i) => ({
      ...base,
      id: i.name,
      type: "certification" as const,
      name: i.name,
      slug: slugify(i.name),
      category: i.category,
      issuer: i.issuer ?? null,
    })),
    ...data.practices.flatMap((p) =>
      p.roles.flatMap((r) => [
        {
          ...base,
          id: r.name,
          type: "role" as const,
          name: r.name,
          slug: slugify(r.name),
          category: p.name,
          practiceId: p.slug,
        },
        ...(r.specializations ?? []).map((s) => ({
          ...base,
          id: `${r.name}: ${s.name}`,
          type: "specialization" as const,
          name: s.name,
          slug: specializationSlug(r.name, s.name),
          category: p.name,
          parentRoleId: r.name,
        })),
      ]),
    ),
  ];
  const edge = (e: Partial<GraphEdge> & Pick<GraphEdge, "kind" | "sourceId" | "targetId">): GraphEdge => ({
    priority: null,
    strength: 3,
    note: null,
    typicalMonths: null,
    ...e,
  });
  const requires = (sourceId: string, w: data.Weighted) =>
    (["critical", "important", "nice"] as Weight[]).flatMap((priority) =>
      (w[priority] ?? []).map((targetId) => edge({ kind: "requires", sourceId, targetId, priority })),
    );
  const edges: GraphEdge[] = [
    ...data.practices.flatMap((p) =>
      p.roles.flatMap((r) => [
        ...requires(r.name, r.requires),
        ...(r.specializations ?? []).flatMap((s) => requires(`${r.name}: ${s.name}`, s.requires)),
      ]),
    ),
    ...data.buildsOn.map(([sourceId, targetId, strength]) =>
      edge({ kind: "builds_on", sourceId, targetId, strength }),
    ),
    ...data.relatedTo.map(([sourceId, targetId, strength]) =>
      edge({ kind: "related_to", sourceId, targetId, strength }),
    ),
    ...data.nextSteps.map(([sourceId, targetId, strength, note, typicalMonths]) =>
      edge({
        kind: "next_step",
        sourceId,
        targetId,
        strength,
        note: note ?? null,
        typicalMonths: typicalMonths ?? null,
      }),
    ),
  ];
  return buildGraph(nodes, edges);
}

export const target = (role: string, specialization?: string): Target => ({
  roleId: role,
  specializationId: specialization ? `${role}: ${specialization}` : null,
});

const day = (today: Date, offset: number) =>
  new Date(today.getTime() + offset * 86_400_000).toISOString().slice(0, 10);

/** A demo person's profile as the seed builds it: the role's skill requirements, adjusted, plus their certifications. */
export function seedProfile(personId: string, today: Date): Profile {
  const person = data.people.find((p) => p.id === personId);
  if (!person) throw new Error(`no seed person ${personId}`);
  const graph = seedGraph();
  const current = target(person.role, person.specialization);
  const skills = new Set(
    requirementsOf(graph, current)
      .filter((r) => r.item.type !== "certification")
      .map((r) => r.item.id),
  );
  for (const lack of person.lacks ?? []) skills.delete(lack);
  for (const extra of person.extras ?? []) skills.add(extra);
  const items: HeldItem[] = [
    ...[...skills].map((nodeId) => ({ nodeId })),
    ...(person.certifications ?? []).map((c) => ({
      nodeId: c.name,
      obtainedOn: day(today, -c.obtainedDaysAgo),
      expiresOn: c.expiresInDays === null ? null : day(today, c.expiresInDays),
    })),
  ];
  return {
    items,
    current,
    target: person.target ? target(person.target.role, person.target.specialization) : null,
  };
}

/** The demo people's org data (manager, practice) as the seed stores it. */
export const seedPeople = () =>
  data.people.map((p) => ({ id: p.id, practiceId: p.practice, managerId: p.manager ?? null }));
