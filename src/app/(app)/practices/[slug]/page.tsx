import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ActionInput, ActionTextarea } from "@/components/app/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { can } from "@/domain/access";
import { outgoing, roles, specializationsOf } from "@/domain/graph";
import { getDb } from "@/db/client";
import { listRequests } from "@/db/change-requests";
import { isPending } from "@/domain/change-requests";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { createRoleAction } from "../actions";
import { loadPeople, memberIds } from "@/db/people";
import { readinessPerRole, summarize, teamGaps } from "@/domain/people";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { PeopleList } from "../../team/people-list";

export const metadata = { title: "Practice · Skill Graph" };

/** A practice's page for its Practice Leads (and the Site Lead): its roles, drafts included, and a place to add one. */
export default async function PracticePage({ params }: PageProps<"/practices/[slug]">) {
  const { slug } = await params;
  const actor = await requireActor();
  const practice = (await getPractices()).find((p) => p.slug === slug);
  if (!practice || !can(actor, "role:edit", { practiceId: practice.id })) notFound();
  const graph = await getGraph();
  const list = roles(graph, { includeDrafts: true }).filter((r) => r.practiceId === practice.id);
  // named profiles are for the practice's own leads; the Site Lead sees aggregates only (M12)
  const leads = actor.leadOf.some((p) => p.id === practice.id);
  const members = leads ? await loadPeople(getDb(), await memberIds(getDb(), practice.id)) : [];
  const today = new Date();
  const summaries = new Map(members.map((m) => [m.id, summarize(graph, m, today)]));
  const gaps = teamGaps(graph, members, today).slice(0, 8);
  const perRole = readinessPerRole(graph, members, today);
  const names = new Map(members.map((m) => [m.id, m.name]));
  const waiting = (await listRequests(getDb(), actor)).inbox.filter(
    (r) => r.practiceId === practice.id && isPending(r.status),
  );

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{practice.name}</h1>
        {practice.description && <p className="mt-1 text-muted-foreground">{practice.description}</p>}
        {practice.leads.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Led by {practice.leads.join(", ")}</p>
        )}
      </header>

      <section aria-labelledby="waiting" className="flex flex-col gap-2 rounded-lg border p-4">
        <h2 id="waiting" className="text-xl font-semibold">
          Change requests ({waiting.length} waiting)
        </h2>
        <p className="text-sm text-muted-foreground">
          {waiting.length === 0
            ? "Nothing is waiting for a decision."
            : `${waiting.length} from managers waiting for a decision.`}{" "}
          <Link href="/requests" className="underline underline-offset-4">
            Open the inbox
          </Link>
        </p>
      </section>

      {leads ? (
        <>
          <section aria-labelledby="members" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="members" className="text-xl font-semibold">
                People ({members.length})
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/practices/${practice.slug}/succession`}>Succession</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The people whose home practice this is. You, their manager and they themselves see these
              profiles; nobody else does.
            </p>
            <PeopleList
              people={members}
              summaries={summaries}
              hrefFor={(m) => `/practices/${practice.slug}/people/${m.id}`}
              empty="Nobody has this as their practice yet."
            />
          </section>

          <section aria-labelledby="gaps" className="flex flex-col gap-3">
            <h2 id="gaps" className="text-xl font-semibold">
              Gaps across the practice
            </h2>
            {gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared gaps.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {gaps.map((g) => (
                  <li key={g.item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                    <Link
                      href={`/catalogue/${g.item.slug}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {g.item.name}
                    </Link>
                    <PriorityBadge weight={g.weight} />
                    <span className="text-sm">
                      {g.people.length} of {members.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {g.people.map((id) => names.get(id)).join(", ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="per-role" className="flex flex-col gap-3">
            <h2 id="per-role" className="text-xl font-semibold">
              How people meet their roles
            </h2>
            {perRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nobody holds a role of this practice yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {perRole.map((r) => (
                  <li key={r.role.id} className="flex flex-wrap items-start gap-x-6 gap-y-1 p-3 text-sm">
                    <div className="min-w-48">
                      <span className="font-medium">{r.role.name}</span>
                      <p className="text-muted-foreground">
                        {r.people.length} {r.people.length === 1 ? "person" : "people"}
                      </p>
                    </div>
                    <p>
                      Meet it on average:{" "}
                      <span className="font-medium tabular-nums">{Math.round(r.average * 100)}%</span>
                      {r.criticalMissing > 0 && (
                        <span> · {r.criticalMissing} still miss a Critical requirement</span>
                      )}
                    </p>
                    {r.gaps.length > 0 && (
                      <p className="text-muted-foreground">
                        Most missed: {r.gaps.map((g) => g.item.name).join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p role="note" className="rounded-lg border p-3 text-sm">
          Named profiles are visible only to the person, their manager and the Practice Leads of their
          practice. As Site Lead you see aggregates only.
        </p>
      )}

      <section aria-labelledby="roles" className="flex flex-col gap-3">
        <h2 id="roles" className="text-xl font-semibold">
          Roles ({list.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          You control these roles, their specialisations, requirements and paths. A new role is a draft until
          you publish it.
        </p>
        <ul className="divide-y rounded-lg border">
          {list.map((r) => {
            const specs = specializationsOf(graph, r.id, { includeDrafts: true });
            const requirements = outgoing(graph, r.id, "requires").length;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{r.name}</span>{" "}
                  {r.status === "draft" && <Badge variant="outline">Draft</Badge>}
                  <p className="text-sm text-muted-foreground">
                    {requirements} core requirements · {specs.length}{" "}
                    {specs.length === 1 ? "specialisation" : "specialisations"}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/practices/${practice.slug}/roles/${r.slug}/edit`}>Edit</Link>
                </Button>
              </li>
            );
          })}
          {list.length === 0 && <li className="p-3 text-sm text-muted-foreground">No roles yet.</li>}
        </ul>
      </section>

      <section aria-labelledby="new-role" className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 id="new-role" className="text-xl font-semibold">
          New role
        </h2>
        <ActionForm action={createRoleAction} submit="Create draft role">
          <input type="hidden" name="practiceId" value={practice.id} />
          <input type="hidden" name="practiceSlug" value={practice.slug} />
          <div className="grid gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <ActionInput id="role-name" name="name" required maxLength={120} className="max-w-md" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="role-description">What does the role do?</Label>
            <ActionTextarea
              id="role-description"
              name="description"
              required
              maxLength={2000}
              className="max-w-2xl"
            />
          </div>
        </ActionForm>
      </section>

      <p className="text-sm text-muted-foreground">
        Missing a skill or certification?{" "}
        <Link href="/catalogue#add" className="underline underline-offset-4">
          Add it to the catalogue
        </Link>{" "}
        first, then require it from a role.
      </p>
    </div>
  );
}
