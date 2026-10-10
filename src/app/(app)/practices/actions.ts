"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/app/action-form";
import { getDb } from "@/db/client";
import {
  addPath,
  addRequirement,
  createCatalogueItem,
  createRole,
  createSpecialization,
  deleteRoleLike,
  EditError,
  ForbiddenError,
  publishRoleLike,
  removePath,
  removeRequirement,
  updateRequirement,
  updateRoleLike,
  type EditContext,
} from "@/db/graph-write";
import { weights, type Weight } from "@/domain/graph";
import { requireActor } from "@/lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const optional = (formData: FormData, key: string) => text(formData, key).trim() || null;
const values = (formData: FormData) =>
  Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;
const weight = (formData: FormData): Weight => {
  const w = text(formData, "priority");
  return (weights as readonly string[]).includes(w) ? (w as Weight) : (undefined as never);
};

/**
 * Runs a change as the signed-in person. A broken rule or a refusal comes back as a message for the form (with what was
 * typed); on success the graph's cache is expired so the change shows at once (read your own writes).
 */
async function attempt(
  formData: FormData,
  change: (ctx: EditContext) => Promise<string | void>,
): Promise<ActionState> {
  const ctx: EditContext = { actor: await requireActor() };
  try {
    const message = await change(ctx);
    updateTag("graph");
    return { ok: message || "Saved." };
  } catch (e) {
    if (e instanceof EditError) return { error: e.problems.join(" "), values: values(formData) };
    if (e instanceof ForbiddenError) return { error: e.message, values: values(formData) };
    throw e;
  }
}

const db = () => getDb();

export async function createRoleAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let slug = "";
  const practiceSlug = text(formData, "practiceSlug");
  const result = await attempt(formData, async (ctx) => {
    const role = await createRole(db(), ctx, {
      practiceId: text(formData, "practiceId"),
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
    slug = role.slug;
  });
  // a new role opens in the editor, as a draft to complete
  if (result?.ok) redirect(`/practices/${practiceSlug}/roles/${slug}/edit`);
  return result;
}

export async function updateRoleLikeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await updateRoleLike(db(), ctx, {
      id: text(formData, "id"),
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
  });
}

export async function publishAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await publishRoleLike(db(), ctx, text(formData, "id"));
    return "Published: everyone can see it now.";
  });
}

export async function createSpecializationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await createSpecialization(db(), ctx, {
      roleId: text(formData, "roleId"),
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
    return "Specialisation added as a draft.";
  });
}

/** Deletes a role or specialisation, then goes to the practice page (a role) or stays on the role's editor. */
export async function deleteRoleLikeAction(formData: FormData): Promise<void> {
  const ctx: EditContext = { actor: await requireActor() };
  await deleteRoleLike(getDb(), ctx, text(formData, "id")); // a refusal throws: the confirm window only offers it when allowed
  updateTag("graph");
  // the page we go back to may be in the browser's own cache with the deleted role still on it
  revalidatePath("/", "layout");
  redirect(text(formData, "next") || "/");
}

export async function addRequirementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await addRequirement(db(), ctx, {
      ownerId: text(formData, "ownerId"),
      itemId: text(formData, "itemId"),
      priority: weight(formData),
      note: optional(formData, "note"),
    });
    return "Requirement added.";
  });
}

export async function updateRequirementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await updateRequirement(db(), ctx, {
      ownerId: text(formData, "ownerId"),
      itemId: text(formData, "itemId"),
      priority: weight(formData),
      note: text(formData, "note"),
    });
  });
}

export async function removeRequirementAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await removeRequirement(db(), ctx, {
      ownerId: text(formData, "ownerId"),
      itemId: text(formData, "itemId"),
    });
    return "Removed.";
  });
}

export async function addPathAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const months = text(formData, "typicalMonths").trim();
  return attempt(formData, async (ctx) => {
    await addPath(db(), ctx, {
      fromId: text(formData, "fromId"),
      toId: text(formData, "toId"),
      note: optional(formData, "note"),
      typicalMonths: months ? Number(months) : null,
    });
    return "Path added.";
  });
}

export async function removePathAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await removePath(db(), ctx, { fromId: text(formData, "fromId"), toId: text(formData, "toId") });
    return "Removed.";
  });
}

export async function createCatalogueItemAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    const item = await createCatalogueItem(db(), ctx, {
      type: text(formData, "type"),
      name: text(formData, "name"),
      category: optional(formData, "category"),
      issuer: optional(formData, "issuer"),
      description: text(formData, "description"),
    });
    return `Added “${item.name}” to the catalogue.`;
  });
}
