/**
 * What the role browser and the catalogue show (docs/PLAN.md §5, M6): searching and filtering, a role's page and an
 * item's page, as plain data built from the graph. No framework or database imports.
 */
import { normalizeName } from "./names";
import {
  byWeightThenName,
  groupByType,
  groupByWeight,
  incoming,
  isCatalogue,
  node,
  outgoing,
  requirementsOf,
  roles,
  specializationsOf,
  targetLabel,
  type CatalogueType,
  type Graph,
  type GraphNode,
  type Requirement,
  type Target,
  type Weight,
} from "./graph";
import { similarRoles, type SimilarRole } from "./similar";

const matches = (query: string | undefined, ...texts: (string | null | undefined)[]) => {
  const q = normalizeName(query ?? "");
  return !q || texts.some((t) => normalizeName(t ?? "").includes(q));
};

/** How many core requirements of each weight a role has. */
export type WeightCounts = Record<Weight, number>;

export interface RoleSummary {
  role: GraphNode;
  coreCounts: WeightCounts;
  specializations: GraphNode[];
}

const countWeights = (reqs: readonly { weight: Weight }[]): WeightCounts => ({
  critical: reqs.filter((r) => r.weight === "critical").length,
  important: reqs.filter((r) => r.weight === "important").length,
  nice: reqs.filter((r) => r.weight === "nice").length,
});

/** Published roles whose name, description or specialisations match the query, optionally of one practice. */
export function browseRoles(
  graph: Graph,
  { query, practiceId }: { query?: string; practiceId?: string } = {},
): RoleSummary[] {
  return roles(graph)
    .filter((r) => !practiceId || r.practiceId === practiceId)
    .map((role) => ({ role, specializations: specializationsOf(graph, role.id) }))
    .filter(({ role, specializations }) =>
      matches(query, role.name, role.description, ...specializations.map((s) => s.name)),
    )
    .map(({ role, specializations }) => ({
      role,
      specializations,
      coreCounts: countWeights(requirementsOf(graph, { roleId: role.id })),
    }));
}

export interface CatalogueEntry {
  item: GraphNode;
  /** How many roles and specialisations require it, and how many of them as Critical. */
  neededBy: number;
  critical: number;
}

