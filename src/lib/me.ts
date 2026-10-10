import { cache } from "react";
import { getDb } from "@/db/client";
import { loadMyProfile, loadRecommendations } from "@/db/graph";
import { requireActor } from "./session";
import { getGraph, getPractices } from "./graph-data";

/** Everything the employee pages need about the signed-in person, read once per request. */
export const loadMe = cache(async () => {
  const actor = await requireActor();
  const db = getDb();
  const [graph, practices, mine, recommendations] = await Promise.all([
    getGraph(),
    getPractices(),
    loadMyProfile(db, actor.userId),
    loadRecommendations(db, actor.userId),
  ]);
  return { actor, graph, practices, mine, recommendations, today: new Date() };
});
