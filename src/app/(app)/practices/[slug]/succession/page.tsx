import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { loadPeople, memberIds } from "@/db/people";
import { getGraph, getPractices } from "@/lib/graph-data";
import { param } from "@/lib/query";
import { requireActor } from "@/lib/session";
import { Succession } from "../../../team/succession";

export const metadata = { title: "Succession · Skill Graph" };

export default async function PracticeSuccession({
  params,
  searchParams,
}: PageProps<"/practices/[slug]/succession">) {
  const { slug } = await params;
  const sp = await searchParams;
  const actor = await requireActor();
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const practice = practices.find((p) => p.slug === slug);
  // named people: only the practice's own leads (the Site Lead sees aggregates only)
  if (!practice || !actor.leadOf.some((p) => p.id === practice.id)) notFound();
  const people = await loadPeople(getDb(), await memberIds(getDb(), practice.id));
  return (
    <Succession
      graph={graph}
      practices={practices}
      people={people}
      roleSlug={param(sp.role)}
      action={`/practices/${practice.slug}/succession`}
      hrefFor={(p) => `/practices/${practice.slug}/people/${p.id}`}
      intro={`Who in ${practice.name} is closest to a role: how much of it they already have, best fit first.`}
    />
  );
}