export function catalogueCategories(graph: Graph, type?: CatalogueType) {
  return [
    ...new Set(
      [...graph.nodes.values()]
        .filter((n) => (type ? n.type === type : isCatalogue(n)) && n.category)
        .map((n) => n.category!),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/** Catalogue items matching a search, a type and a category, by name. */
export function browseCatalogue(
  graph: Graph,
  { query, type, category }: { query?: string; type?: CatalogueType; category?: string } = {},
): CatalogueEntry[] {
  return [...graph.nodes.values()]
    .filter(isCatalogue)
    .filter((n) => n.status === "published")
    .filter((n) => !type || n.type === type)
    .filter((n) => !category || n.category === category)
    .filter((n) => matches(query, n.name, n.description, n.issuer))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => {
      const needs = incoming(graph, item.id, "requires");
      return {
        item,
        neededBy: needs.length,
        critical: needs.filter((e) => e.priority === "critical").length,
      };
    });
}

export interface SpecializationView {
  specialization: GraphNode;
  /** What it adds to the core: its own requirements. */
  adds: Requirement[];
  /** The part of `adds` that raises or sets a weight the core already has (the specialisation's weight applies). */
  raises: { item: GraphNode; from: Weight; to: Weight }[];
}

export interface PathLink {
  /** The role or specialisation at the other end. */
  other: { target: Target; label: string; slug: string };
  /** Which of this role's own targets (the core or a specialisation) the path starts or ends at. */
  via: string | null;
  note: string | null;
  typicalMonths: number | null;
}

export interface RoleDetail {
  role: GraphNode;
  core: Requirement[];
  coreByType: Record<CatalogueType, Requirement[]>;
  coreByWeight: Record<Weight, Requirement[]>;
  specializations: SpecializationView[];
  pathsOut: PathLink[];
  pathsIn: PathLink[];
  similar: SimilarRole[];
}

const toTarget = (graph: Graph, n: GraphNode): Target =>
  n.type === "specialization" ? { roleId: n.parentRoleId!, specializationId: n.id } : { roleId: n.id };

/** The role page's data, or null if the slug names no published role. */
export function roleDetail(graph: Graph, slug: string, { similarLimit = 5 } = {}): RoleDetail | null {
  const role = [...graph.nodes.values()].find(
    (n) => n.type === "role" && n.slug === slug && n.status === "published",
  );
  if (!role) return null;
  const core = requirementsOf(graph, { roleId: role.id });
  const coreWeight = new Map(core.map((r) => [r.item.id, r.weight]));
  const specializations = specializationsOf(graph, role.id);
  const own = new Set([role.id, ...specializations.map((s) => s.id)]);

  const links = (direction: "out" | "in"): PathLink[] =>
    [...own]
      .flatMap((id) =>
        (direction === "out" ? outgoing(graph, id, "next_step") : incoming(graph, id, "next_step")).map(
          (e) => ({
            e,
            mine: node(graph, id),
            other: node(graph, direction === "out" ? e.targetId : e.sourceId),
          }),
        ),
      )
      .filter(({ other }) => other.status === "published")
      .map(({ e, mine, other }) => {
        const target = toTarget(graph, other);
        return {
          other: { target, label: targetLabel(graph, target), slug: roleSlugOf(graph, other) },
          via: mine.type === "specialization" ? mine.name : null,
          note: e.note,
          typicalMonths: e.typicalMonths,
        };
      })
      .sort((a, b) => a.other.label.localeCompare(b.other.label));

  return {
    role,
    core,
    coreByType: groupByType(core),
    coreByWeight: groupByWeight(core),
    specializations: specializations.map((specialization) => {
      const adds = outgoing(graph, specialization.id, "requires")
        .map((e) => ({
          item: node(graph, e.targetId),
          weight: e.priority!,
          note: e.note,
          from: "specialization" as const,
        }))
        .sort(byWeightThenName);
      return {
        specialization,
        adds,
        raises: adds
          .filter((r) => coreWeight.has(r.item.id) && coreWeight.get(r.item.id) !== r.weight)
          .map((r) => ({ item: r.item, from: coreWeight.get(r.item.id)!, to: r.weight })),
      };
    }),
    pathsOut: links("out"),
    pathsIn: links("in"),
    similar: similarRoles(graph, role.id, { limit: similarLimit }),
  };
}

/** The slug of the role page a node belongs to (a specialisation lives on its role's page). */
export function roleSlugOf(graph: Graph, n: GraphNode) {
  return n.type === "specialization" ? node(graph, n.parentRoleId!).slug : n.slug;
}

export interface ItemUsage {
  /** The role or specialisation that requires the item. */
  target: Target;
  label: string;
  roleSlug: string;
  weight: Weight;
  note: string | null;
}

export interface ItemDetail {
  item: GraphNode;
  usedBy: Record<Weight, ItemUsage[]>;
  usedByCount: number;
  /** What it builds on (prerequisites) and what builds on it. */
  buildsOn: GraphNode[];
  requiredFor: GraphNode[];
  related: GraphNode[];
}

/** The catalogue item page's data, or null if the slug names no published item. */
export function itemDetail(graph: Graph, slug: string): ItemDetail | null {
  const item = [...graph.nodes.values()].find(
    (n) => isCatalogue(n) && n.slug === slug && n.status === "published",
  );
  if (!item) return null;
  const byName = (a: GraphNode, b: GraphNode) => a.name.localeCompare(b.name);
  const usages: (ItemUsage & { item: GraphNode })[] = incoming(graph, item.id, "requires")
    .map((e) => ({ e, source: node(graph, e.sourceId) }))
    .filter(({ source }) => source.status === "published")
    .map(({ e, source }) => {
      const target = toTarget(graph, source);
      return {
        item: source,
        target,
        label: targetLabel(graph, target),
        roleSlug: roleSlugOf(graph, source),
        weight: e.priority!,
        note: e.note,
      };
    });
  const byWeight = groupByWeight(usages.map((u) => ({ ...u })));
  const sorted = (rows: typeof usages): ItemUsage[] =>
    rows
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ target, label, roleSlug, weight, note }) => ({ target, label, roleSlug, weight, note }));
  return {
    item,
    usedBy: {
      critical: sorted(byWeight.critical),
      important: sorted(byWeight.important),
      nice: sorted(byWeight.nice),
    },
    usedByCount: usages.length,
    buildsOn: outgoing(graph, item.id, "builds_on")
      .map((e) => node(graph, e.targetId))
      .sort(byName),
    requiredFor: incoming(graph, item.id, "builds_on")
      .map((e) => node(graph, e.sourceId))
      .sort(byName),
    related: [
      ...outgoing(graph, item.id, "related_to").map((e) => node(graph, e.targetId)),
      ...incoming(graph, item.id, "related_to").map((e) => node(graph, e.sourceId)),
    ].sort(byName),
  };
}
