<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Skill Graph

An internal tool that shows roles (with specialisations) and what they require (technical skills, soft skills and certifications, each weighted Critical / Important / Nice to have) as a graph. Employees keep a profile and plan their development; managers follow their direct reports, recommend development steps and send change requests; Practice Leads control their practice's roles and paths; the Site Lead oversees the practices. The concepts, user types and permissions are defined in `docs/PLAN.md` §1: use its vocabulary in code and UI. The full plan, data model and milestones are in [docs/PLAN.md](docs/PLAN.md); read it before starting a milestone and update it when a decision changes.

## Git workflow (always)

- **Never commit, merge or push on `main`.** `main` changes only through pull requests that pass CI; a ruleset on GitHub and the hook in `.claude/hooks/guard-main.mjs` both enforce it.
- **One branch per feature**, from an up-to-date `main`: `feat|fix|chore|docs/<milestone>-<slug>`, e.g. `feat/m4-role-browser`. Use the `/feature <slug>` skill to start one.
- `docs/*` (and Dependabot) branches get **no Vercel preview and no Neon database branch** (`vercel.json` → `git.deploymentEnabled`): use `docs/` only for changes to documentation. The free Neon plan has 10 branches, one per preview.
- Keep PRs small: a milestone is usually several PRs. Commit messages and PR titles use Conventional Commits (`feat: …`, `fix: …`); the PR title becomes the squash commit on `main`.
- **Ship with the `/ship` skill**: `pnpm check` passes → push → open the PR with the template → `gh pr merge --auto --squash --delete-branch`. GitHub merges it once the `ci` check is green. If CI fails, fix it on the same branch. After the merge, switch back to `main` and pull before starting the next branch.
- Never use `--force`, `--no-verify` or `gh pr merge --admin`. Never change the ruleset to get a PR through.
- **This repository is public.** Keep everything company-neutral: don't name the employer, clients or real people in code, seed data, docs, commit messages or PRs. Seed data is fictional.

## Definition of done (every PR)

1. `pnpm check` passes (lint, types, unit tests, plus database tests, build and e2e when the change touches them).
2. UI changes are checked in the browser at 1280 px and 375 px, in light and dark.
3. New behaviour has tests; Scenarios 1–3 from the plan stay green.
4. `README.md` and `docs/PLAN.md` are updated if setup, commands or decisions changed. The PR that completes a milestone sets its Status to Done in the table in `docs/PLAN.md` §8.

## Database rules

- Every schema change ships with its generated migration (`pnpm db:generate`); CI fails if they drift apart. Never edit a migration that has been merged: add a new one.
- Migrations and the seed run automatically before each Vercel build. Preview deploys use their own Neon branch; production uses the main branch. Migrations must be backwards compatible with the code currently in production.
- The requirements of the scenario roles in `src/db/seed/data.ts` are fixed by the brief; the seed tests fail if they change.

## Commands

| Command                                      | What it does                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`                                   | Dev server on http://localhost:3000                                                       |
| `pnpm check`                                 | Only the checks that matter for what changed (vs `origin/main`); `--full` runs everything |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | ESLint / `next typegen` + `tsc` / Vitest unit tests                                       |
| `pnpm format`                                | Prettier                                                                                  |

## Architecture map

| Path              | Purpose                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`        | Next.js App Router pages, layouts, route handlers (`/api/v1`)                                                                                                                                             |
| `src/domain/`     | Pure graph logic: requirements, assess, learning order, compare, readiness, similar roles, paths, plan, aggregates, validation. No framework or database imports; ≥90% coverage, enforced by `pnpm test`. |
| `src/db/`         | Drizzle schema, `graph.ts` (loads the graph and profiles for the domain), seed; `drizzle/` holds the SQL migrations                                                                                       |
| `src/components/` | UI components (shadcn/ui based)                                                                                                                                                                           |
| `scripts/`        | `check.mts` (local checks), `setup-repository.sh` (GitHub settings and ruleset)                                                                                                                           |
| `.claude/`        | Hook and skills for the branch workflow                                                                                                                                                                   |
