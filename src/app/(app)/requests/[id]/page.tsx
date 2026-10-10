import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ActionTextarea } from "@/components/app/action-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { loadRequest } from "@/db/change-requests";
import { can } from "@/domain/access";
import { describeChange, isPending } from "@/domain/change-requests";
import { validateChanges } from "@/domain/validate";
import { describeAudit } from "@/lib/audit-text";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { Label } from "@/components/ui/label";
import { commentAction, decideAction, withdrawAction } from "../actions";
import { namesFrom, roleLabel, StatusBadge } from "../request-list";

export const metadata = { title: "Change request · Skill Graph" };

const when = (d: Date) => `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const actor = await requireActor();
  const request = await loadRequest(getDb(), actor, id);
  // one that doesn't exist and one this person may not see look the same
  if (!request) notFound();
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const names = namesFrom(graph);
  const pending = isPending(request.status);
  const mayReview = can(actor, "changeRequest:review", { practiceId: request.practiceId });
  const isAuthor = request.authorId === actor.userId;
  const practice = practices.find((p) => p.id === request.practiceId);
  const emergency = mayReview && actor.siteLead && !actor.leadOf.some((p) => p.id === request.practiceId);
  const subject = request.roleId ? graph.nodes.get(request.roleId) : null;
  const rolePage = subject
    ? graph.nodes.get(subject.type === "specialization" ? subject.parentRoleId! : subject.id)
    : null;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/requests" className="underline-offset-4 hover:underline">
            Change requests
          </Link>{" "}
          / {practice?.name}
        </p>
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
          {roleLabel(graph, request.roleId)}
          <StatusBadge status={request.status} />
        </h1>
        <p className="text-sm text-muted-foreground">
          From {request.authorName ?? "someone"} to {practice?.name}, {when(request.createdAt)}
          {rolePage?.status === "published" && (
            <>
              {" · "}
              <Link href={`/roles/${rolePage.slug}`} className="underline underline-offset-4">
                View the role
              </Link>
            </>
          )}
        </p>
      </header>

      <section aria-labelledby="reason" className="flex flex-col gap-1">
        <h2 id="reason" className="text-xl font-semibold">
          Why
        </h2>
        <p className="whitespace-pre-line">{request.reason}</p>
      </section>

      <section aria-labelledby="changes" className="flex flex-col gap-2">
        <h2 id="changes" className="text-xl font-semibold">
          Changes ({request.changes.length})
        </h2>
        <ol className="divide-y rounded-lg border">
          {request.changes.map((c, i) => {
            // for the reviewer: does each operation still apply to the role as it is now?
            const problems =
              pending && mayReview
                ? validateChanges(graph, { practiceId: request.practiceId, roleId: request.roleId }, [c])
                : [];
            return (
              <li key={i} className="p-3 text-sm">
                <span className="font-medium">{i + 1}.</span> {describeChange(c, names)}
                {problems.map((p) => (
                  <p key={p} role="note" className="mt-1 text-destructive">
                    No longer applies: {p}
                  </p>
                ))}
              </li>
            );
          })}
        </ol>
      </section>

      {!pending && (
        <section aria-labelledby="decision" className="flex flex-col gap-1 rounded-lg border p-4">
          <h2 id="decision" className="text-xl font-semibold">
            {request.status === "approved"
              ? "Approved"
              : request.status === "rejected"
                ? "Rejected"
                : "Withdrawn"}
          </h2>
          {request.decidedByName && (
            <p className="text-sm text-muted-foreground">
              by {request.decidedByName}
              {request.decidedAt ? `, ${when(request.decidedAt)}` : ""}
            </p>
          )}
          {request.decisionNote && <p className="whitespace-pre-line">{request.decisionNote}</p>}
        </section>
      )}

      {request.status === "approved" && request.applied.length > 0 && (
        <section aria-labelledby="applied" className="flex flex-col gap-2">
          <h2 id="applied" className="text-xl font-semibold">
            What it changed
          </h2>
          <p className="text-sm text-muted-foreground">
            Recorded in the audit log with this request&apos;s number.
          </p>
          <ul className="divide-y text-sm">
            {request.applied.map((a, i) => {
              const d = describeAudit(a);
              return (
                <li key={i} className="py-2">
                  {d.text}
                  {d.emergency && <span> (emergency)</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="thread" className="flex flex-col gap-3">
        <h2 id="thread" className="text-xl font-semibold">
          Comments ({request.comments.length})
        </h2>
        {request.status === "needs_info" && (
          <p role="status" className="text-sm">
            {isAuthor
              ? "The reviewers need more information: answer below and the request goes back to them."
              : "Waiting for the author to answer."}
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {request.comments.map((c) => (
            <li key={c.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {c.authorName ?? "Someone"}{" "}
                <span className="font-normal text-muted-foreground">{when(c.at)}</span>
              </p>
              <p className="whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ol>
        {pending && (
          <ActionForm action={commentAction} submit="Add comment" variant="outline">
            <input type="hidden" name="requestId" value={request.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="comment">Comment</Label>
              <ActionTextarea id="comment" name="body" required maxLength={2000} />
            </div>
          </ActionForm>
        )}
      </section>

      {pending && mayReview && (
        <section aria-labelledby="decide" className="flex flex-col gap-3 rounded-lg border p-4">
          <h2 id="decide" className="text-xl font-semibold">
            Decide
          </h2>
          {emergency && (
            <p role="note" className="text-sm">
              You are not a lead of {practice?.name}. As Site Lead you can decide in an emergency; the audit
              log records it.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Approving applies every change above at once. If one no longer applies, nothing is changed and you
            are told which.
          </p>
          <ActionForm action={decideAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="note">Note to the author (required to reject or to ask for information)</Label>
              <ActionTextarea id="note" name="note" maxLength={2000} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="decision" value="approve">
                Approve
              </Button>
              <Button type="submit" name="decision" value="info" variant="outline">
                Ask for information
              </Button>
              <Button type="submit" name="decision" value="reject" variant="destructive">
                Reject
              </Button>
            </div>
          </ActionForm>
        </section>
      )}

      {pending && isAuthor && (
        <ActionForm action={withdrawAction} submit="Withdraw this request" variant="outline">
          <input type="hidden" name="requestId" value={request.id} />
        </ActionForm>
      )}
    </div>
  );
}
