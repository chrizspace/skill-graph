import { ActionForm, ActionInput, ActionSelect } from "@/components/app/action-form";
import { ConfirmButton } from "@/components/app/confirm-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getDb } from "@/db/client";
import { listCategories, mergeImpact } from "@/db/site";
import { browseCatalogue } from "@/domain/browse";
import { WEIGHT_LABEL, TYPE_LABEL } from "@/lib/graph-style";
import { getGraph } from "@/lib/graph-data";
import { param } from "@/lib/query";
import { requireCan } from "@/lib/session";
import { mergeAction, renameCategoryAction, setItemCategoryAction } from "../actions";

export const metadata = { title: "Catalogue maintenance · Skill Graph" };

const TYPES = ["technical_skill", "soft_skill", "certification"] as const;

/** Merging duplicates and keeping categories (docs/PLAN.md §1 "Site Lead"). Adding items is for Practice Leads too: on /catalogue. */
export default async function SiteCatalogue({ searchParams }: PageProps<"/site/catalogue">) {
  await requireCan("catalogue:manage");
  const sp = await searchParams;
  const keepId = param(sp.keep);
  const dropId = param(sp.drop);
  const [graph, categories] = await Promise.all([getGraph(), listCategories(getDb())]);
  const items = browseCatalogue(graph);
  const keep = keepId ? graph.nodes.get(keepId) : undefined;
  const drop = dropId ? graph.nodes.get(dropId) : undefined;
  const impact = keep && drop ? await mergeImpact(getDb(), keep.id, drop.id) : null;
  const merged = param(sp.merged);
  const error = param(sp.error);

  const picker = (name: string, label: string, value?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`m-${name}`}>{label}</Label>
      <select
        id={`m-${name}`}
        name={name}
        defaultValue={value ?? ""}
        required
        className="h-8 w-72 max-w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm"
      >
        <option value="" disabled>
          Choose…
        </option>
        {TYPES.map((type) => (
          <optgroup key={type} label={TYPE_LABEL[type]}>
            {items
              .filter((e) => e.item.type === type)
              .map((e) => (
                <option key={e.item.id} value={e.item.id}>
                  {e.item.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Catalogue maintenance</h1>
        <p className="mt-1 text-muted-foreground">
          Merge duplicates and keep the categories tidy. Practice Leads add new items on the catalogue page.
        </p>
      </header>

      {merged !== undefined && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          Merged.{" "}
          {merged === "0"
            ? "Nobody held the duplicate."
            : `${merged} ${merged === "1" ? "person now holds" : "people now hold"} the item you kept.`}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <section aria-labelledby="merge" className="flex flex-col gap-4">
        <h2 id="merge" className="text-xl font-semibold">
          Merge duplicates
        </h2>
        <p className="text-sm text-muted-foreground">
          Everything that points at the duplicate points at the item you keep instead: requirements (a role
          that had both keeps the stronger weight), dependencies, the people who hold it, and recommendations.
          Then the duplicate is deleted. Both must be of the same type.
        </p>
        <form action="/site/catalogue" className="flex flex-wrap items-end gap-3">
          {picker("keep", "Keep", keepId)}
          {picker("drop", "Merge into it (this one is deleted)", dropId)}
          <Button type="submit" variant="outline">
            Show what it would do
          </Button>
        </form>
        {impact && keep && drop && (
          <div className="flex flex-col gap-3 rounded-lg border p-4" aria-live="polite">
            <h3 className="font-semibold">
              Merge “{drop.name}” into “{keep.name}”
            </h3>
            {impact.problems.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-destructive">
                {impact.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    {impact.requirementsMoved} requirements move to “{keep.name}”.
                  </li>
                  {impact.requirementConflicts.map((c) => (
                    <li key={c.owner}>
                      {c.owner} required both: it keeps the stronger weight (
                      {WEIGHT_LABEL[c.result as keyof typeof WEIGHT_LABEL]}).
                    </li>
                  ))}
                  <li>
                    {impact.linksMoved} dependency or related links move; {impact.linksDropped} are dropped
                    because they would double up or loop.
                  </li>
                  <li>
                    {impact.people} {impact.people === 1 ? "person holds" : "people hold"} “{drop.name}”: they
                    will hold “{keep.name}” instead.
                  </li>
                  <li>
                    {impact.recommendations}{" "}
                    {impact.recommendations === 1 ? "recommendation moves" : "recommendations move"}.
                  </li>
                </ul>
                <div>
                  <ConfirmButton
                    action={mergeAction}
                    label={`Merge “${drop.name}” into “${keep.name}”`}
                    title={`Delete “${drop.name}”?`}
                    confirmLabel="Merge and delete the duplicate"
                    fields={{ keepId: keep.id, dropId: drop.id }}
                  >
                    <p>
                      “{drop.name}” will be deleted and everything that pointed at it will point at “
                      {keep.name}”. It can&apos;t be undone; the audit log keeps a record.
                    </p>
                  </ConfirmButton>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="categories" className="flex flex-col gap-3">
        <h2 id="categories" className="text-xl font-semibold">
          Categories
        </h2>
        <p className="text-sm text-muted-foreground">
          Renaming a category renames it on every item that has it; give two categories the same name to merge
          them.
        </p>
        <ul className="divide-y rounded-lg border">
          {categories.map((c) => (
            <li key={c.category} className="flex flex-wrap items-end gap-3 p-3">
              <ActionForm action={renameCategoryAction} className="flex-row flex-wrap items-end gap-2">
                <input type="hidden" name="from" value={c.category} />
                <div className="grid gap-1">
                  <Label htmlFor={`cat-${c.category}`} className="text-xs">
                    {c.n} {c.n === 1 ? "item" : "items"} in
                  </Label>
                  <ActionInput
                    id={`cat-${c.category}`}
                    name="to"
                    defaultValue={c.category}
                    required
                    maxLength={80}
                    className="w-64 max-w-full"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  aria-label={`Rename the category ${c.category}`}
                >
                  Rename
                </Button>
              </ActionForm>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No categories yet.</li>
          )}
        </ul>
        <ActionForm
          action={setItemCategoryAction}
          className="max-w-3xl flex-row flex-wrap items-end gap-2 rounded-lg border p-3"
        >
          <div className="grid gap-1">
            <Label htmlFor="ic-item" className="text-xs">
              Put an item in a category
            </Label>
            <ActionSelect id="ic-item" name="itemId" required defaultValue="" className="w-64 max-w-full">
              <option value="" disabled>
                Choose an item…
              </option>
              {items.map((e) => (
                <option key={e.item.id} value={e.item.id}>
                  {e.item.name}
                </option>
              ))}
            </ActionSelect>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="ic-category" className="text-xs">
              Category (empty: none)
            </Label>
            <ActionInput
              id="ic-category"
              name="category"
              list="known-categories"
              maxLength={80}
              className="w-64 max-w-full"
            />
            <datalist id="known-categories">
              {categories.map((c) => (
                <option key={c.category} value={c.category} />
              ))}
            </datalist>
          </div>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </ActionForm>
      </section>
    </div>
  );
}
