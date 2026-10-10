import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, ActionInput, ActionTextarea } from "@/components/app/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { can } from "@/domain/access";
import { outgoing, roles, specializationsOf } from "@/domain/graph";
import { getGraph, getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { createRoleAction } from "../actions";

export const metadata = { title: "Practice · Skill Graph" };

/** A practice's page for its Practice Leads (and the Site Lead): its roles, drafts included, and a place to add one. */
export default async function PracticePage({ params }: PageProps<"/practices/[slug]">) {
  const { slug } = await params;
  const actor = await requireActor();
  const practice = (await getPractices()).find((p) => p.slug === slug);
  if (!practice || !can(actor, "role:edit", { practiceId: practice.id })) notFound();
  const graph = await getGraph();
  const list = roles(graph, { includeDrafts: true }).filter((r) => r.practiceId === practice.id);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{practice.name}</h1>
        {practice.description && <p className="mt-1 text-muted-foreground">{practice.description}</p>}
        {practice.leads.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Led by {practice.leads.join(", ")}</p>
        )}
      </header>

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
