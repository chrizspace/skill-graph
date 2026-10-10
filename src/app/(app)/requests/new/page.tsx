import Link from "next/link";
import { ActionForm, ActionTextarea } from "@/components/app/action-form";
import { ChangeBuilder, type BuilderData } from "@/components/app/change-builder";
import { Label } from "@/components/ui/label";
import { browseCatalogue } from "@/domain/browse";
import { byWeightThenName, node, outgoing, roles, specializationsOf, targetLabel } from "@/domain/graph";
import { getGraph, getPractices } from "@/lib/graph-data";
import { param } from "@/lib/query";
import { requireCan } from "@/lib/session";
import { createRequestAction } from "../actions";

export const metadata = { title: "New change request · Skill Graph" };

const step =
  "block rounded-lg border p-4 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * Practice, then the role (or "a new role"), then what should change. The first two steps are links, so they work
 * without JavaScript; the last one is the change builder.
 */
export default async function NewRequest({ searchParams }: PageProps<"/requests/new">) {
  const sp = await searchParams;
  await requireCan("changeRequest:create", { practiceId: "" });
  const [graph, practices] = await Promise.all([getGraph(), getPractices()]);
  const practice = practices.find((p) => p.slug === param(sp.practice));
  const roleParam = param(sp.role);

  if (!practice) {
    return (
      <Page>
        <h2 className="text-xl font-semibold">1. Which practice should review it?</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {practices.map((p) => (
            <li key={p.id}>
              <Link href={`/requests/new?practice=${p.slug}`} className={step}>
                <span className="font-medium">{p.name}</span>
                <span className="block text-sm text-muted-foreground">
                  Led by {p.leads.join(", ") || "no one yet"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Page>
    );
  }

  const roleNodes = roles(graph).filter((r) => r.practiceId === practice.id);
  const subject = roleNodes
    .flatMap((r) => [r, ...specializationsOf(graph, r.id)])
    .find((n) => n.slug === roleParam);
  const proposing = roleParam === "new";

  if (!subject && !proposing) {
    return (
      <Page>
        <h2 className="text-xl font-semibold">2. What is it about? ({practice.name})</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {roleNodes
            .flatMap((r) => [r, ...specializationsOf(graph, r.id)])
            .map((n) => (
              <li key={n.id}>
                <Link href={`/requests/new?practice=${practice.slug}&role=${n.slug}`} className={step}>
                  <span className="font-medium">
                    {n.type === "specialization"
                      ? targetLabel(graph, { roleId: n.parentRoleId!, specializationId: n.id })
                      : n.name}
                  </span>
                </Link>
              </li>
            ))}
          <li>
            <Link href={`/requests/new?practice=${practice.slug}&role=new`} className={step}>
              <span className="font-medium">A new role</span>
              <span className="block text-sm text-muted-foreground">
                Propose a role {practice.name} doesn&apos;t have yet.
              </span>
            </Link>
          </li>
        </ul>
        <Link href="/requests/new" className="w-fit text-sm underline underline-offset-4">
          Pick another practice
        </Link>
      </Page>
    );
  }

  const data: BuilderData = {
    about: proposing ? "new_role" : subject!.type === "specialization" ? "specialization" : "role",
    items: browseCatalogue(graph).map((e) => ({
      id: e.item.id,
      name: e.item.name,
      type: e.item.type as BuilderData["items"][number]["type"],
    })),
    requirements: subject
      ? outgoing(graph, subject.id, "requires")
          .map((e) => ({ item: node(graph, e.targetId), weight: e.priority!, note: e.note ?? "" }))
          .sort(byWeightThenName)
          .map((r) => ({ itemId: r.item.id, name: r.item.name, weight: r.weight, note: r.note }))
      : [],
    paths: subject
      ? outgoing(graph, subject.id, "next_step").map((e) => ({ toId: e.targetId, label: nameOf(e.targetId) }))
      : [],
    targets: roles(graph)
      .flatMap((r) => [r, ...specializationsOf(graph, r.id)])
      .filter((n) => n.id !== subject?.id)
      .map((n) => ({ id: n.id, label: nameOf(n.id) })),
    description: subject?.description ?? "",
  };
  function nameOf(id: string) {
    const n = node(graph, id);
    return n.type === "specialization"
      ? targetLabel(graph, { roleId: n.parentRoleId!, specializationId: n.id })
      : n.name;
  }
  const title = subject ? nameOf(subject.id) : "A new role";

  return (
    <Page>
      <h2 className="text-xl font-semibold">
        3. {subject ? `What should change for ${title}?` : `Propose a new role for ${practice.name}`}
      </h2>
      <p className="text-sm text-muted-foreground">
        {practice.name}&apos;s Practice Leads review it. Add every change you want; they approve, ask for more
        information or reject it.
      </p>
      <ActionForm action={createRequestAction} submit="Send the request" className="max-w-3xl gap-5">
        <input type="hidden" name="practiceId" value={practice.id} />
        <input type="hidden" name="roleId" value={subject?.id ?? ""} />
        <ChangeBuilder data={data} />
        <div className="grid gap-1.5">
          <Label htmlFor="reason">Why? (the reviewers read this first)</Label>
          <ActionTextarea id="reason" name="reason" required maxLength={2000} />
        </div>
      </ActionForm>
      <Link
        href={`/requests/new?practice=${practice.slug}`}
        className="w-fit text-sm underline underline-offset-4"
      >
        Choose something else
      </Link>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">New change request</h1>
      {children}
    </div>
  );
}
