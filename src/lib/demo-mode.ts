/**
 * Whether this deployment is a demo: demo sign-in is offered and the demo people are seeded. True everywhere except
 * production, where it stays off unless the owner sets ENABLE_DEMO_SIGN_IN=true (README, "Sign-in"). A demo
 * deployment lets anyone who finds the address use the app as any of the demo people, so it is for fictional data only.
 */
export function isDemoDeployment(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV !== "production" || env.ENABLE_DEMO_SIGN_IN === "true";
}
