"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { loadRecommendations } from "@/db/graph";
import {
  addSkills,
  answerRecommendation,
  removeItem,
  saveCertification,
  setCurrentRole,
  setSkills,
  setTarget,
} from "@/db/profile-write";
import { can } from "@/domain/access";
import type { Target } from "@/domain/graph";
import { parseCertification, skillIds, targetBySlug } from "@/domain/profile-input";
import { getGraph } from "@/lib/graph-data";
import { requireActor } from "@/lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

// every action here changes the signed-in person's own profile only: the person is never taken from the form
async function actorOrThrow() {
  const actor = await requireActor();
  if (!can(actor, "profile:edit", { id: actor.userId })) throw new Error("Not allowed");
  return actor;
}

/** Onboarding / changing role: sets the current role (a role or specialisation slug) and adds the ticked skills. */
export async function saveRole(formData: FormData) {
  const actor = await actorOrThrow();
  const graph = await getGraph();
  const target = targetBySlug(graph, text(formData, "target"));
  if (!target) throw new Error("Unknown role");
  const practiceId = graph.nodes.get(target.roleId)!.practiceId;
  const db = getDb();
  await setCurrentRole(db, actor.userId, { practiceId, role: target });
  await addSkills(db, actor.userId, skillIds(graph, formData.getAll("skill").map(String)));
  revalidatePath("/", "layout");
  redirect("/");
}

/** The skill checklist on the profile page: the skills ticked are exactly the skills held. */
export async function saveSkills(formData: FormData) {
  const actor = await actorOrThrow();
  const graph = await getGraph();
  await setSkills(getDb(), actor.userId, skillIds(graph, formData.getAll("skill").map(String)));
  revalidatePath("/", "layout");
}

export type CertificationState = { error?: string; values?: Record<string, string> } | undefined;

/** Adds a certification or changes its dates. Returns what to fix instead of throwing. */
export async function saveCertificationAction(
  _: CertificationState,
  formData: FormData,
): Promise<CertificationState> {
  const actor = await actorOrThrow();
  const values = {
    nodeId: text(formData, "nodeId"),
    obtainedOn: text(formData, "obtainedOn"),
    expiresOn: text(formData, "expiresOn"),
  };
  const parsed = parseCertification(await getGraph(), values);
  // the form resets after every action, so what was typed comes back as its defaults
  if (!parsed.ok) return { error: parsed.error, values };
  await saveCertification(getDb(), actor.userId, parsed.value);
  revalidatePath("/", "layout");
}

export async function removeCertification(formData: FormData) {
  const actor = await actorOrThrow();
  const graph = await getGraph();
  const node = graph.nodes.get(text(formData, "nodeId"));
  if (node?.type !== "certification") return;
  await removeItem(getDb(), actor.userId, node.id);
  revalidatePath("/", "layout");
}

/** Sets the target (a role or specialisation slug), or clears it when the slug is empty. */
export async function saveTarget(formData: FormData) {
  const actor = await actorOrThrow();
  const slug = text(formData, "target");
  const target = slug ? targetBySlug(await getGraph(), slug) : null;
  if (slug && !target) throw new Error("Unknown target");
  if (!(await setTarget(getDb(), actor.userId, target))) redirect("/onboarding");
  revalidatePath("/", "layout");
  if (target) redirect("/me/plan");
}

/** Accept or decline a recommendation from the manager; accepting a recommended role makes it the target. */
export async function answerRecommendationAction(formData: FormData) {
  const actor = await actorOrThrow();
  const id = text(formData, "id");
  const answer = text(formData, "answer");
  if (answer !== "accepted" && answer !== "declined") throw new Error("Unknown answer");
  const db = getDb();
  const rec = (await loadRecommendations(db, actor.userId)).find((r) => r.id === id);
  if (!rec) throw new Error("No such recommendation");
  const node = (await getGraph()).nodes.get(rec.nodeId);
  const target: Target | null =
    node?.type === "role"
      ? { roleId: node.id, specializationId: null }
      : node?.type === "specialization"
        ? { roleId: node.parentRoleId!, specializationId: node.id }
        : null;
  await answerRecommendation(db, actor.userId, id, answer, target);
  revalidatePath("/", "layout");
}
