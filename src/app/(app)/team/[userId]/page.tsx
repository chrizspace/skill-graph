import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { loadRecommendations } from "@/db/graph";
import { loadPeople, personRef, sentRecommendations } from "@/db/people";
import { can } from "@/domain/access";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { PersonProfile } from "../person-profile";

export const metadata = { title: "Profile · Skill Graph" };

/** A person's profile (Scenario 3): for their manager and the Practice Leads of their practice; nobody else. */
export default async function PersonPage({ params }: PageProps<"/team/[userId]">) {
  const { userId } = await params;
  const actor = await requireActor();
  const db = getDb();
  const ref = await personRef(db, userId);
  // a person who doesn't exist and one this viewer may not see look the same
  if (!ref || !can(actor, "profile:view", ref)) notFound();
  const [graph, practices, [person]] = await Promise.all([
    getGraph(),
    getPractices(),
    loadPeople(db, [userId]),
  ]);
  if (!person) notFound();
  const canRecommend = can(actor, "recommendation:create", ref);
  const [sent, all] = await Promise.all([
    canRecommend ? sentRecommendations(db, userId, actor.userId) : Promise.resolve([]),
    loadRecommendations(db, userId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <Link
          href={
            canRecommend
              ? "/team"
              : `/practices/${practices.find((p) => p.id === ref.practiceId)?.slug ?? ""}`
          }
          className="underline-offset-4 hover:underline"
        >
          {canRecommend ? "My team" : "Practice"}
        </Link>{" "}
        / {person.name}
      </p>
      <PersonProfile
        person={person}
        graph={graph}
        practiceName={practices.find((p) => p.id === ref.practiceId)?.name ?? null}
        today={new Date()}
        recommendations={sent}
        planRecommendations={all.map((r) => ({ nodeId: r.nodeId, status: r.status }))}
        canRecommend={canRecommend}
      />
    </div>
  );
}
