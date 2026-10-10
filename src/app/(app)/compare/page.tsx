import { ComparisonTable } from "@/components/domain/comparison-table";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { assess, compare } from "@/domain/assess";
import { targetLabel } from "@/domain/graph";
import { slugOfTarget, targetBySlug } from "@/domain/profile-input";
import { loadMe } from "@/lib/me";
import { param } from "@/lib/query";
import { TargetSelect } from "../target-select";

export const metadata = { title: "Compare roles · Skill Graph" };

export default async function Compare({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const { graph, practices, mine, today } = await loadMe();
  const profile = mine?.profile;
  const aSlug = param(sp.a) ?? (profile?.current ? slugOfTarget(graph, profile.current) : undefined);
  const bSlug = param(sp.b) ?? (profile?.target ? slugOfTarget(graph, profile.target) : undefined);
  const a = aSlug ? targetBySlug(graph, aSlug) : null;
  const b = bSlug ? targetBySlug(graph, bSlug) : null;
  const result = a && b ? compare(graph, a, b, profile, today) : null;
  const fit = b && profile ? assess(graph, profile, b, today) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compare roles</h1>
        <p className="mt-1 text-muted-foreground">
          What two roles share and what the move adds{profile ? ", checked against your own profile" : ""}.
        </p>
      </div>

      <form action="/compare" className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="a">From</Label>
          <div className="w-64 max-w-full">
            <TargetSelect
              graph={graph}
              practices={practices}
              id="a"
              name="a"
              label="From"
              defaultValue={aSlug}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="b">To</Label>
          <div className="w-64 max-w-full">
            <TargetSelect
              graph={graph}
              practices={practices}
              id="b"
              name="b"
              label="To"
              defaultValue={bSlug}
            />
          </div>
        </div>
        <Button type="submit">Compare</Button>
      </form>

      {result && a && b ? (
        <>
          <h2 className="text-xl font-semibold" aria-live="polite">
            {targetLabel(graph, a)} → {targetLabel(graph, b)}
          </h2>
          {fit && (
            <ReadinessMeter readiness={fit.readiness} label={`Your readiness for ${targetLabel(graph, b)}`} />
          )}
          <ComparisonTable
            fromLabel={targetLabel(graph, a)}
            toLabel={targetLabel(graph, b)}
            shared={result.shared}
            onlyTo={result.onlyB}
            onlyFrom={result.onlyA}
          />
        </>
      ) : (
        <p className="text-muted-foreground">Pick two roles to compare.</p>
      )}
    </div>
  );
}
