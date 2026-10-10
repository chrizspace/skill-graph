import Link from "next/link";
import { redirect } from "next/navigation";
import { CertificationStatus } from "@/components/domain/certification-status";
import { PlanSteps } from "@/components/domain/plan-steps";
import { ReadinessMeter } from "@/components/domain/readiness-meter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { developmentPlan } from "@/domain/plan";
import { targetLabel } from "@/domain/graph";
import { slugOfTarget } from "@/domain/profile-input";
import { loadMe } from "@/lib/me";
import { answerRecommendationAction } from "../actions";

export const metadata = { title: "My development plan · Skill Graph" };

export default async function Plan() {
  const { graph, mine, recommendations, today } = await loadMe();
  if (!mine?.profile.current) redirect("/onboarding");
  const { profile } = mine;
  const open = recommendations.filter((r) => r.status === "open");
  const plan = profile.target
    ? developmentPlan(graph, profile, profile.target, recommendations, today)
    : null;
  const expiry = new Map(profile.items.map((i) => [i.nodeId, i.expiresOn]));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">My development plan</h1>

      {open.length > 0 && (
        <section aria-labelledby="recs" className="flex flex-col gap-3">
          <h2 id="recs" className="text-xl font-semibold">
            Recommendations from your manager
          </h2>
          <ul className="flex flex-col gap-3">
            {open.map((r) => {
              const node = graph.nodes.get(r.nodeId)!;
              const isTarget = node.type === "role" || node.type === "specialization";
              const label = isTarget
                ? targetLabel(
                    graph,
                    node.type === "role"
                      ? { roleId: node.id }
                      : { roleId: node.parentRoleId!, specializationId: node.id },
                  )
                : node.name;
              return (
                <li key={r.id}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {r.author ?? "Your manager"} suggests {isTarget ? "a target:" : "working on"}{" "}
                        <Link
                          href={
                            isTarget
                              ? `/roles/${node.type === "role" ? node.slug : graph.nodes.get(node.parentRoleId!)!.slug}`
                              : `/catalogue/${node.slug}`
                          }
                          className="underline underline-offset-4"
                        >
                          {label}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {r.comment && <p className="text-sm text-muted-foreground">“{r.comment}”</p>}
                      <form action={answerRecommendationAction} className="flex gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" name="answer" value="accepted">
                          {isTarget ? "Accept as my target" : "Accept"}
                        </Button>
                        <Button type="submit" name="answer" value="declined" variant="outline">
                          Decline
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!plan ? (
        <section className="flex flex-col gap-3">
          <p>
            You haven&apos;t picked a target yet. Choose the role you want to grow into and the plan appears
            here.
          </p>
          <Button asChild className="w-fit">
            <Link href="/me">Choose a target</Link>
          </Button>
        </section>
      ) : (
        <>
          <section aria-labelledby="progress" className="flex flex-col gap-3">
            <h2 id="progress" className="text-xl font-semibold">
              Towards {plan.label}
            </h2>
            <ReadinessMeter readiness={plan.progress} label="Progress" />
            <p className="text-sm">
              <Link
                href={`/compare?a=${slugOfTarget(graph, profile.current!)}&b=${slugOfTarget(graph, plan.target)}`}
                className="underline underline-offset-4"
              >
                Compare {targetLabel(graph, profile.current!)} with {plan.label}
              </Link>
            </p>
          </section>

          <section aria-labelledby="steps" className="flex flex-col gap-2">
            <h2 id="steps" className="text-xl font-semibold">
              What to learn, in order
            </h2>
            <p className="text-sm text-muted-foreground">
              Critical before Important before Nice to have; within a weight, what other skills build on comes
              first.
            </p>
            <PlanSteps steps={plan.steps} />
          </section>

          {plan.recommendedExtras.length > 0 && (
            <section aria-labelledby="extras" className="flex flex-col gap-2">
              <h2 id="extras" className="text-xl font-semibold">
                Also recommended
              </h2>
              <ul className="list-disc pl-5">
                {plan.recommendedExtras.map((n) => (
                  <li key={n.id}>
                    <Link href={`/catalogue/${n.slug}`} className="underline underline-offset-4">
                      {n.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.toRenew.length > 0 && (
            <section aria-labelledby="renew" className="flex flex-col gap-2">
              <h2 id="renew" className="text-xl font-semibold">
                Worth renewing
              </h2>
              <ul className="flex flex-col gap-2">
                {plan.toRenew.map((r) => (
                  <li key={r.item.id}>
                    <CertificationStatus
                      name={r.item.name}
                      status={r.certification!}
                      expiresOn={expiry.get(r.item.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
