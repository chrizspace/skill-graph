import Link from "next/link";
import { redirect } from "next/navigation";
import { AssessmentList } from "@/components/domain/assessment-list";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isManager, isPracticeLead } from "@/domain/access";
import { assess } from "@/domain/assess";
import { targetLabel, type Graph } from "@/domain/graph";
import { pathsFor, type PathOption } from "@/domain/paths";
import { slugOfTarget } from "@/domain/profile-input";
import { loadMe } from "@/lib/me";
import { saveTarget } from "./me/actions";

function PathList({
  title,
  hint,
  paths,
  from,
  graph,
}: {
  title: string;
  hint: string;
  paths: PathOption[];
  from: string;
  graph: Graph;
}) {
  if (paths.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <ul className="divide-y">
        {paths.map((p) => {
          const slug = slugOfTarget(graph, p.target);
          return (
            <li key={`${p.kind}-${slug}`} className="flex flex-col gap-2 py-3">
              <ReadinessMeter readiness={p.readiness} label={p.label} />
              {p.note && <p className="text-sm text-muted-foreground">{p.note}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/compare?a=${from}&b=${slug}`} className="text-sm underline underline-offset-4">
                  Compare
                </Link>
                <form action={saveTarget}>
                  <input type="hidden" name="target" value={slug} />
                  <Button type="submit" variant="outline" size="sm">
                    Make this my target
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function Home() {
  const { actor, graph, mine, recommendations, today } = await loadMe();
  const profile = mine?.profile;
  if (!profile?.current) redirect("/onboarding");

  const types = [
    "Employee",
    ...(isManager(actor) ? ["Manager"] : []),
    ...(isPracticeLead(actor) ? ["Practice Lead"] : []),
    ...(actor.siteLead ? ["Site Lead"] : []),
  ];
  const fit = assess(graph, profile, profile.current, today);
  const targetFit = profile.target ? assess(graph, profile, profile.target, today) : null;
  const paths = pathsFor(graph, profile);
  const from = slugOfTarget(graph, profile.current);
  const open = recommendations.filter((r) => r.status === "open");
  const expiry = Object.fromEntries(profile.items.map((i) => [i.nodeId, i.expiresOn ?? null]));
  const attention = fit.met.filter((r) => r.certification === "expiring");

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {actor.name.split(" ")[0]}</h1>
        <div className="mt-2 flex flex-wrap gap-2" aria-label="Your user types">
          {types.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {open.length > 0 && (
        <p className="rounded-lg border p-4">
          <Link href="/me/plan" className="font-medium underline underline-offset-4">
            You have {open.length} new {open.length === 1 ? "recommendation" : "recommendations"} from your
            manager.
          </Link>
        </p>
      )}

      <section aria-labelledby="fit" className="flex flex-col gap-4">
        <h2 id="fit" className="text-xl font-semibold">
          How I meet my role: {targetLabel(graph, profile.current)}
        </h2>
        <ReadinessMeter readiness={fit.readiness} label="Readiness" />
        {attention.length > 0 && (
          <p role="status" className="text-sm">
            {attention.map((a) => a.item.name).join(", ")} {attention.length === 1 ? "is" : "are"} expiring
            soon.{" "}
            <Link href="/me" className="underline underline-offset-4">
              Update the dates
            </Link>
          </p>
        )}
        <AssessmentList missing={fit.missing} met={fit.met} expiry={expiry} />
      </section>

      <section aria-labelledby="target" className="flex flex-col gap-3">
        <h2 id="target" className="text-xl font-semibold">
          My target
        </h2>
        {profile.target && targetFit ? (
          <>
            <ReadinessMeter readiness={targetFit.readiness} label={targetLabel(graph, profile.target)} />
            <Link href="/me/plan" className="w-fit underline underline-offset-4">
              Open my development plan
            </Link>
          </>
        ) : (
          <p className="text-muted-foreground">
            You haven&apos;t picked a target.{" "}
            <Link href="/me" className="underline underline-offset-4">
              Choose one
            </Link>{" "}
            or start from a path below.
          </p>
        )}
      </section>

      <section aria-labelledby="paths" className="flex flex-col gap-4">
        <h2 id="paths" className="text-xl font-semibold">
          My paths
        </h2>
        <PathList
          title="Official paths"
          hint="Career moves your practice defines from your role."
          paths={paths.official}
          from={from}
          graph={graph}
        />
        <PathList
          title="Within your role"
          hint="Other specialisations of your role."
          paths={paths.specializations}
          from={from}
          graph={graph}
        />
        <PathList
          title="Suggested for you"
          hint="Suggestions, not official paths: roles you're already close to."
          paths={paths.suggested}
          from={from}
          graph={graph}
        />
      </section>
    </div>
  );
}
