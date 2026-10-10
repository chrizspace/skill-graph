import { Suspense } from "react";
import { ThemeSync } from "@/components/app/theme-switch";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { navigationFor } from "@/domain/navigation";
import { getDb } from "@/db/client";
import { loadTheme } from "@/db/graph";
import { requireActor } from "@/lib/session";
import { signOut } from "../actions";

// With Cache Components the session is request data, so everything that reads it streams in behind this boundary
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-64" />}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

async function SignedIn({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  const theme = await loadTheme(getDb(), actor.userId);
  return (
    <AppShell groups={navigationFor(actor)} user={actor} signOut={signOut}>
      <ThemeSync theme={theme} />
      {children}
    </AppShell>
  );
}
