/**
 * `pnpm smoke <url> [--production | --demo]`: a quick check that a deployed copy of the app is alive and behaves.
 *   --production  the real site: no demo sign-in may be offered, and sign-in is either Microsoft or switched off
 *   --demo        a preview or local build: signs in as a demo person and checks Scenario 1 and a few pages
 * Without a flag it only checks what any copy must do. Exits 1 if anything fails.
 * What it can't check, because it needs a real Microsoft account, is printed at the end (docs/PLAN.md §11, "Release").
 */
const [url, ...flags] = process.argv.slice(2);
if (!url) {
  console.error("Usage: pnpm smoke <url> [--production | --demo]");
  process.exit(2);
}
const base = url.replace(/\/$/, "");
const production = flags.includes("--production");
const demo = flags.includes("--demo");

let failed = 0;
const check = (ok: boolean, what: string, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${what}${detail && !ok ? `: ${detail}` : ""}`);
  if (!ok) failed++;
};

const get = (path: string, init: RequestInit = {}) => fetch(base + path, { redirect: "manual", ...init });

const signIn = await get("/sign-in");
const html = await signIn.text();
check(signIn.status === 200, "the sign-in page loads", String(signIn.status));
check(/<title>[^<]*Sign in/.test(html), "it is the sign-in page");

const home = await get("/");
check(
  [302, 303, 307, 308].includes(home.status) && (home.headers.get("location") ?? "").includes("/sign-in"),
  "a signed-out visitor is sent to sign in",
  `${home.status} ${home.headers.get("location")}`,
);

const protectedPage = await get("/team");
check(
  [302, 303, 307, 308].includes(protectedPage.status),
  "other pages are closed to a signed-out visitor too",
  String(protectedPage.status),
);

const session = await get("/api/auth/get-session");
check([200, 401, 503].includes(session.status), "the sign-in service answers", String(session.status));

const offersMicrosoft = html.includes("Sign in with Microsoft");
const offersDemo = html.includes("Demo sign-in");
const switchedOff = /isn(&#x27;|')t configured/.test(html);
console.log(
  `  sign-in here: ${offersMicrosoft ? "Microsoft" : ""}${offersDemo ? " demo" : ""}${switchedOff ? " switched off (no secret or no Microsoft settings)" : ""}`,
);

if (production) {
  check(!offersDemo, "production does not offer the demo sign-in");
  const demoApi = await get("/api/auth/sign-in/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "alex.rivera@example.com" }),
  });
  check(demoApi.status >= 400, "and the demo sign-in endpoint refuses", String(demoApi.status));
  check(offersMicrosoft || switchedOff, "sign-in is Microsoft, or off until it is set up");
}

if (demo) {
  check(offersDemo, "the demo sign-in is offered");
  const login = await get("/api/auth/sign-in/demo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "alex.rivera@example.com" }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  check(
    login.status === 200 && cookie.includes("="),
    "signing in as a demo person works",
    String(login.status),
  );
  const page = async (path: string) => {
    const r = await get(path, { headers: { cookie } });
    // React separates text pieces with comments ("Welcome, <!-- -->Alex"): read the text without them
    return { status: r.status, text: (await r.text()).replace(/<!--.*?-->/g, "") };
  };
  for (const [path, expect] of [
    ["/", "Welcome, Alex"],
    ["/roles/scrum-master", "Similar roles"],
    ["/catalogue/sql", "Roles that need it"],
    ["/explore", "Pick a role"],
    ["/me/plan", "development plan"],
  ] as const) {
    const r = await page(path);
    check(r.status === 200 && r.text.includes(expect), `${path} shows "${expect}"`, String(r.status));
  }
  // Scenario 1: Frontend Developer: React to Data Engineer, with my profile
  const compare = await page("/compare?a=frontend-developer--react&b=data-engineer");
  const missing = ["SQL", "Python", "Data Modelling", "Spark", "Databricks"];
  check(
    compare.status === 200 && missing.every((m) => compare.text.includes(m)),
    "Scenario 1: the compare page lists what Alex is missing for Data Engineer",
  );
  const team = await page("/team");
  check(team.status === 404 || team.text.includes("could not be found"), "an employee has no team page");
}

console.log(failed ? `\n${failed} check${failed === 1 ? "" : "s"} failed.` : "\nAll checks passed.");
if (production) {
  console.log(`
Still to do by hand on production, signed in with Microsoft (needs a real account):
  1. sign in with Microsoft and finish onboarding
  2. Scenario 1: ${base}/compare?a=frontend-developer--react&b=data-engineer shows what you'd need for Data Engineer
  3. the graph: ${base}/explore opens, a role can be focused
  4. one change request sent by a manager and approved by a Practice Lead changes the role
  5. as Site Lead, ${base}/site shows no names`);
}
process.exit(failed ? 1 : 0);
