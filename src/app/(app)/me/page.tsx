import Link from "next/link";
import { redirect } from "next/navigation";
import { CertificationForm } from "@/components/domain/certification-form";
import { CertificationStatus } from "@/components/domain/certification-status";
import { ThemeRadios } from "@/components/app/theme-switch";
import { ItemTypeBadge } from "@/components/domain/item-type-badge";
import { Button } from "@/components/ui/button";
import { certificationStatus } from "@/domain/profile";
import { catalogueTypes, targetLabel, type CatalogueType } from "@/domain/graph";
import { browseCatalogue } from "@/domain/browse";
import { slugOfTarget } from "@/domain/profile-input";
import { loadMe } from "@/lib/me";
import { TargetSelect } from "../target-select";
import { removeCertification, saveCertificationAction, saveSkills, saveTarget, saveTheme } from "./actions";

export const metadata = { title: "My profile · Skill Graph" };

export default async function Me() {
  const { graph, practices, mine, today } = await loadMe();
  const current = mine?.profile.current;
  if (!mine || !current) redirect("/onboarding");
  const { profile } = mine;
  const practice = practices.find((p) => p.id === mine.practiceId);
  const held = new Map(profile.items.map((i) => [i.nodeId, i]));
  const certifications = profile.items
    .filter((i) => graph.nodes.get(i.nodeId)?.type === "certification")
    .map((i) => ({ held: i, node: graph.nodes.get(i.nodeId)!, status: certificationStatus(i, today) }))
    .sort((a, b) => a.node.name.localeCompare(b.node.name));
  const addable = browseCatalogue(graph, { type: "certification" })
    .filter((e) => !held.has(e.item.id))
    .map((e) => ({ id: e.item.id, name: e.item.name }));

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <h1 className="text-3xl font-bold tracking-tight">My profile</h1>

      <section aria-labelledby="role" className="flex flex-col gap-2">
        <h2 id="role" className="text-xl font-semibold">
          My role
        </h2>
        <p>
          <span className="font-medium">{targetLabel(graph, current)}</span>
          {practice && <span className="text-muted-foreground"> · {practice.name}</span>}
        </p>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/onboarding">Change role</Link>
        </Button>
      </section>

      <section aria-labelledby="appearance" className="flex flex-col gap-2">
        <h2 id="appearance" className="text-xl font-semibold">
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground">The colours of the app. Saved on your profile.</p>
        <ThemeRadios onSave={saveTheme} />
      </section>

      <section aria-labelledby="target" className="flex flex-col gap-2">
        <h2 id="target" className="text-xl font-semibold">
          My target
        </h2>
        <p className="text-sm text-muted-foreground">
          The role you want to grow into. It drives your development plan.
        </p>
        <form action={saveTarget} className="flex flex-wrap items-end gap-3">
          <div className="w-80 max-w-full">
            <TargetSelect
              graph={graph}
              practices={practices}
              id="target-select"
              name="target"
              label="Target role"
              emptyLabel="No target"
              defaultValue={profile.target ? slugOfTarget(graph, profile.target) : ""}
            />
          </div>
          <Button type="submit">Save target</Button>
          {profile.target && (
            <Button asChild variant="link">
              <Link href="/me/plan">Open my plan</Link>
            </Button>
          )}
        </form>
      </section>

      <section aria-labelledby="skills" className="flex flex-col gap-3">
        <h2 id="skills" className="text-xl font-semibold">
          My skills
        </h2>
        <p className="text-sm text-muted-foreground">
          Tick what you have. A skill is something you have or don&apos;t: there are no levels.
        </p>
        <form action={saveSkills} className="flex flex-col gap-4">
          {catalogueTypes
            .filter((t): t is Exclude<CatalogueType, "certification"> => t !== "certification")
            .map((type) => (
              <details key={type} open={type === "soft_skill"} className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  <ItemTypeBadge type={type} className="inline-flex" />{" "}
                  <span className="font-normal text-muted-foreground">
                    ({browseCatalogue(graph, { type }).filter((e) => held.has(e.item.id)).length} of{" "}
                    {browseCatalogue(graph, { type }).length})
                  </span>
                </summary>
                <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  {browseCatalogue(graph, { type }).map(({ item }) => (
                    <li key={item.id}>
                      <label className="flex items-center gap-3 py-1.5">
                        <input
                          type="checkbox"
                          name="skill"
                          value={item.id}
                          defaultChecked={held.has(item.id)}
                          className="size-4 accent-primary"
                        />
                        {item.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          <Button type="submit" className="w-fit">
            Save skills
          </Button>
        </form>
      </section>

      <section aria-labelledby="certs" className="flex flex-col gap-3">
        <h2 id="certs" className="text-xl font-semibold">
          My certifications
        </h2>
        <p className="text-sm text-muted-foreground">
          An expired certification still counts as held. It is shown faded so you remember you earned it.
        </p>
        {certifications.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        <ul className="divide-y">
          {certifications.map(({ held: h, node, status }) => (
            <li key={node.id} className="flex flex-col gap-2 py-3">
              <CertificationStatus name={node.name} status={status} expiresOn={h.expiresOn} />
              <details>
                <summary className="w-fit cursor-pointer text-sm underline underline-offset-4">
                  Change dates or remove
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <CertificationForm
                    action={saveCertificationAction}
                    fixed={{ id: node.id, name: node.name }}
                    defaults={{ obtainedOn: h.obtainedOn, expiresOn: h.expiresOn }}
                  />
                  <form action={removeCertification}>
                    <input type="hidden" name="nodeId" value={node.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Remove {node.name}
                    </Button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        {addable.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Add a certification</h3>
            <CertificationForm action={saveCertificationAction} options={addable} />
          </div>
        )}
      </section>
    </div>
  );
}
