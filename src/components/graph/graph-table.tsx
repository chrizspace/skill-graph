import { Button } from "@/components/ui/button";
import type { MyState } from "@/domain/explore";
import type { Weight } from "@/domain/graph";
import { WEIGHT_LABEL } from "@/lib/graph-style";

export interface TableRow {
  id: string;
  name: string;
  type: string;
  /** the weight for the role in focus, if any */
  weight: Weight | null;
  /** how the person stands, when "my view" is on */
  state: MyState | null;
  links: number;
}

const STATE_LABEL: Record<MyState, string> = {
  met: "I have it",
  expiring: "Have it, expiring",
  expired: "Have it, expired",
  missing: "Still to learn",
};

/** The same nodes as the drawing, as a table: the accessible way to read and walk the graph. */
export function GraphTable({
  rows,
  caption,
  showState,
  onFocus,
}: {
  rows: readonly TableRow[];
  caption: string;
  showState?: boolean;
  onFocus: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <caption className="p-3 text-left text-sm text-muted-foreground">{caption}</caption>
        <thead className="border-y bg-muted text-xs uppercase">
          <tr>
            <th scope="col" className="px-3 py-2">
              Name
            </th>
            <th scope="col" className="px-3 py-2">
              Type
            </th>
            <th scope="col" className="px-3 py-2">
              Weight
            </th>
            {showState && (
              <th scope="col" className="px-3 py-2">
                Me
              </th>
            )}
            <th scope="col" className="px-3 py-2 text-right">
              Links
            </th>
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="px-3 py-2 font-medium">
                {r.name}
              </th>
              <td className="px-3 py-2">{r.type}</td>
              <td className="px-3 py-2">{r.weight ? WEIGHT_LABEL[r.weight] : ""}</td>
              {showState && <td className="px-3 py-2">{r.state ? STATE_LABEL[r.state] : ""}</td>}
              <td className="px-3 py-2 text-right tabular-nums">{r.links}</td>
              <td className="px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFocus(r.id)}
                  aria-label={`Focus on ${r.name}`}
                >
                  Focus
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
