/**
 * `pnpm check` runs only the checks that matter for what changed (vs where this branch left origin/main, plus the working tree).
 *   always      format, lint, typecheck and unit tests, in parallel
 *   database    `test:db` when the schema, migrations, seed, queries or db tests change
 *   storybook   `build-storybook` when components, the design system, stories or .storybook change
 *   build       `build` when config, dependencies or app code change
 *   e2e         `test:e2e` (only the changed specs) when e2e specs change
 * `pnpm check --full` runs everything; `pnpm check --only=static,db,storybook,build,e2e` picks groups explicitly.
 * A group whose package.json script doesn't exist yet is skipped, so this works from the first milestone on.
 */
import { spawn, execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const full = args.includes("--full");
const only = args
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const scripts: Record<string, string> = JSON.parse(readFileSync("package.json", "utf8")).scripts ?? {};
const has = (name: string) => name in scripts;

// compare with where this branch left main (a stale local origin/main would otherwise hide or invent changes); fetching is best effort
try {
  execSync("git fetch origin main --quiet", { stdio: "ignore", timeout: 15_000 });
} catch {
  /* offline: use what is there */
}
const base = (() => {
  try {
    return execSync("git merge-base HEAD origin/main", { encoding: "utf8" }).trim();
  } catch {
    return "origin/main";
  }
})();
const changed = new Set(
  [
    ...execSync(`git diff --name-only ${base}`, { encoding: "utf8" }).split("\n"),
    ...execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).split("\n"),
  ].filter(Boolean),
);
const touches = (re: RegExp) => [...changed].some((f) => re.test(f));
const changedSpecs = [...changed].filter((f) => /^e2e\/.*\.spec\.ts$/.test(f));

const wants = {
  static: true,
  db:
    has("test:db") && (full || touches(/^src\/db\/|^drizzle\/|\.db\.test\.ts$|^drizzle\.config|^vitest\.db/)),
  build:
    has("build") &&
    (full || touches(/^src\/app\/|^next\.config|^package\.json$|^pnpm-lock\.yaml$|^tsconfig/)),
  e2e: has("test:e2e") && (full || changedSpecs.length > 0),
  storybook:
    has("build-storybook") &&
    (full ||
      touches(
        /^src\/components\/|^src\/design-system\/|\.stories\.tsx$|\.mdx$|^\.storybook\/|^package\.json$/,
      )),
};
if (only) for (const k of Object.keys(wants) as (keyof typeof wants)[]) wants[k] = only.includes(k);

type Result = { name: string; ok: boolean; secs: number; out: string };
function run(name: string, cmd: string): Promise<Result> {
  const t = Date.now();
  return new Promise((resolve) => {
    const p = spawn(cmd, { shell: true });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ name, ok: code === 0, secs: (Date.now() - t) / 1000, out }));
  });
}

const results: Result[] = [];
const report = (r: Result) => {
  results.push(r);
  console.log(`${r.ok ? "✓" : "✗"} ${r.name} (${r.secs.toFixed(0)}s)`);
};

const lanes: Promise<void>[] = [];
if (wants.static) {
  const staticChecks = [
    ["format", "pnpm format:check"],
    ["lint", "pnpm lint"],
    ["typecheck", "pnpm typecheck"],
    ["unit tests", "pnpm test"],
  ];
  lanes.push(...staticChecks.map(([n, c]) => run(n, c).then(report)));
}
// database tests and e2e both reset the local database, and `next build` replaces `.next`: run them one after the other
lanes.push(
  (async () => {
    if (wants.db) report(await run("database tests", "pnpm test:db"));
    if (wants.e2e) {
      const specs = full ? "" : changedSpecs.join(" ");
      report(await run("e2e", `pnpm test:e2e ${specs}`.trim()));
    }
    if (wants.storybook) report(await run("storybook build", "pnpm build-storybook"));
    if (wants.build) report(await run("production build", "pnpm build"));
  })(),
);
await Promise.all(lanes);

const failed = results.filter((r) => !r.ok);
for (const r of failed) console.log(`\n── ${r.name} ──\n${r.out.split("\n").slice(-40).join("\n")}`);
const skipped = (["db", "storybook", "build", "e2e"] as const).filter((k) => !wants[k]);
if (skipped.length)
  console.log(`\nSkipped (nothing relevant changed or not set up yet): ${skipped.join(", ")}.`);
process.exit(failed.length ? 1 : 0);
