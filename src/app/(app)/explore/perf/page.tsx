import { notFound } from "next/navigation";
import { syntheticGraph } from "@/domain/testing/synthetic-graph";
import { param } from "@/lib/query";
import { requireActor } from "@/lib/session";
import { Explorer } from "../explorer";

export const metadata = { title: "Graph performance · Skill Graph" };

/**
 * The explorer on a synthetic graph (2,000 nodes and 20,000 links by default), for the performance test
 * (e2e/explore-performance.spec.ts). Not available in production.
 */
export default async function Perf({ searchParams }: PageProps<"/explore/perf">) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const sp = await searchParams;
  await requireActor();
  const nodeCount = Math.min(5000, Number(param(sp.nodes)) || 2000);
  const linkCount = Math.min(60000, Number(param(sp.links)) || nodeCount * 10);
  const { nodes, edges } = syntheticGraph({ nodes: nodeCount, links: linkCount });
  const practices = [...new Set(nodes.map((n) => n.practiceId).filter((p): p is string => Boolean(p)))].map(
    (id) => ({
      id,
      slug: id,
      name: id.replace("practice-", "Practice "),
    }),
  );
  return (
    <Explorer
      nodes={nodes}
      edges={edges}
      practices={practices}
      held={null}
      today={new Date().toISOString().slice(0, 10)}
      webgl={param(sp.renderer) === "webgl"}
      initial={{
        focus: null,
        from: null,
        to: null,
        hops: 2,
        practice: null,
        types: [],
        category: null,
        weights: [],
      }}
    />
  );
}
