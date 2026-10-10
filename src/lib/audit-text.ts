/** One audit row in words ("added requirement A → B (critical)"), for a role's history and for what a request changed. */
export function describeAudit(row: {
  action: string;
  entity: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const data = (row.after ?? row.before ?? {}) as Record<string, unknown>;
  // changes the Site Lead makes (a practice, an appointment, a merge) carry their own sentence
  if (typeof data.summary === "string") {
    return { verb: row.action, what: data.summary, emergency: Boolean(data.emergency), text: data.summary };
  }
  const verb = row.action === "create" ? "added" : row.action === "delete" ? "removed" : "changed";
  const what =
    row.entity === "edge"
      ? `${data.kind === "next_step" ? "path" : "requirement"} ${String(data.source)} → ${String(data.target)}${data.priority ? ` (${String(data.priority)})` : ""}`
      : `${String(data.type ?? "node").replace("_", " ")} “${String(data.name)}”`;
  return { verb, what, emergency: Boolean(data.emergency), text: `${verb} ${what}` };
}
