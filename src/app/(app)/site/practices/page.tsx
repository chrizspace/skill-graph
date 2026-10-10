import Link from "next/link";
import { ActionForm, ActionInput, ActionSelect, ActionTextarea } from "@/components/app/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { listPeople } from "@/db/site";
import { getPractices } from "@/lib/graph-data";
import { requireCan } from "@/lib/session";
import { appointLeadAction, createPracticeAction, removeLeadAction, updatePracticeAction } from "../actions";

export const metadata = { title: "Practices · Skill Graph" };

export default async function SitePractices() {
  await requireCan("site:manage");
  const [practices, people] = await Promise.all([getPractices(), listPeople(getDb())]);
  // `getPractices` carries the leads' names only; the forms need who is who
  const leadsOf = (id: string) => people.filter((p) => p.leads.includes(id));

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Practices</h1>
        <p className="mt-1 text-muted-foreground">
          A practice is a department of related roles, led by one or more Practice Leads who control its roles
          and paths.
        </p>
      </header>

      <section aria-labelledby="new" className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 id="new" className="text-xl font-semibold">
          New practice
        </h2>
        <ActionForm action={createPracticeAction} submit="Create the practice" className="max-w-2xl">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Name</Label>
            <ActionInput id="p-name" name="name" required maxLength={120} className="max-w-md" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-description">What does it cover?</Label>
            <ActionTextarea id="p-description" name="description" maxLength={2000} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-lead">Practice Lead</Label>
            <ActionSelect id="p-lead" name="leadUserId" required defaultValue="" className="max-w-md">
              <option value="" disabled>
                Choose someone…
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </ActionSelect>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="existing" className="flex flex-col gap-4">
        <h2 id="existing" className="text-xl font-semibold">
          Existing practices ({practices.length})
        </h2>
        {practices.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                {p.name}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/practices/${p.slug}`}>Open</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Practice Leads</h3>
                {leadsOf(p.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lead yet: appoint one below.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {leadsOf(p.id).map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">{l.name}</span>
                        <ActionForm action={removeLeadAction}>
                          <input type="hidden" name="practiceId" value={p.id} />
                          <input type="hidden" name="userId" value={l.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${l.name} as lead of ${p.name}`}
                          >
                            Remove
                          </Button>
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                )}
                <ActionForm
                  action={appointLeadAction}
                  className="max-w-xl flex-row flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="practiceId" value={p.id} />
                  <div className="grid gap-1">
                    <Label htmlFor={`lead-${p.id}`} className="text-xs">
                      Appoint another lead of {p.name}
                    </Label>
                    <ActionSelect
                      id={`lead-${p.id}`}
                      name="userId"
                      required
                      defaultValue=""
                      className="w-64 max-w-full"
                    >
                      <option value="" disabled>
                        Choose someone…
                      </option>
                      {people
                        .filter((x) => !x.leads.includes(p.id))
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                    </ActionSelect>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    aria-label={`Appoint the chosen person as lead of ${p.name}`}
                  >
                    Appoint
                  </Button>
                </ActionForm>
              </div>
              <ActionForm action={updatePracticeAction} submit="Save" variant="outline" className="max-w-2xl">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-1.5">
                  <Label htmlFor={`n-${p.id}`}>Name</Label>
                  <ActionInput
                    id={`n-${p.id}`}
                    name="name"
                    defaultValue={p.name}
                    required
                    maxLength={120}
                    className="max-w-md"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`d-${p.id}`}>Description</Label>
                  <ActionTextarea
                    id={`d-${p.id}`}
                    name="description"
                    defaultValue={p.description}
                    maxLength={2000}
                  />
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
