import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ItemTypeBadge } from "@/components/domain/item-type-badge";
import { PriorityBadge } from "@/components/domain/priority-badge";
import { roles, specializationsOf, requirementsOf, groupByType, type Graph } from "@/domain/graph";
import { targetBySlug } from "@/domain/profile-input";
import { loadMe } from "@/lib/me";
import { hrefWith, param } from "@/lib/query";
import { saveRole } from "../me/actions";

export const metadata = { title: "Choose your role · Skill Graph" };

const stepLink =
  "block rounded-lg border p-4 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Pick the practice, role and specialisation, then review the skills the role asks for and untick what you don't
 * have (docs/PLAN.md §5). Each step is a link, so the whole flow works without JavaScript.
 */
export default async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const { graph, practices, mine } = await loadMe();
  const practice = practices.find((p) => p.slug === param(sp.practice));
  const roleNode = roles(graph).find((r) => r.slug === param(sp.role) && r.practiceId === practice?.id);
  const specs = roleNode ? specializationsOf(graph, roleNode.id) : [];
  const specParam = param(sp.spec);
  const spec = specs.find((s) => s.slug === specParam);
  const chosen = roleNode && (spec || specs.length === 0 || specParam === "none");
  const current = { practice: practice?.slug, role: roleNode?.slug, spec: specParam };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {mine?.profile.current ? "Change your role" : "Welcome: set up your profile"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {mine?.profile.current
            ? "Skills you have already declared stay on your profile."
            : "Tell us your role and we'll start your profile from what it asks for. You correct it afterwards: nobody confirms it for you."}
        </p>
      </div>

      {!practice && (
        <section aria-labelledby="step-practice" className="flex flex-col gap-3">
          <h2 id="step-practice" className="text-xl font-semibold">
            1. Your practice
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {practices.map((p) => (
              <li key={p.id}>
                <Link href={hrefWith("/onboarding", {}, { practice: p.slug })} className={stepLink}>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {practice && !roleNode && (
        <section aria-labelledby="step-role" className="flex flex-col gap-3">
          <h2 id="step-role" className="text-xl font-semibold">
            2. Your role in {practice.name}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {roles(graph)
              .filter((r) => r.practiceId === practice.id)
              .map((r) => (
                <li key={r.id}>
                  <Link href={hrefWith("/onboarding", current, { role: r.slug })} className={stepLink}>
                    <span className="font-medium">{r.name}</span>
                    <span className="line-clamp-2 block text-sm text-muted-foreground">{r.description}</span>
                  </Link>
                </li>
              ))}
          </ul>
          <Link href="/onboarding" className="w-fit text-sm underline underline-offset-4">
            Pick another practice
          </Link>
        </section>
      )}

      {roleNode && !chosen && (
        <section aria-labelledby="step-spec" className="flex flex-col gap-3">
          <h2 id="step-spec" className="text-xl font-semibold">
            3. Your specialisation as {roleNode.name}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {specs.map((s) => (
              <li key={s.id}>
                <Link href={hrefWith("/onboarding", current, { spec: s.slug })} className={stepLink}>
                  <span className="font-medium">{s.name}</span>
                  <span className="line-clamp-2 block text-sm text-muted-foreground">{s.description}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={hrefWith("/onboarding", current, { spec: "none" })} className={stepLink}>
                <span className="font-medium">No specialisation (yet)</span>
                <span className="block text-sm text-muted-foreground">Just the core of {roleNode.name}.</span>
              </Link>
            </li>
          </ul>
        </section>
      )}

      {roleNode && chosen && (
        <Review
          graph={graph}
          slug={(spec ?? roleNode).slug}
          label={spec ? `${roleNode.name}: ${spec.name}` : roleNode.name}
        />
      )}
    </div>
  );
}

function Review({ graph, slug, label }: { graph: Graph; slug: string; label: string }) {
  const target = targetBySlug(graph, slug)!;
  const requirements = requirementsOf(graph, target);
  const skills = groupByType(requirements.filter((r) => r.item.type !== "certification"));
  const certifications = requirements.filter((r) => r.item.type === "certification");
  return (
    <section aria-labelledby="step-review" className="flex flex-col gap-4">
      <h2 id="step-review" className="text-xl font-semibold">
        Your skills as {label}
      </h2>
      <p className="text-sm text-muted-foreground">
        These are the skills the role asks for. Untick the ones you don&apos;t have yet.
      </p>
      <form action={saveRole} className="flex flex-col gap-6">
        <input type="hidden" name="target" value={slug} />
        {(["technical_skill", "soft_skill"] as const).map((type) => (
          <fieldset key={type} className="flex flex-col gap-1">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <ItemTypeBadge type={type} />
            </legend>
            {skills[type].map((r) => (
              <label key={r.item.id} className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  name="skill"
                  value={r.item.id}
                  defaultChecked
                  className="size-4 accent-primary"
                />
                <span>{r.item.name}</span>
                <PriorityBadge weight={r.weight} />
              </label>
            ))}
          </fieldset>
        ))}
        {certifications.length > 0 && (
          <p className="text-sm text-muted-foreground">
            The role also asks for {certifications.map((c) => c.item.name).join(", ")}. Certifications need
            dates, so you add them on your profile afterwards.
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit">Save my profile</Button>
          <Button asChild variant="ghost">
            <Link href="/onboarding">Start over</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
