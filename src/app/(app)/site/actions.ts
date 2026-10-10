"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/app/action-form";
import { getDb } from "@/db/client";
import { EditError, ForbiddenError } from "@/db/graph-write";
import {
  addSiteLead,
  appointLead,
  createPractice,
  mergeItems,
  removeLead,
  removeSiteLead,
  renameCategory,
  setItemCategory,
  setPersonManager,
  setPersonPractice,
  updatePractice,
  type SiteContext,
} from "@/db/site";
import { requireActor } from "@/lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const orNull = (formData: FormData, key: string) => text(formData, key) || null;
const values = (formData: FormData) =>
  Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/** Runs a Site Lead change as the signed-in person; a broken rule or a refusal comes back as a message for the form. */
async function attempt(
  formData: FormData,
  change: (ctx: SiteContext) => Promise<string | void>,
): Promise<ActionState> {
  const ctx: SiteContext = { actor: await requireActor() };
  try {
    const message = await change(ctx);
    updateTag("graph"); // practices, leads and the catalogue are cached with the graph
    revalidatePath("/", "layout");
    return { ok: message || "Saved." };
  } catch (e) {
    if (e instanceof EditError) return { error: e.problems.join(" "), values: values(formData) };
    if (e instanceof ForbiddenError) return { error: e.message, values: values(formData) };
    throw e;
  }
}

export async function createPracticeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    const practice = await createPractice(getDb(), ctx, {
      name: text(formData, "name"),
      description: text(formData, "description"),
      leadUserId: text(formData, "leadUserId"),
    });
    return `Created “${practice.name}”. Its Practice Lead can now open it.`;
  });
}

export async function updatePracticeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await updatePractice(getDb(), ctx, {
      id: text(formData, "id"),
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
  });
}

export async function appointLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await appointLead(getDb(), ctx, {
      practiceId: text(formData, "practiceId"),
      userId: text(formData, "userId"),
    });
    return "Appointed.";
  });
}

export async function removeLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await removeLead(getDb(), ctx, {
      practiceId: text(formData, "practiceId"),
      userId: text(formData, "userId"),
    });
    return "Removed.";
  });
}

/** Someone's home practice and manager, from one row of the people table. */
export async function setPersonAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    const userId = text(formData, "userId");
    await setPersonPractice(getDb(), ctx, { userId, practiceId: orNull(formData, "practiceId") });
    await setPersonManager(getDb(), ctx, { userId, managerId: orNull(formData, "managerId") });
  });
}

export async function addSiteLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await addSiteLead(getDb(), ctx, text(formData, "userId"));
    return "Appointed.";
  });
}

export async function removeSiteLeadAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await removeSiteLead(getDb(), ctx, text(formData, "userId"));
    return "Removed.";
  });
}

/** Merges a duplicate into the item to keep, then back to the catalogue page with what happened (or what went wrong). */
export async function mergeAction(formData: FormData): Promise<void> {
  const ctx: SiteContext = { actor: await requireActor() };
  let to = "/site/catalogue";
  try {
    const result = await mergeItems(getDb(), ctx, {
      keepId: text(formData, "keepId"),
      dropId: text(formData, "dropId"),
    });
    to = `/site/catalogue?merged=${result.people}`;
    updateTag("graph");
    revalidatePath("/", "layout");
  } catch (e) {
    if (!(e instanceof EditError || e instanceof ForbiddenError)) throw e;
    to = `/site/catalogue?error=${encodeURIComponent(e instanceof EditError ? e.problems.join(" ") : e.message)}`;
  }
  redirect(to);
}

export async function renameCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    const n = await renameCategory(getDb(), ctx, { from: text(formData, "from"), to: text(formData, "to") });
    return `Renamed on ${n} ${n === 1 ? "item" : "items"}.`;
  });
}

export async function setItemCategoryAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (ctx) => {
    await setItemCategory(getDb(), ctx, {
      itemId: text(formData, "itemId"),
      category: orNull(formData, "category"),
    });
  });
}
