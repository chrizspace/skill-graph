import { cacheLife, cacheTag } from "next/cache";
import { loadGraphRows, loadPractices } from "@/db/graph";
import { getDb } from "@/db/client";
import { buildGraph, type Graph } from "@/domain/graph";

/**
 * The graph's rows, cached across requests and invalidated with `revalidateTag("graph", …)` by anything that edits
 * roles, requirements, paths or the catalogue (M9, M10). Plain rows rather than the Graph, so it serialises.
 */
async function graphRows() {
  "use cache";
  cacheTag("graph");
  cacheLife("hours");
  return loadGraphRows(getDb());
}

export async function getGraph(): Promise<Graph> {
  const { nodes, edges } = await graphRows();
  return buildGraph(nodes, edges);
}

export async function getPractices() {
  "use cache";
  cacheTag("graph");
  cacheLife("hours");
  return loadPractices(getDb());
}
