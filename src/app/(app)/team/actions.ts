"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/app/action-form";
import { getDb } from "@/db/client";
import { EditError, ForbiddenError } from "@/db/graph-write";
import { createRecommendation } from "@/db/people";
import { requireActor } from "@/lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const values = (formData: FormData) =>
  Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/** A manager recommends a role to aim for, or a skill or certification to work on, to a direct report. */
export async function recommendAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireActor();
  try {
    await createRecommendation(getDb(), actor, {
      personId: text(formData, "personId"),
      nodeId: text(formData, "nodeId"),
      comment: text(formData, "comment"),
    });
    revalidatePath("/", "layout"); // their plan and home show it as a new recommendation
    return { ok: "Recommended. They will see it in their plan and can accept or decline it." };
  } catch (e) {
    if (e instanceof EditError) return { error: e.problems.join(" "), values: values(formData) };
    if (e instanceof ForbiddenError) return { error: e.message, values: values(formData) };
    throw e;
  }
}
