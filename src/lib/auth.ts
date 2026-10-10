import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as z from "zod";
import { getDb } from "@/db/client";
import { DEMO_EMAIL_DOMAIN } from "@/db/actor";
import * as schema from "@/db/schema";

const production = process.env.VERCEL_ENV === "production";

/** Demo sign-in picks a seeded person without a password: everywhere except production (docs/PLAN.md §2). */
export const demoSignInEnabled = !production;
export const microsoftConfigured = Boolean(
  process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
);

/** POST /api/auth/sign-in/demo { email }: a session for a seeded demo person. Refuses in production and for real addresses. */
const demoSignIn = {
  id: "demo-sign-in",
  endpoints: {
    signInDemo: createAuthEndpoint(
      "/sign-in/demo",
      { method: "POST", body: z.object({ email: z.email() }) },
      async (ctx) => {
        const email = ctx.body.email.toLowerCase();
        if (!demoSignInEnabled || !email.endsWith(DEMO_EMAIL_DOMAIN)) {
          throw APIError.from("FORBIDDEN", {
            code: "DEMO_SIGN_IN_DISABLED",
            message: "Demo sign-in is disabled.",
          });
        }
        const found = await ctx.context.internalAdapter.findUserByEmail(email);
        if (!found) {
          throw APIError.from("NOT_FOUND", { code: "DEMO_USER_NOT_FOUND", message: "No such demo person." });
        }
        const session = await ctx.context.internalAdapter.createSession(found.user.id);
        await setSessionCookie(ctx, { session, user: found.user });
        return ctx.json({ ok: true });
      },
    ),
  },
} satisfies BetterAuthPlugin;

/**
 * Production needs its own BETTER_AUTH_SECRET (README, "Sign-in"). Without it sign-in is switched off at runtime
 * instead of failing at import: Next imports this file while building, and a throw here broke every production build.
 */
export const authConfigured = !production || Boolean(process.env.BETTER_AUTH_SECRET);

/** BETTER_AUTH_URL if set; else this Vercel deployment's URL (production domain, or the preview's); else localhost. */
function baseUrl() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const host = production ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

// Microsoft sign-in is for production only (Entra has no wildcard redirect URIs, so previews can't use it);
// demo sign-in needs no redirect and works everywhere else
function createAuth() {
  if (!authConfigured) throw new Error("BETTER_AUTH_SECRET is not set (see README, Sign-in).");
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    baseURL: baseUrl(),
    // outside production the demo sign-in is open anyway, so a fixed fallback secret does no harm there
    secret: process.env.BETTER_AUTH_SECRET ?? "skill-graph-demo-secret-not-for-production",
    socialProviders: microsoftConfigured
      ? {
          microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
          },
        }
      : {},
    plugins: [demoSignIn, nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so importing this file (e.g. while Next collects routes at build time) needs no database. */
export function getAuth() {
  return (instance ??= createAuth());
}
