import { assess, learningOrder, type AssessedItem, type Readiness } from "./assess";
import { node, targetLabel, type Graph, type GraphNode, type Target } from "./graph";
import { holdings, type Profile } from "./profile";

export interface RecommendationRef {
  nodeId: string;
  status: "open" | "accepted" | "declined";
}

export interface PlanStep extends AssessedItem {
  /** A manager recommended it and the person accepted. */
  recommended: boolean;
}

export interface DevelopmentPlan {
  target: Target;
  label: string;
  /** What's missing for the target, in learning order. */
  steps: PlanStep[];
  /** Accepted recommendations of items the target doesn't require and the person doesn't have yet. */
  recommendedExtras: GraphNode[];
  /** Held certifications for the target that are expiring or expired: worth renewing. */
  toRenew: AssessedItem[];
  progress: Readiness;
}

/** The development plan towards a target (docs/PLAN.md §4): the gaps in learning order plus accepted recommendations. */
export function developmentPlan(
  graph: Graph,
  profile: Profile,
  target: Target,
  recommendations: readonly RecommendationRef[],
  today: Date | string,
): DevelopmentPlan {
  const a = assess(graph, profile, target, today);
  const accepted = new Set(recommendations.filter((r) => r.status === "accepted").map((r) => r.nodeId));
  const required = new Set([...a.met, ...a.missing].map((r) => r.item.id));
  const held = holdings(profile);
  return {
    target,
    label: targetLabel(graph, target),
    steps: learningOrder(graph, a.missing).map((r) => ({ ...r, recommended: accepted.has(r.item.id) })),
    recommendedExtras: [...accepted]
      .map((id) => node(graph, id))
      .filter(
        (n) => n.type !== "role" && n.type !== "specialization" && !required.has(n.id) && !held.has(n.id),
      )
      .sort((x, y) => x.name.localeCompare(y.name)),
    toRenew: a.met.filter((r) => r.certification === "expiring" || r.certification === "expired"),
    progress: a.readiness,
  };
}
