/**
 * A synthetic graph for performance tests (docs/PLAN.md §6, M8): by default 2,000 nodes and 20,000 links with the same
 * shape as the real one (roles in practices, specialisations, a long tail of skills and certifications, a few popular
 * skills almost every role needs, prerequisites, related pairs and career paths). Deterministic: the same seed always
 * gives the same graph. Rows only; build the Graph with `buildGraph`.
 */
import type { GraphEdge, GraphNode, Weight } from "../graph";

/** mulberry32: a small seeded random number generator. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticOptions {
  nodes?: number;
  links?: number;
  seed?: number;
}

export function syntheticGraph({ nodes: total = 2000, links = 20000, seed = 1 }: SyntheticOptions = {}) {
  const rnd = random(seed);
  const int = (n: number) => Math.floor(rnd() * n);
  const practices = Math.max(2, Math.round(total / 170));
  const roleCount = Math.round(total * 0.12);
  const specCount = Math.round(total * 0.06);
  const itemCount = total - roleCount - specCount;
  const technical = Math.round(itemCount * 0.6);
  const soft = Math.round(itemCount * 0.25);

  const nodes: GraphNode[] = [];
  const base = { parentRoleId: null, status: "published" as const, issuer: null, description: "" };
  for (let i = 0; i < roleCount; i++) {
    const p = i % practices;
    nodes.push({
      ...base,
      id: `role-${i}`,
      type: "role",
      name: `Role ${i}`,
      slug: `role-${i}`,
      category: null,
      practiceId: `practice-${p}`,
    });
  }
  for (let i = 0; i < specCount; i++) {
    const parent = `role-${(i * 2) % roleCount}`;
    nodes.push({
      ...base,
      id: `spec-${i}`,
      type: "specialization",
      name: `Specialisation ${i}`,
      slug: `role-${(i * 2) % roleCount}--spec-${i}`,
      category: null,
      practiceId: null,
      parentRoleId: parent,
    });
  }
  const itemIds: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const type = i < technical ? "technical_skill" : i < technical + soft ? "soft_skill" : "certification";
    const id = `item-${i}`;
    itemIds.push(id);
    nodes.push({
      ...base,
      id,
      type,
      name: `${type === "certification" ? "Certification" : type === "soft_skill" ? "Soft skill" : "Skill"} ${i}`,
      slug: id,
      category: type === "technical_skill" ? (i % 7 === 0 ? "Tool / platform" : `Area ${i % 9}`) : null,
      practiceId: null,
      issuer: type === "certification" ? `Issuer ${i % 5}` : null,
    });
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const add = (
    kind: GraphEdge["kind"],
    sourceId: string,
    targetId: string,
    priority: Weight | null = null,
  ) => {
    const key = `${kind}|${sourceId}|${targetId}`;
    if (sourceId === targetId || seen.has(key)) return false;
    seen.add(key);
    edges.push({
      kind,
      sourceId,
      targetId,
      priority,
      strength: 1 + int(5),
      note: null,
      typicalMonths: kind === "next_step" ? 6 + int(18) : null,
    });
    return true;
  };
  // a few popular items (the first ones) are needed by many; most are needed by few
  const popularItem = () => itemIds[Math.floor(itemIds.length * rnd() ** 2.2)];
  const weight = (): Weight => {
    const r = rnd();
    return r < 0.25 ? "critical" : r < 0.65 ? "important" : "nice";
  };

  const nextSteps = Math.min(roleCount * 2, Math.floor(links * 0.03));
  const builds = Math.floor(links * 0.2);
  const related = Math.floor(links * 0.12);
  const requires = links - nextSteps - builds - related;

  for (let n = 0; n < nextSteps;)
    if (add("next_step", `role-${int(roleCount)}`, `role-${int(roleCount)}`)) n++;
  for (let n = 0; n < builds;) if (add("builds_on", itemIds[int(itemIds.length)], popularItem())) n++;
  for (let n = 0; n < related;) {
    const a = itemIds[int(itemIds.length)];
    const b = itemIds[int(itemIds.length)];
    if (a !== b && add("related_to", a < b ? a : b, a < b ? b : a)) n++;
  }
  // every role requires a good number of items, specialisations a few more
  const owners = [
    ...Array.from({ length: roleCount }, (_, i) => `role-${i}`),
    ...Array.from({ length: specCount }, (_, i) => `spec-${i}`),
  ];
  for (let n = 0; n < requires;) {
    const owner = owners[int(owners.length)];
    if (add("requires", owner, popularItem(), weight())) n++;
  }
  return { nodes, edges };
}
