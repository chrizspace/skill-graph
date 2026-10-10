import { notFound } from "next/navigation";
import { getPractices } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";
import { ComingSoon } from "../../coming-soon";

export default async function Page({ params }: PageProps<"/practices/[slug]">) {
  const { slug } = await params;
  const actor = await requireActor();
  // a Practice Lead sees their own practices; the Site Lead sees all of them
  const practice = (await getPractices()).find((p) => p.slug === slug);
  if (!practice || (!actor.siteLead && !actor.leadOf.some((p) => p.id === practice.id))) notFound();
  return <ComingSoon title={practice.name} milestone="M9" />;
}
