import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { listRequests } from "@/db/change-requests";
import { can } from "@/domain/access";
import { isPending } from "@/domain/change-requests";
import { getGraph } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { RequestList } from "./request-list";

export const metadata = { title: "Change requests · Skill Graph" };

export default async function Requests() {
  const actor = await requireActor();
  const mayReview = actor.leadOf.length > 0 || actor.siteLead;
  const maySend = can(actor, "changeRequest:create", { practiceId: "" });
  if (!mayReview && !maySend) notFound();
  const [graph, { mine, inbox }] = await Promise.all([getGraph(), listRequests(getDb(), actor)]);
  // what a lead sees in the inbox does not repeat what they sent themselves
  const waiting = inbox.filter((r) => isPending(r.status));

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Change requests</h1>
          <p className="mt-1 text-muted-foreground">
            Feedback on roles and paths, and proposals for new roles and specialisations, reviewed by the
            Practice Leads of the practice.
          </p>
        </div>
        {maySend && (
          <Button asChild>
            <Link href="/requests/new">New request</Link>
          </Button>
        )}
      </header>

      {mayReview && (
        <section aria-labelledby="inbox" className="flex flex-col gap-3">
          <h2 id="inbox" className="text-xl font-semibold">
            Inbox: waiting for a decision ({waiting.length})
          </h2>
          <RequestList requests={waiting} graph={graph} empty="Nothing is waiting." />
          {inbox.length > waiting.length && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Decided ({inbox.length - waiting.length})
              </summary>
              <div className="mt-2">
                <RequestList requests={inbox.filter((r) => !isPending(r.status))} graph={graph} empty="" />
              </div>
            </details>
          )}
        </section>
      )}

      {maySend && (
        <section aria-labelledby="mine" className="flex flex-col gap-3">
          <h2 id="mine" className="text-xl font-semibold">
            My requests ({mine.length})
          </h2>
          <RequestList requests={mine} graph={graph} empty="You haven't sent a request yet." />
        </section>
      )}
    </div>
  );
}
