import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { loadActor } from "@/db/actor";
import { getDb } from "@/db/client";
import { can, type Action, type Actor, type Resources } from "@/domain/access";
import { auth } from "./auth";

/** The signed-in person with their user types, or null. One lookup per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? loadActor(getDb(), session.user.id) : null;
});

/** For pages and actions that need a person: sends everyone else to sign in. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  return actor;
}

/** Checks one capability with `can()` on the server. A denied page is a 404, so it doesn't reveal what exists. */
export async function requireCan<A extends Action>(
  action: A,
  ...resource: Resources[A] extends undefined ? [] : [Resources[A]]
): Promise<Actor> {
  const actor = await requireActor();
  if (!can(actor, action, ...resource)) notFound();
  return actor;
}

/** Only same-site paths, so the sign-in page can't be used to send someone elsewhere. */
export function safeNext(next: string | string[] | undefined) {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

/** The pages of a manager's team: for people with direct reports only. */
export async function requireTeam(): Promise<Actor> {
  const actor = await requireActor();
  return requireCan("aggregates:view", { kind: "team", managerId: actor.userId });
}
