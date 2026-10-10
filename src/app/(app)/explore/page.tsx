import { Explorer, type ExplorerInitial } from "./explorer";
import { catalogueTypes, type NodeType, weights } from "@/domain/graph";
import { loadMyProfile } from "@/db/graph";
import { getDb } from "@/db/client";
import { getGraphRows, getPractices } from "@/lib/graph-data";
import { param } from "@/lib/query";
import { requireActor } from "@/lib/session";

export const metadata = { title: "Graph · Skill Graph" };

const NODE_TYPES: NodeType[] = ["role", "specialization", ...catalogueTypes];
const list = (value: string | undefined) => value?.split(",").filter(Boolean) ?? [];

export default async function Explore({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const actor = await requireActor();
  const [rows, practices, mine] = await Promise.all([
    getGraphRows(),
    getPractices(),
    loadMyProfile(getDb(), actor.userId),
  ]);
  const initial: ExplorerInitial = {
    focus: param(sp.focus) ?? null,
    from: param(sp.from) ?? null,
    to: param(sp.to) ?? null,
    hops: Math.min(3, Math.max(1, Number(param(sp.hops)) || 2)),
    practice: param(sp.practice) ?? null,
    types: list(param(sp.type)).filter((t): t is NodeType => NODE_TYPES.includes(t as NodeType)),
    category: param(sp.category) ?? null,
    weights: list(param(sp.w)).filter((w): w is (typeof weights)[number] => weights.includes(w as never)),
  };
  return (
    <Explorer
      nodes={rows.nodes}
      edges={rows.edges}
      practices={practices.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))}
      held={
        mine?.profile.items.map((i) => ({
          nodeId: i.nodeId,
          obtainedOn: i.obtainedOn ?? null,
          expiresOn: i.expiresOn ?? null,
        })) ?? null
      }
      today={new Date().toISOString().slice(0, 10)}
      initial={initial}
    />
  );
}
