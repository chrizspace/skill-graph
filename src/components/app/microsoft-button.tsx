"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Starts the Microsoft (Entra ID) sign-in and returns to `next`. */
export function MicrosoftButton({ next }: { next: string }) {
  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => authClient.signIn.social({ provider: "microsoft", callbackURL: next })}
    >
      Sign in with Microsoft
    </Button>
  );
}
