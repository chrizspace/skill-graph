import { ActionForm, ActionSelect } from "@/components/app/action-form";
import { FilterLinks } from "@/components/app/filter-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { listPeople } from "@/db/site";
import { getPractices } from "@/lib/graph-data";
import { hrefWith, param } from "@/lib/query";
import { requireCan } from "@/lib/session";
import { addSiteLeadAction, removeSiteLeadAction, setPersonAction } from "../actions";

export const metadata = { title: "People · Skill Graph" };

/**
 * Who is in which practice and who reports to whom, the part of a person the Site Lead keeps (until it comes from the
 * HR system). Only the organisation: no skills and no profile content (docs/PLAN.md §1).
 */
export default async function SitePeople({ searchParams }: PageProps<"/site/people">) {
  await requireCan("site:manage");
  const sp = await searchParams;
  const filter = param(sp.show);
  const [practices, people] = await Promise.all([getPractices(), listPeople(getDb())]);
  const shown = people.filter((p) =>
    filter === "no-practice" ? !p.practiceId : filter === "no-manager" ? !p.managerId : true,
  );
  const counts = {
    all: people.length,
    "no-practice": people.filter((p) => !p.practiceId).length,
    "no-manager": people.filter((p) => !p.managerId).length,
  };
  const siteLeads = people.filter((p) => p.siteLead);

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">People</h1>
        <p className="mt-1 text-muted-foreground">
          Home practice and reporting lines. Wrong lines mean wrong visibility, so people without a practice
          or a manager are easy to find. You see the organisation here, never anyone&apos;s skills.
        </p>
      </header>

      <section aria-labelledby="site-leads" className="flex flex-col gap-3">
        <h2 id="site-leads" className="text-xl font-semibold">
          Site Leads
        </h2>
        <ul className="flex flex-col gap-1">
          {siteLeads.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{s.name}</span>
              <ActionForm action={removeSiteLeadAction}>
                <input type="hidden" name="userId" value={s.id} />
                <Button type="submit" size="sm" variant="ghost" aria-label={`Remove ${s.name} as Site Lead`}>
                  Remove
                </Button>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={addSiteLeadAction} className="max-w-xl flex-row flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label htmlFor="new-site-lead" className="text-xs">
              Appoint another Site Lead
            </Label>
            <ActionSelect
              id="new-site-lead"
              name="userId"
              required
              defaultValue=""
              className="w-64 max-w-full"
            >
              <option value="" disabled>
                Choose someone…
              </option>
              {people
                .filter((p) => !p.siteLead)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </ActionSelect>
          </div>
          <Button type="submit" size="sm" variant="outline">
            Appoint Site Lead
          </Button>
        </ActionForm>
      </section>

      <section aria-labelledby="everyone" className="flex flex-col gap-3">
        <h2 id="everyone" className="text-xl font-semibold">
          Everyone ({shown.length})
        </h2>
        <FilterLinks
          label="Show"
          options={[
            { label: "All", href: hrefWith("/site/people", {}, {}), active: !filter, count: counts.all },
            {
              label: "Without a practice",
              href: hrefWith("/site/people", {}, { show: "no-practice" }),
              active: filter === "no-practice",
              count: counts["no-practice"],
            },
            {
              label: "Without a manager",
              href: hrefWith("/site/people", {}, { show: "no-manager" }),
              active: filter === "no-manager",
              count: counts["no-manager"],
            },
          ]}
        />
        <ul className="divide-y rounded-lg border">
          {shown.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.email}</span>
                {p.siteLead && <Badge variant="secondary">Site Lead</Badge>}
                {p.leads.length > 0 && (
                  <Badge variant="secondary">
                    Practice Lead of{" "}
                    {p.leads.map((id) => practices.find((x) => x.id === id)?.name).join(", ")}
                  </Badge>
                )}
                {p.reports > 0 && (
                  <Badge variant="outline">
                    {p.reports} {p.reports === 1 ? "report" : "reports"}
                  </Badge>
                )}
              </div>
              <ActionForm action={setPersonAction} className="flex-row flex-wrap items-end gap-2">
                <input type="hidden" name="userId" value={p.id} />
                <div className="grid gap-1">
                  <Label htmlFor={`pr-${p.id}`} className="text-xs">
                    Practice <span className="sr-only">of {p.name}</span>
                  </Label>
                  <ActionSelect
                    id={`pr-${p.id}`}
                    name="practiceId"
                    defaultValue={p.practiceId ?? ""}
                    className="w-56 max-w-full"
                  >
                    <option value="">No practice</option>
                    {practices.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </ActionSelect>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`mg-${p.id}`} className="text-xs">
                    Reports to <span className="sr-only">({p.name})</span>
                  </Label>
                  <ActionSelect
                    id={`mg-${p.id}`}
                    name="managerId"
                    defaultValue={p.managerId ?? ""}
                    className="w-56 max-w-full"
                  >
                    <option value="">Nobody</option>
                    {people
                      .filter((x) => x.id !== p.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                  </ActionSelect>
                </div>
                <Button type="submit" size="sm" variant="outline" aria-label={`Save ${p.name}`}>
                  Save
                </Button>
              </ActionForm>
            </li>
          ))}
          {shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nobody.</li>}
        </ul>
      </section>
    </div>
  );
}
