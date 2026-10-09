/** Tunable numbers of the domain logic (docs/PLAN.md §4). */

/** How much a requirement counts in readiness and similarity. */
export const weightValue = { critical: 3, important: 2, nice: 1 } as const;

export const thresholds = {
  /** Every Critical requirement met and readiness at least this: the role is reachable. */
  reachable: 0.7,
  /** Readiness at least this (but not reachable): a stretch. */
  stretch: 0.5,
  /** Roles at least this similar (weighted Jaccard of core requirements) are suggested as similar. */
  similarity: 0.25,
  /** A certification expiring within this many days is flagged. */
  expiringDays: 90,
  /** Aggregates over fewer people than this are hidden (Site Lead views). */
  minGroupSize: 5,
} as const;
