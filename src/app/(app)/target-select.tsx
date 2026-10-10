import { NativeSelect } from "@/components/ui/native-select";
import { targetChoices } from "@/domain/browse";
import type { Graph } from "@/domain/graph";
import type { PracticeInfo } from "@/db/graph";

/** A select of every role and specialisation, by practice. Its value is the role's or specialisation's slug. */
export function TargetSelect({
  graph,
  practices,
  name,
  defaultValue,
  emptyLabel,
  id,
  label,
}: {
  graph: Graph;
  practices: PracticeInfo[];
  name: string;
  defaultValue?: string;
  /** the label of the empty option; leave out to require a choice */
  emptyLabel?: string;
  id: string;
  label: string;
}) {
  return (
    <NativeSelect
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      aria-label={label}
      required={!emptyLabel}
    >
      {emptyLabel ? (
        <option value="">{emptyLabel}</option>
      ) : (
        <option value="" disabled>
          Choose a role…
        </option>
      )}
      {targetChoices(graph).map((g) => (
        <optgroup key={g.practiceId} label={practices.find((p) => p.id === g.practiceId)?.name ?? "Other"}>
          {g.options.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
