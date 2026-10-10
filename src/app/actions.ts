"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, demoSignInEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/session";

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/sign-in");
}

/** Demo sign-in: the picked seeded person, never in production. */
export async function signInAsDemo(formData: FormData) {
  if (!demoSignInEnabled) throw new Error("Demo sign-in is disabled.");
  const email = String(formData.get("email") ?? "");
  await getAuth().api.signInDemo({ body: { email }, headers: await headers() });
  redirect(safeNext(String(formData.get("next") ?? "/")));
}
