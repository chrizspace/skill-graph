import { thresholds } from "./config";
import type { Target } from "./graph";

/** A skill someone has, or a certification they hold (with its dates as YYYY-MM-DD). */
export interface HeldItem {
  nodeId: string;
  obtainedOn?: string | null;
  expiresOn?: string | null;
}

export interface Profile {
  items: readonly HeldItem[];
  current?: Target | null;
  target?: Target | null;
}

export type CertificationStatus = "valid" | "expiring" | "expired";

export const isoDay = (day: Date | string) =>
  typeof day === "string" ? day.slice(0, 10) : day.toISOString().slice(0, 10);
const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Valid, expiring (within `thresholds.expiringDays`) or expired. An expired certification still counts as held:
 * it's shown faded, not treated as a gap (docs/PLAN.md §1).
 */
export function certificationStatus(item: HeldItem, today: Date | string): CertificationStatus {
  if (!item.expiresOn) return "valid";
  const day = isoDay(today);
  if (item.expiresOn < day) return "expired";
  if (item.expiresOn <= addDays(day, thresholds.expiringDays)) return "expiring";
  return "valid";
}

export const holdings = (profile: Profile) => new Map(profile.items.map((i) => [i.nodeId, i]));
