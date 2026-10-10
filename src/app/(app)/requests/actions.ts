"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/app/action-form";
import { getDb } from "@/db/client";
import {
  addComment,
  approveRequest,
  createRequest,
  EditError,
  ForbiddenError,
  rejectRequest,
  requestInfo,
  withdrawRequest,
} from "@/db/change-requests";
import { requireActor } from "@/lib/session";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const values = (formData: FormData) =>
  Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;

/** Runs one step of a request as the signed-in person; a refused or broken rule comes back as a message for the form. */
async function attempt(
  formData: FormData,
  step: (actor: Awaited<ReturnType<typeof requireActor>>) => Promise<string | void>,
  { changesGraph = false }: { changesGraph?: boolean } = {},
): Promise<ActionState> {
  const actor = await requireActor();
  try {
    const message = await step(actor);
    if (changesGraph) updateTag("graph"); // an approved request changed roles: show it at once
    revalidatePath("/requests", "layout");
    return { ok: message || "Saved." };
  } catch (e) {
    if (e instanceof EditError) return { error: e.problems.join(" "), values: values(formData) };
    if (e instanceof ForbiddenError) return { error: e.message, values: values(formData) };
    throw e;
  }
}

/** Sends the request, then opens it. `changes` is the JSON the change builder keeps in a hidden field. */
export async function createRequestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  let changes: unknown;
  try {
    changes = JSON.parse(text(formData, "changes") || "[]");
  } catch {
    return {
      error: "The list of changes couldn't be read. Reload the page and try again.",
      values: values(formData),
    };
  }
  const result = await attempt(formData, async (actor) => {
    const request = await createRequest(getDb(), actor, {
      practiceId: text(formData, "practiceId"),
      roleId: text(formData, "roleId") || null,
      reason: text(formData, "reason"),
      changes,
    });
    id = request.id;
  });
  if (result?.ok) redirect(`/requests/${id}`);
  return result;
}

export async function commentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (actor) => {
    await addComment(getDb(), actor, text(formData, "requestId"), text(formData, "body"));
    return "Comment added.";
  });
}

/** The reviewer's decision: approve, ask for more information, or reject. The button that was pressed says which. */
export async function decideAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "requestId");
  const note = text(formData, "note");
  switch (text(formData, "decision")) {
    case "approve":
      return attempt(
        formData,
        async (actor) => {
          await approveRequest(getDb(), actor, id, note);
          return "Approved: the changes are applied.";
        },
        { changesGraph: true },
      );
    case "info":
      return attempt(formData, async (actor) => {
        await requestInfo(getDb(), actor, id, note);
        return "Asked for more information.";
      });
    case "reject":
      return attempt(formData, async (actor) => {
        await rejectRequest(getDb(), actor, id, note);
        return "Rejected.";
      });
    default:
      return { error: "Choose approve, ask for information or reject.", values: values(formData) };
  }
}

export async function withdrawAction(_: ActionState, formData: FormData): Promise<ActionState> {
  return attempt(formData, async (actor) => {
    await withdrawRequest(getDb(), actor, text(formData, "requestId"));
    return "Withdrawn.";
  });
}
