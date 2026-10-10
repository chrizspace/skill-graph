import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listDemoPeople, loadActor } from "@/db/actor";
import { getDb } from "@/db/client";
import { MicrosoftButton } from "@/components/app/microsoft-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isManager, isPracticeLead } from "@/domain/access";
import { demoSignInEnabled, microsoftConfigured } from "@/lib/auth";
import { getActor, safeNext } from "@/lib/session";
import { signInAsDemo } from "../actions";

export const metadata = { title: "Sign in · Skill Graph" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function SignIn({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const next = safeNext((await searchParams).next);
  if (await getActor()) redirect(next);

  const db = getDb();
  const people = demoSignInEnabled
    ? await Promise.all(
        (await listDemoPeople(db)).map(async (p) => {
          const actor = (await loadActor(db, p.id))!;
          const types = [
            ...(actor.siteLead ? ["Site Lead"] : []),
            ...(isPracticeLead(actor) ? ["Practice Lead"] : []),
            ...(isManager(actor) ? ["Manager"] : []),
          ];
          return { ...p, types: types.length ? types.join(", ") : "Employee" };
        }),
      )
    : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Skill Graph</h1>
        <p className="mt-2 text-muted-foreground">
          See how roles, skills and certifications connect, find the gap to the role you want, and plan your
          next step.
        </p>
      </div>
      {microsoftConfigured && <MicrosoftButton next={next} />}
      {!microsoftConfigured && !demoSignInEnabled && (
        <p role="alert">Sign-in isn&apos;t configured. Ask the administrator.</p>
      )}
      {demoSignInEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Demo sign-in</CardTitle>
            <CardDescription>
              Pick a fictional person to try the app as. This is only available outside production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {people.map((p) => (
                <li key={p.id}>
                  <form action={signInAsDemo}>
                    <input type="hidden" name="email" value={p.email} />
                    <input type="hidden" name="next" value={next} />
                    <Button type="submit" variant="outline" className="h-auto w-full justify-start py-2">
                      <span className="flex flex-col items-start">
                        <span>{p.name}</span>
                        <span className="text-xs font-normal text-muted-foreground">{p.types}</span>
                      </span>
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
