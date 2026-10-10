import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RequestListItem } from "@/db/change-requests";
import { describeChange, isPending, REQUEST_STATUS_LABEL } from "@/domain/change-requests";
import { targetLabel, type Graph } from "@/domain/graph";

/** The names an operation points at, from the graph as it is now. */
export const namesFrom = (graph: Graph) => ({
  name: (id: string) => {
    const n = graph.nodes.get(id);
    if (!n) return "an item that no longer exists";
    return n.type === "specialization"
      ? targetLabel(graph, { roleId: n.parentRoleId!, specializationId: n.id })
      : n.name;
  },
});

export const roleLabel = (graph: Graph, roleId: string | null) => {
  const n = roleId ? graph.nodes.get(roleId) : null;
  if (!roleId) return "A new role";
  if (!n) return "A role that no longer exists";
  return n.type === "specialization"
    ? targetLabel(graph, { roleId: n.parentRoleId!, specializationId: n.id })
    : n.name;
};

/** A status written out (never just a colour). */
export function StatusBadge({ status }: { status: RequestListItem["status"] }) {
  return <Badge variant={isPending(status) ? "secondary" : "outline"}>{REQUEST_STATUS_LABEL[status]}</Badge>;
}

/** Requests as a list: what is asked, about which role, by whom, and where it stands. */
export function RequestList({
  requests,
  graph,
  empty,
}: {
  requests: RequestListItem[];
  graph: Graph;
  empty: string;
}) {
  if (requests.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const names = namesFrom(graph);
  return (
    <ul className="divide-y rounded-lg border">
      {requests.map((r) => {
        const first = describeChange(r.changes[0], names);
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
            <div className="min-w-0 flex-1">
              <Link href={`/requests/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                {roleLabel(graph, r.roleId)}: {first.length > 90 ? `${first.slice(0, 90)}…` : first}
              </Link>
              {r.changes.length > 1 && (
                <span className="text-sm text-muted-foreground"> and {r.changes.length - 1} more</span>
              )}
              <p className="text-sm text-muted-foreground">
                {r.practiceName} · from {r.authorName ?? "someone"} · {r.createdAt.toISOString().slice(0, 10)}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        );
      })}
    </ul>
  );
}
