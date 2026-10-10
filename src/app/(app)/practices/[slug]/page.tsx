import { ComingSoon } from "../../coming-soon";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/session";

export default async function Page({ params }: PageProps<"/practices/[slug]">) {
  const { slug } = await params;
  const actor = await requireActor();
  // a Practice Lead sees their own practices; the Site Lead sees all of them
  const practice = actor.leadOf.find((p) => p.slug === slug);
  if (!practice && !actor.siteLead) notFound();
  return <ComingSoon title={practice?.name ?? "Practice"} milestone="M9" />;
}
