import Link from "next/link";
import { ActionForm, ActionSelect, ActionTextarea } from "@/components/app/action-form";
import { AssessmentList } from "@/components/domain/assessment-list";
import { CertificationStatus } from "@/components/domain/certification-status";
import { PlanSteps } from "@/components/domain/plan-steps";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { PersonData, SentRecommendation } from "@/db/people";
import { assess } from "@/domain/assess";
import { browseCatalogue } from "@/domain/browse";
import { roles, specializationsOf, targetLabel, type Graph } from "@/domain/graph";
import { pathsFor, type PathOption } from "@/domain/paths";
import { certificationAlerts, reachableRoles } from "@/domain/people";
import { developmentPlan } from "@/domain/plan";
import { slugOfTarget } from "@/domain/profile-input";
import { TYPE_LABEL } from "@/lib/graph-style";
import { recommendAction } from "./actions";

function Paths({
  title,
  hint,
  paths,
  graph,
}: {
  title: string;
  hint: string;
  paths: PathOption[];
  graph: Graph;
}) {
  if (paths.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <ul className="divide-y">
        {paths.map((p) => (
          <li key={`${p.kind}-${p.label}`} className="py-3">
            <ReadinessMeter readiness={p.readiness} label={p.label} />
            {p.note && <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>}
            <Link
              href={`/roles/${slugOfTarget(graph, p.target)}`}
              className="text-sm underline underline-offset-4"
            >
              About {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A named profile for the person's manager or the Practice Leads of their practice (docs/PLAN.md §1, Scenario 3): how
 * they meet their role, their certifications to watch, their target and plan, the official and suggested paths, the
 * roles they could reach now, and what has been recommended. A manager can recommend a next step here.
 */
export function PersonProfile({
  person,
  graph,
  practiceName,
  today,
  recommendations,
  planRecommendations,
  canRecommend,
}: {
  person: PersonData;
  graph: Graph;
  practiceName: string | null;
  today: Date;
  /** what the viewer has recommended (shown, with the form, to a manager) */
  recommendations: SentRecommendation[];
  /** every recommendation the person has received: the accepted ones are marked in their plan */
  planRecommendations: { nodeId: string; status: "open" | "accepted" | "declined" }[];
  canRecommend: boolean;
}) {
  const { profile } = person;
  const first = person.name.split(" ")[0];
  const fit = profile.current ? assess(graph, profile, profile.current, today) : null;
  const alerts = certificationAlerts(graph, profile, today);
  const expiry = Object.fromEntries(profile.items.map((i) => [i.nodeId, i.expiresOn ?? null]));
  const paths = pathsFor(graph, profile);
  const reachable = reachableRoles(graph, profile);
  const plan = profile.target
    ? developmentPlan(graph, profile, profile.target, planRecommendations, today)
    : null;
  const nameOf = (id: string) => graph.nodes.get(id)?.name ?? "something that no longer exists";

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {profile.current ? targetLabel(graph, profile.current) : "No role yet"}
          {practiceName && ` · ${practiceName}`}
        </p>
      </header>

      <section aria-labelledby="fit" className="flex flex-col gap-4">
        <h2 id="fit" className="text-xl font-semibold">
          How {first} meets their role
        </h2>
        {fit ? (
          <>
            <ReadinessMeter readiness={fit.readiness} label="Readiness for their role" />
            <AssessmentList missing={fit.missing} met={fit.met} expiry={expiry} />
          </>
        ) : (
          <p className="text-muted-foreground">{first} hasn&apos;t picked a role yet.</p>
        )}
      </section>

      <section aria-labelledby="certs" className="flex flex-col gap-2">
        <h2 id="certs" className="text-xl font-semibold">
          Certifications to watch
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">None expiring or expired.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li key={a.item.id}>
                <CertificationStatus name={a.item.name} status={a.status} expiresOn={a.expiresOn} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          An expired certification still counts as held; it is a reminder to renew.
        </p>
      </section>

      <section aria-labelledby="target" className="flex flex-col gap-3">
        <h2 id="target" className="text-xl font-semibold">
          Target and plan
        </h2>
        {plan ? (
          <>
            <ReadinessMeter readiness={plan.progress} label={`Towards ${plan.label}`} />
            <PlanSteps steps={plan.steps} />
          </>
        ) : (
          <p className="text-muted-foreground">{first} hasn&apos;t picked a target.</p>
        )}
      </section>

      <section aria-labelledby="paths" className="flex flex-col gap-4">
        <h2 id="paths" className="text-xl font-semibold">
          Possible paths
        </h2>
        <Paths
          title="Official paths"
          hint="Career moves their practice defines from their role."
          paths={paths.official}
          graph={graph}
        />
        <Paths
          title="Within their role"
          hint="Other specialisations of their role."
          paths={paths.specializations}
          graph={graph}
        />
        <Paths
          title="Suggested"
          hint="Suggestions, not official paths: roles they're already close to."
          paths={paths.suggested}
          graph={graph}
        />
      </section>

      <section aria-labelledby="reachable" className="flex flex-col gap-2">
        <h2 id="reachable" className="text-xl font-semibold">
          Roles {first} could take on now
        </h2>
        <p className="text-sm text-muted-foreground">Every Critical requirement met, and most of the rest.</p>
        {reachable.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {reachable.map((r) => (
              <li key={r.label}>
                <ReadinessMeter readiness={r.readiness} label={r.label} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {canRecommend && (
        <section aria-labelledby="recs" className="flex flex-col gap-3">
          <h2 id="recs" className="text-xl font-semibold">
            Recommendations
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t recommended anything to {first} yet.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {recommendations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{nameOf(r.nodeId)}</p>
                    {r.comment && <p className="text-muted-foreground">{r.comment}</p>}
                  </div>
                  <Badge variant={r.status === "open" ? "secondary" : "outline"}>
                    {r.status === "open"
                      ? "Waiting for an answer"
                      : r.status === "accepted"
                        ? "Accepted"
                        : "Declined"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <ActionForm
            action={recommendAction}
            submit={`Recommend to ${first}`}
            className="max-w-2xl rounded-lg border p-4"
          >
            <h3 className="text-sm font-semibold">Recommend a next step</h3>
            <input type="hidden" name="personId" value={person.id} />
            <div className="grid gap-1.5">
              <Label htmlFor="rec-node">A role to aim for, or something to work on</Label>
              <ActionSelect id="rec-node" name="nodeId" required defaultValue="" className="max-w-md">
                <option value="" disabled>
                  Choose…
                </option>
                <optgroup label="Roles and specialisations">
                  {roles(graph).flatMap((r) => [
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>,
                    ...specializationsOf(graph, r.id).map((s) => (
                      <option key={s.id} value={s.id}>
                        {r.name}: {s.name}
                      </option>
                    )),
                  ])}
                </optgroup>
                {(["technical_skill", "soft_skill", "certification"] as const).map((type) => (
                  <optgroup key={type} label={TYPE_LABEL[type]}>
                    {browseCatalogue(graph, { type }).map((e) => (
                      <option key={e.item.id} value={e.item.id}>
                        {e.item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </ActionSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-comment">Why (they read this first)</Label>
              <ActionTextarea id="rec-comment" name="comment" required maxLength={1000} />
            </div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
