import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { navigationFor } from "@/domain/navigation";
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
  return (
    <AppShell groups={navigationFor(actor)} user={actor} signOut={signOut}>
      {children}
    </AppShell>
  );
}
