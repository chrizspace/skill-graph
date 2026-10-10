import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, or, sql } from "drizzle-orm";
import { ActionForm, ActionInput, ActionSelect, ActionTextarea } from "@/components/app/action-form";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { deletionImpact } from "@/db/graph-write";
import { auditLog, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canEditNode } from "@/domain/editing";
import { node, outgoing, roles, specializationsOf, targetLabel } from "@/domain/graph";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import {
  addPathAction,
  createSpecializationAction,
  deleteRoleLikeAction,
  publishAction,
  removePathAction,
  updateRoleLikeAction,
} from "../../../../actions";
import { RequirementsEditor } from "./requirements-editor";

export const metadata = { title: "Edit role · Skill Graph" };

export default async function EditRole({ params }: PageProps<"/practices/[slug]/roles/[role]/edit">) {
  const { slug, role: roleSlug } = await params;
  const actor = await requireActor();
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const practice = practices.find((p) => p.slug === slug);
  const role = roles(graph, { includeDrafts: true }).find(
    (r) => r.slug === roleSlug && r.practiceId === practice?.id,
  );
  // a role of another practice is not found, not "forbidden": it doesn't reveal what exists
  if (!practice || !role || !canEditNode(actor, graph, role.id)) notFound();

  const specs = specializationsOf(graph, role.id, { includeDrafts: true });
  const owners = [role, ...specs];
  const targets = roles(graph).flatMap((r) => [r, ...specializationsOf(graph, r.id)]);
  const impact = await deletionImpact(getDb(), role.id);
  const history = await getDb()
    .select({
      at: auditLog.at,
      action: auditLog.action,
      entity: auditLog.entity,
      before: auditLog.before,
      after: auditLog.after,
      who: user.name,
      requestId: auditLog.changeRequestId,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .where(
      or(sql`${auditLog.after}->>'roleId' = ${role.id}`, sql`${auditLog.before}->>'roleId' = ${role.id}`),
    )
    .orderBy(desc(auditLog.at))
    .limit(15);
  const emergency = actor.siteLead && !actor.leadOf.some((p) => p.id === practice.id);
  const ownerName = (id: string) =>
    id === role.id ? role.name : targetLabel(graph, { roleId: role.id, specializationId: id });
  const nextPath = `/practices/${practice.slug}`;
  const editPath = `${nextPath}/roles/${role.slug}/edit`;

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <Link href={nextPath} className="underline-offset-4 hover:underline">
            {practice.name}
          </Link>{" "}
          / Edit role
        </p>
        <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
          {role.name}
          {role.status === "draft" ? (
            <Badge variant="outline">Draft</Badge>
          ) : (
            <Badge variant="secondary">Published</Badge>
          )}
        </h1>
        {emergency && (
          <p role="note" className="rounded-lg border p-3 text-sm">
            You are not a lead of {practice.name}. As Site Lead you can edit it in an emergency; every change
            is recorded in the audit log.
          </p>
        )}
        {role.status === "draft" ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm">
              This role is a draft: only Practice Leads see it. Give it its requirements, then publish it.
            </p>
            <ActionForm action={publishAction} submit="Publish role">
              <input type="hidden" name="id" value={role.id} />
            </ActionForm>
          </div>
        ) : (
          <p className="text-sm">
            <Link href={`/roles/${role.slug}`} className="underline underline-offset-4">
              View the role page
            </Link>
          </p>
        )}
      </header>

      <section aria-labelledby="details" className="flex flex-col gap-3">
        <h2 id="details" className="text-xl font-semibold">
          Name and description
        </h2>
        <ActionForm action={updateRoleLikeAction} submit="Save">
          <input type="hidden" name="id" value={role.id} />
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <ActionInput
              id="name"
              name="name"
              defaultValue={role.name}
              required
              maxLength={120}
              className="max-w-md"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">What the role does and the skillset it looks for</Label>
            <ActionTextarea
              id="description"
              name="description"
              defaultValue={role.description ?? ""}
              required
              maxLength={2000}
              className="max-w-2xl"
            />
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="core" className="flex flex-col gap-3">
        <h2 id="core" className="text-xl font-semibold">
          Core requirements
        </h2>
        <p className="text-sm text-muted-foreground">
          What everyone in this role needs, whatever their specialisation.
        </p>
        <RequirementsEditor
          ownerId={role.id}
          graph={graph}
          empty="No requirements yet. A role needs at least one before it can be published."
        />
      </section>

      <section aria-labelledby="specializations" className="flex flex-col gap-4">
        <h2 id="specializations" className="text-xl font-semibold">
          Specialisations
        </h2>
        <p className="text-sm text-muted-foreground">
          A direction within the role. Each adds requirements on top of the core; where both name the same
          item, the specialisation&apos;s weight applies.
        </p>
        {specs.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {role.name}: {s.name}
                {s.status === "draft" ? <Badge variant="outline">Draft</Badge> : null}
              </CardTitle>
              <CardDescription>What it adds to the core</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ActionForm action={updateRoleLikeAction} submit="Save" variant="outline">
                <input type="hidden" name="id" value={s.id} />
                <div className="grid gap-1.5">
                  <Label htmlFor={`sn-${s.id}`}>Name</Label>
                  <ActionInput
                    id={`sn-${s.id}`}
                    name="name"
                    defaultValue={s.name}
                    required
                    maxLength={120}
                    className="max-w-md"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`sd-${s.id}`}>Description</Label>
                  <ActionTextarea
                    id={`sd-${s.id}`}
                    name="description"
                    defaultValue={s.description ?? ""}
                    required
                    maxLength={2000}
                  />
                </div>
              </ActionForm>
              <RequirementsEditor ownerId={s.id} graph={graph} empty="Nothing added beyond the core yet." />
              <div className="flex flex-wrap gap-3">
                {s.status === "draft" && role.status === "published" && (
                  <ActionForm action={publishAction} submit="Publish specialisation" variant="outline">
                    <input type="hidden" name="id" value={s.id} />
                  </ActionForm>
                )}
                {s.status === "draft" && role.status !== "published" && (
                  <p className="text-sm text-muted-foreground">
                    Publish the role first, then this specialisation.
                  </p>
                )}
                <ConfirmButton
                  action={deleteRoleLikeAction}
                  label="Delete specialisation"
                  title={`Delete ${role.name}: ${s.name}?`}
                  confirmLabel="Delete specialisation"
                  fields={{ id: s.id, next: editPath }}
                >
                  <p>
                    This deletes the specialisation and its {outgoing(graph, s.id).length} requirements. It
                    can&apos;t be undone.
                  </p>
                </ConfirmButton>
              </div>
            </CardContent>
          </Card>
        ))}
        <ActionForm
          action={createSpecializationAction}
          submit="Add specialisation"
          variant="outline"
          className="rounded-lg border p-3"
        >
          <input type="hidden" name="roleId" value={role.id} />
          <div className="grid gap-1.5">
            <Label htmlFor="spec-name">New specialisation: name</Label>
            <ActionInput id="spec-name" name="name" required maxLength={120} className="max-w-md" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="spec-description">What does it add?</Label>
            <ActionTextarea id="spec-description" name="description" required maxLength={2000} />
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="paths" className="flex flex-col gap-3">
        <h2 id="paths" className="text-xl font-semibold">
          Official paths
        </h2>
        <p className="text-sm text-muted-foreground">
          Career moves from this role or one of its specialisations to another role.
        </p>
        <ul className="divide-y">
          {owners.flatMap((o) =>
            outgoing(graph, o.id, "next_step").map((e) => (
              <li key={e.targetId + o.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="flex-1">
                  <span className="font-medium">{ownerName(o.id)}</span> →{" "}
                  <span className="font-medium">
                    {targetLabel(
                      graph,
                      node(graph, e.targetId).type === "specialization"
                        ? { roleId: node(graph, e.targetId).parentRoleId!, specializationId: e.targetId }
                        : { roleId: e.targetId },
                    )}
                  </span>
                  {e.typicalMonths ? (
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      · typically {e.typicalMonths} months
                    </span>
                  ) : null}
                  {e.note && <span className="block text-sm text-muted-foreground">{e.note}</span>}
                </span>
                <ActionForm action={removePathAction}>
                  <input type="hidden" name="fromId" value={o.id} />
                  <input type="hidden" name="toId" value={e.targetId} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove the path to ${node(graph, e.targetId).name}`}
                  >
                    Remove
                  </Button>
                </ActionForm>
              </li>
            )),
          )}
        </ul>
        <ActionForm
          action={addPathAction}
          submit="Add path"
          variant="outline"
          className="flex-row flex-wrap items-end gap-2 rounded-lg border p-3"
        >
          <div className="grid gap-1">
            <Label htmlFor="path-from" className="text-xs">
              From
            </Label>
            <ActionSelect id="path-from" name="fromId" defaultValue={role.id} className="w-56 max-w-full">
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {ownerName(o.id)}
                </option>
              ))}
            </ActionSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="path-to" className="text-xs">
              To
            </Label>
            <ActionSelect id="path-to" name="toId" required defaultValue="" className="w-56 max-w-full">
              <option value="" disabled>
                Choose…
              </option>
              {targets
                .filter((t) => t.id !== role.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.type === "specialization" ? `${node(graph, t.parentRoleId!).name}: ${t.name}` : t.name}
                  </option>
                ))}
            </ActionSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="path-months" className="text-xs">
              Typical months
            </Label>
            <ActionInput
              id="path-months"
              name="typicalMonths"
              type="number"
              min={1}
              max={120}
              className="w-28"
            />
          </div>
          <div className="grid min-w-48 flex-1 gap-1">
            <Label htmlFor="path-note" className="text-xs">
              Description (optional)
            </Label>
            <ActionInput id="path-note" name="note" maxLength={500} />
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3">
        <h2 id="history" className="text-xl font-semibold">
          History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ol className="divide-y text-sm">
            {history.map((h, i) => {
              const data = (h.after ?? h.before ?? {}) as Record<string, unknown>;
              const what =
                h.entity === "edge"
                  ? `${data.kind === "next_step" ? "path" : "requirement"} ${String(data.source)} → ${String(data.target)}${data.priority ? ` (${String(data.priority)})` : ""}`
                  : `${String(data.type ?? "node").replace("_", " ")} “${String(data.name)}”`;
              return (
                <li key={i} className="py-2">
                  <span className="font-medium">{h.who ?? "Someone"}</span>{" "}
                  {h.action === "create" ? "added" : h.action === "delete" ? "removed" : "changed"} {what}
                  {data.emergency ? <span> (emergency edit)</span> : null}
                  <span className="block text-muted-foreground">
                    {h.at.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section
        aria-labelledby="danger"
        className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4"
      >
        <h2 id="danger" className="text-xl font-semibold">
          Delete this role
        </h2>
        <p className="text-sm text-muted-foreground">
          Removes the role, its specialisations and every link. The audit log keeps what it was.
        </p>
        <div>
          <ConfirmButton
            action={deleteRoleLikeAction}
            label="Delete role"
            title={`Delete ${role.name}?`}
            confirmLabel="Delete role"
            fields={{ id: role.id, next: nextPath }}
          >
            <p>
              This also deletes {impact.specializations.length}{" "}
              {impact.specializations.length === 1 ? "specialisation" : "specialisations"}
              {impact.specializations.length ? ` (${impact.specializations.join(", ")})` : ""} and{" "}
              {impact.links} links to skills, certifications and other roles. It can&apos;t be undone.
            </p>
            {impact.people > 0 && (
              <p>
                {impact.people} {impact.people === 1 ? "person has" : "people have"} it as their role or
                target; they will have to pick another.
              </p>
            )}
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
