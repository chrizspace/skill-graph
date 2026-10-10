import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { loadRecommendations } from "@/db/graph";
import { loadPeople, personRef } from "@/db/people";
import { can } from "@/domain/access";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { PersonProfile } from "../../../../team/person-profile";

export const metadata = { title: "Profile · Skill Graph" };

/** A member of the practice, for its Practice Leads. The Site Lead gets nothing here: aggregates only. */
export default async function MemberPage({ params }: PageProps<"/practices/[slug]/people/[userId]">) {
  const { slug, userId } = await params;
  const actor = await requireActor();
  const db = getDb();
  const [practices, ref] = await Promise.all([getPractices(), personRef(db, userId)]);
  const practice = practices.find((p) => p.slug === slug);
  if (!practice || !ref || ref.practiceId !== practice.id || !can(actor, "profile:view", ref)) notFound();
  const [graph, [person], all] = await Promise.all([
    getGraph(),
    loadPeople(db, [userId]),
    loadRecommendations(db, userId),
  ]);
  if (!person) notFound();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <Link href={`/practices/${practice.slug}`} className="underline-offset-4 hover:underline">
          {practice.name}
        </Link>{" "}
        / {person.name}
      </p>
      <PersonProfile
        person={person}
        graph={graph}
        practiceName={practice.name}
        today={new Date()}
        recommendations={[]}
        planRecommendations={all.map((r) => ({ nodeId: r.nodeId, status: r.status }))}
        canRecommend={can(actor, "recommendation:create", ref)}
      />
    </div>
  );
}
