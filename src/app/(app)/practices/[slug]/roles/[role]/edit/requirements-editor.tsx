import Link from "next/link";
import { ActionForm, ActionInput, ActionSelect } from "@/components/app/action-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { browseCatalogue } from "@/domain/browse";
import { byWeightThenName, node, outgoing, weights, type Graph } from "@/domain/graph";
import { WEIGHT_LABEL, TYPE_LABEL } from "@/lib/graph-style";
import { addRequirementAction, removeRequirementAction, updateRequirementAction } from "../../../../actions";

/** The requirements one role or specialisation owns (a specialisation's are what it adds), editable in place. */
export function RequirementsEditor({
  ownerId,
  graph,
  empty,
}: {
  ownerId: string;
  graph: Graph;
  empty: string;
}) {
  const rows = outgoing(graph, ownerId, "requires")
    .map((e) => ({ item: node(graph, e.targetId), weight: e.priority!, note: e.note }))
    .sort(byWeightThenName);
  const taken = new Set(rows.map((r) => r.item.id));
  const available = browseCatalogue(graph).filter((e) => !taken.has(e.item.id));
  const byType = (type: string) => available.filter((e) => e.item.type === type);

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.item.id} className="flex flex-wrap items-start gap-3 py-3">
            <div className="w-56 shrink-0">
              <Link
                href={`/catalogue/${r.item.slug}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {r.item.name}
              </Link>
              <p className="text-xs text-muted-foreground">{TYPE_LABEL[r.item.type]}</p>
            </div>
            <ActionForm
              action={updateRequirementAction}
              className="flex-1 flex-row flex-wrap items-end gap-2"
            >
              <input type="hidden" name="ownerId" value={ownerId} />
              <input type="hidden" name="itemId" value={r.item.id} />
              <div className="grid gap-1">
                <Label htmlFor={`w-${ownerId}-${r.item.id}`} className="text-xs">
                  Weight <span className="sr-only">of {r.item.name}</span>
                </Label>
                <ActionSelect
                  id={`w-${ownerId}-${r.item.id}`}
                  name="priority"
                  defaultValue={r.weight}
                  className="w-40"
                >
                  {weights.map((w) => (
                    <option key={w} value={w}>
                      {WEIGHT_LABEL[w]}
                    </option>
                  ))}
                </ActionSelect>
              </div>
              <div className="grid min-w-48 flex-1 gap-1">
                <Label htmlFor={`n-${ownerId}-${r.item.id}`} className="text-xs">
                  Why it matters <span className="sr-only">for {r.item.name}</span>
                </Label>
                <ActionInput
                  id={`n-${ownerId}-${r.item.id}`}
                  name="note"
                  defaultValue={r.note ?? ""}
                  maxLength={500}
                />
              </div>
              <Button type="submit" size="sm" variant="outline" aria-label={`Save ${r.item.name}`}>
                Save
              </Button>
            </ActionForm>
            <ActionForm action={removeRequirementAction}>
              <input type="hidden" name="ownerId" value={ownerId} />
              <input type="hidden" name="itemId" value={r.item.id} />
              <Button type="submit" size="sm" variant="ghost" aria-label={`Remove ${r.item.name}`}>
                Remove
              </Button>
            </ActionForm>
          </li>
        ))}
      </ul>

      <ActionForm
        action={addRequirementAction}
        className="flex-row flex-wrap items-end gap-2 rounded-lg border p-3"
        submit="Add requirement"
      >
        <input type="hidden" name="ownerId" value={ownerId} />
        <div className="grid gap-1">
          <Label htmlFor={`add-item-${ownerId}`} className="text-xs">
            Skill or certification
          </Label>
          <ActionSelect
            id={`add-item-${ownerId}`}
            name="itemId"
            required
            defaultValue=""
            className="w-64 max-w-full"
          >
            <option value="" disabled>
              Choose…
            </option>
            {(["technical_skill", "soft_skill", "certification"] as const).map((type) => (
              <optgroup key={type} label={TYPE_LABEL[type]}>
                {byType(type).map((e) => (
                  <option key={e.item.id} value={e.item.id}>
                    {e.item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </ActionSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`add-w-${ownerId}`} className="text-xs">
            Weight
          </Label>
          <ActionSelect
            id={`add-w-${ownerId}`}
            name="priority"
            required
            defaultValue="important"
            className="w-40"
          >
            {weights.map((w) => (
              <option key={w} value={w}>
                {WEIGHT_LABEL[w]}
              </option>
            ))}
          </ActionSelect>
        </div>
        <div className="grid min-w-48 flex-1 gap-1">
          <Label htmlFor={`add-note-${ownerId}`} className="text-xs">
            Why it matters (optional)
          </Label>
          <ActionInput id={`add-note-${ownerId}`} name="note" maxLength={500} />
        </div>
      </ActionForm>
    </div>
  );
}
