import { getDb } from "@/db/client";
import { directReportIds, loadPeople } from "@/db/people";
import { getGraph, getPractices } from "@/lib/graph-data";
import { param } from "@/lib/query";
import { requireTeam } from "@/lib/session";
import { Succession } from "../succession";

export const metadata = { title: "Succession · Skill Graph" };

export default async function TeamSuccession({ searchParams }: PageProps<"/team/succession">) {
  const actor = await requireTeam();
  const db = getDb();
  const sp = await searchParams;
  const [graph, practices, people] = await Promise.all([
    getGraph(),
    getPractices(),
    directReportIds(db, actor.userId).then((ids) => loadPeople(db, ids)),
  ]);
  return (
    <Succession
      graph={graph}
      practices={practices}
      people={people}
      roleSlug={param(sp.role)}
      action="/team/succession"
      hrefFor={(p) => `/team/${p.id}`}
      intro="Who in your team is closest to a role: how much of it they already have, best fit first."
    />
  );
}
