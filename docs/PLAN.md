# Skill Graph: plan

Living document: update it when a decision changes. Milestone status is tracked in the table in §7.

## Context

An internal platform that shows an organisation's competencies as a graph of **roles → skills → technologies**. Employees use it to see the gap to a target role. Managers use it to plan their team's development, and admins maintain the graph by hand.

Decisions made at the start: hosting on **Vercel**, **Neon Postgres + Drizzle**, **Cytoscape.js** for the graph, and every change through a **feature branch → PR → auto-merge when CI passes**.

### The brief, in short

- **Problem:** answers to "how do I move from role A to role B?", "which skills are essential and which optional?", "what other paths exist?" are spread across job profiles, community leads, managers and learning platforms.
- **Node types:** Role, Skill, Technology/Tool. **Priorities:** Critical (must-have), Important, Nice to have; colours red / orange / green. Line thickness = strength of the dependency.
- **Scenario 1:** a Frontend Developer (JavaScript, TypeScript, React) wants to be a Data Engineer. Shared: Problem Solving, Git, Agile. Missing: SQL, Python, Data Modelling, Spark, Databricks.
- **Scenario 2:** a Project Manager wants to be a Delivery Manager. Missing: Financial Management, Account Management, Commercial Awareness, Leadership, People Management.
- **Scenario 3:** a manager opens an employee's profile and sees current competencies, possible paths and the roles reachable with current skills.
- **MVP:** role browser, interactive competency map, comparing two roles, admin graph editing.
- **Roadmap:** V1 a hand-maintained graph; V2 imports from the Skills Framework, HR systems and learning platforms; V3 an AI assistant ("I want to become an AI Engineer").

---

## 1. Stack

| Concern | Choice | Why |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), TypeScript (strict), pnpm, Node 24 | Before writing code, read the bundled docs in `node_modules/next/dist/docs/` for caching, route handlers and auth, as AGENTS.md requires. |
| UI | Tailwind 4 + shadcn/ui (Radix) + lucide icons; light and dark themes from colour variables | Accessible primitives. |
| DB | Neon Postgres via Vercel Marketplace (prod plus one database branch per preview), Drizzle ORM + drizzle-kit migrations, `postgres` driver | Scales to zero but never pauses. Preview deploys get their own database. One driver everywhere. |
| Local DB | Postgres 17 in Docker (`pnpm db:up`, plain `docker` so Colima/OrbStack/Docker Desktop all work); PGlite for fast DB tests | No cloud needed to develop or test. |
| Auth | Better Auth: Microsoft (Entra ID) provider in production; demo sign-in with seeded users in dev and on previews only | Entra doesn't allow wildcard redirect URIs, so previews can't use Microsoft sign-in. |
| Graph | Cytoscape.js 3.34 + `cytoscape-fcose`, wrapped in a thin React client component written by us (`react-cytoscapejs` is stale) | Shapes per node type, line width mapping, built-in Dijkstra and neighbourhood search, concentric and force layouts, optional WebGL renderer. |
| Domain logic | Pure TypeScript in `src/domain/`, working on an in-memory graph | At ~22k rows the whole graph fits in memory. The same functions serve the UI, the API and the future V3 AI assistant. |
| Validation | zod 4, shared by server actions and API | |
| Tests | Vitest (domain + components), PGlite (DB), Playwright + `@axe-core/playwright` (end-to-end + accessibility) | |
| Hosting | Vercel, region `fra1`, production = `main`, preview per PR | Hobby is non-commercial only: fine for a demo. Real internal use needs Pro or a move to Azure (see Risks). |

**Why relational and not a graph database:** the data is small. All graph algorithms run in TypeScript on a cached, in-memory copy of the graph, and Postgres stays a plain store with constraints. A graph database would add operational cost for no gain, and Postgres moves easily to Azure Database for PostgreSQL later.

## 2. Data model (Drizzle, `src/db/schema.ts`)

- **`nodes`**
  - columns: `id` uuid, `type` enum(`role`,`skill`,`technology`), `name`, `slug` unique, `normalized_name` unique, `description`, `category`, `tags` text[], `external_id`, `source` (default `manual`), timestamps
  - `unique(source, external_id)`
  - Name normalisation: lowercase, trim, collapse whitespace, strip punctuation **except `+` and `#`**, so C# and C++ stay distinct. Names are unique across all types, to avoid "Python the skill" vs "Python the tool".
- **`edges`**
  - columns: `id`, `kind` enum, `source_id`/`target_id` → `nodes` (on delete cascade), `priority` enum(`critical`,`important`,`nice`), `strength` smallint 1–5 (default 3), `external_id`, `source`, timestamps
  - `unique(kind, source_id, target_id)`
  - Database checks: `source_id <> target_id`; `priority` is not null exactly when `kind = 'requires'`.
  - Indexes on `(source_id)`, `(target_id)`, `(kind)`.
  - Edge kinds (type rules enforced by the domain validator and tested):
    - `requires`: role → skill or technology, carries **priority** (priority lives on the edge, not the skill)
    - `builds_on`: skill/tech → skill/tech, a prerequisite (Databricks builds on Python and Spark); warn on cycles
    - `related_to`: skill/tech ↔ skill/tech, undirected, stored with `source_id < target_id`
    - `next_step`: role → role, a typical career move. Feeds "alternative paths" and Scenario 3.
- **Better Auth tables** (`user`, `session`, `account`, `verification`), generated for Drizzle.
- **`profiles`**: `user_id` PK, `app_role` enum(`employee`,`manager`,`admin`), `current_role_id` → nodes, `manager_id` → user.
- **`profile_skills`**: (`user_id`, `node_id`) PK, `created_at`. These are self-declared skills, yes/no with no proficiency levels in the MVP.
- **`audit_log`**: `id`, `actor_id`, `action` (create/update/delete), `entity` (node/edge/profile/app_role), `entity_id`, `before` jsonb, `after` jsonb, `at`. Written **in the same transaction** as the change.

## 3. Domain algorithms (`src/domain/`, written test-first)

- **Effective skills** of a person = their declared skills ∪ the **Critical + Important** requirements of their current role. The UI marks which are inherited and which are declared. This is what makes Scenario 1 work: Problem Solving, Git and Agile come from the Frontend Developer role.
- **Gap analysis** `gap(have, targetRole)` returns:
  - `shared`: requirements the person already has, grouped by priority
  - `missing`: requirements the person lacks, grouped by priority. Within each group, a topological sort over `builds_on` puts prerequisites first. This gives the spec's order: SQL, Python, Data Modelling, then Spark before Databricks.
- **Role comparison** `compare(A, B)` returns `shared`, `onlyA` and `onlyB` (onlyB = what's missing to move from A to B, with B's priorities), plus priority differences on shared items.
- **Readiness**
  - Weights: Critical 3, Important 2, Nice 1.
  - `coverage = Σw(have ∩ req) / Σw(req)`
  - Reachable = all Critical covered **and** coverage ≥ 0.70. Stretch = coverage ≥ 0.50. Anything below is Far. Thresholds live in `src/domain/config.ts`.
- **Development paths** (Scenario 3):
  - (a) `next_step` routes from the current role, up to 3 hops, with readiness for each target
  - (b) the top-N roles by readiness even without a `next_step` link ("discover new specialisations")
- **Path between two roles** (graph highlight): shortest path over the undirected graph, with edge cost = 1/strength, so the bridging skills are visible (Frontend Developer → Git → Data Engineer).
- **Validators**: no duplicate normalised names, no self-loops, type rules per edge kind, `builds_on` cycle detection (warn, then confirm), and a count of everything a destructive change affects.

## 4. Routes, API, permissions

**Pages**

- `/sign-in`
- `/explore`: the graph. URL parameters `focus`, `depth`, `types`, `priorities`, `category`, `path=a,b` make views shareable in development conversations.
- `/roles`, `/roles/[slug]`
- `/skills/[slug]`, `/technologies/[slug]`
- `/compare?from=&to=` (role vs role) and `/compare?to=` (my profile vs role)
- `/me`: profile and skills editor, reachable roles, paths
- `/team`, `/team/[userId]` (Scenario 3, plus a small team gap summary)
- `/admin/nodes`, `/admin/edges`, `/admin/users` (app roles, manager links), `/admin/audit`

**API** (`/api/v1`, a thin layer over `src/domain`, built for V3)

- `GET /graph`
- `GET /roles/:slug/gap?have=`
- `GET /compare?from=&to=`
- `GET /people/:id/paths`

Writes go through Server Actions with zod validation. The graph read is cached with a cache tag, and admin writes invalidate that tag. The exact Next 16 caching API is confirmed from the bundled docs.

**Permissions** (one `authorize()` helper on the server, with end-to-end tests for each denial)

|                                         | Employee | Manager | Admin   |
| --------------------------------------- | -------- | ------- | ------- |
| Browse graph, roles, compare            | ✓        | ✓       | ✓       |
| Edit own profile, see own paths         | ✓        | ✓       | ✓       |
| View direct reports' profiles and paths | –        | ✓       | ✓ (all) |
| Edit graph, see audit log, manage users | –        | –       | ✓       |

The first Microsoft sign-in creates an Employee. Emails listed in `ADMIN_EMAILS` become Admin.

## 5. Graph UX (solving the problems the brief doesn't cover)

- **Never the whole hairball by default.** `/explore` opens on a search box and role picker.
  - The overview uses the fcose layout, faint links and labels only when zoomed in. If the performance test (§7, M6) needs it, it switches to the WebGL renderer.
  - **Focus mode**: the selected node plus N hops (1–3).
  - For a role, the **concentric layout** puts the role in the centre with rings for Critical (inner), Important and Nice.
- **Type shown by shape**: role = hexagon, skill = ellipse, technology = round-rectangle, each in a neutral per-type tint.
- **Priority colour only appears in context.** With a role in focus, its requirements turn red (Critical), orange (Important) or green (Nice). With nothing in focus, everything stays neutral.
- **Never colour alone**:
  - priority also shows as line style (solid / dashed / dotted) and as the ring in the concentric layout
  - nodes carry a priority badge in their label
  - a legend is always visible
  - colours are chosen for colour-blind safety and ≥3:1 contrast against the background in both themes
- **Line width = strength** (1–5 mapped to 1–6px).
- **Side panel on click**:
  - description and type
  - connections grouped by kind
  - priority within the current focus
  - "Roles that use this", each with its priority
  - links to the detail page and to compare
- **Filters**: type, priority, category, hop depth. **Path mode**: pick two roles, highlight the shortest path, dim everything else.
- **Accessibility**
  - The canvas has an accessible label and a live region that announces the selection.
  - The side panel's connection list is fully keyboard-driven and moves the graph focus.
  - Keys: `/` search, arrow keys walk neighbours, `Esc` clears focus.
  - A **Table view** tab shows the same data. Target is WCAG 2.2 AA.
- **Below 768px**: the table/list view is the default and the graph is opt-in. All other pages are responsive.

## 6. Seed data (`src/db/seed/`, idempotent upsert by slug, fictional people only)

About 15 roles, 60 skills and 40 technologies (Microsoft-heavy: Azure, Fabric, Power BI, ADF, Azure OpenAI, Copilot Studio, Azure DevOps, GitHub Actions…). The scenario-critical requirements are fixed exactly:

- **Frontend Developer**
  - Critical: JavaScript, TypeScript, React, HTML & CSS, Problem Solving
  - Important: Git, Agile, Accessibility, Testing
  - Nice: Next.js, GitHub Copilot
- **Data Engineer**, **only**:
  - Critical: SQL, Python, Data Modelling, Problem Solving
  - Important: Spark, Databricks, Git
  - Nice: Agile
  - Prerequisites: Databricks `builds_on` Python and Spark; Spark `builds_on` Python. ADF, Terraform and Snowflake go on other data/cloud roles so Scenario 1 stays exact.
- **Project Manager**
  - Critical: Planning & Scheduling, Stakeholder Management, Risk Management, Communication
  - Important: Agile, Azure DevOps
  - No Leadership and no financial skills.
- **Delivery Manager**
  - Critical: Leadership, Financial Management, People Management, Stakeholder Management, Communication
  - Important: Account Management, Commercial Awareness, Risk Management
  - Nice: Agile
- **Full-stack Developer**: Frontend core + Node.js (I) + REST APIs (I) + SQL (N). This makes it _reachable_ for the Frontend Developer at 76% coverage.
- **`next_step` links**: Frontend → Full-stack; Data Analyst / Backend → Data Engineer; Data Engineer → AI Engineer and Architect; Business Analyst → Project Manager; Project Manager → Delivery Manager; DevOps → Cloud Engineer → Architect.
- **Users**:
  - Alex Rivera: Frontend Developer; declares JS, TS, React
  - Sam Patel: Project Manager
  - Morgan Lee: Manager of Alex and Sam
  - Jordan Kim: Admin
- **Tests that guard the seed**: database tests assert that Scenarios 1 and 2 return exactly the brief's lists.

## 7. Milestones (each split into small feature PRs)

| #   | Scope                                                                                                                   | Done when                                                                                   | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| M0  | Scaffold, public repo, ruleset, CI, Claude workflow config, `pnpm check`, Vercel + Neon link, `docs/PLAN.md`, README    | A PR auto-merges after passing CI, and its preview deploy loads                             | Done   |
| M1  | Schema, migrations, local Postgres in Docker, seed, DB tests                                                            | `pnpm db:reset && pnpm test:db` passes; seed invariants hold                                | To do  |
| M2  | Domain functions (TDD)                                                                                                  | Scenario 1 and 2 unit tests match exactly; ≥90% coverage on `src/domain`                    | To do  |
| M3  | Better Auth (Microsoft + demo), profiles, `authorize()`, app shell and navigation                                       | Sign in as each seeded user locally; denial tests pass                                      | To do  |
| M4  | Role browser + skill and technology detail pages                                                                        | Search and filter work; role detail is grouped by priority                                  | To do  |
| M5  | `/compare` (role vs role, me vs role) + `/me` skills editor                                                             | End-to-end Scenarios 1 and 2 through the UI                                                 | To do  |
| M6  | `/explore` graph: everything in §5, plus a performance test on a synthetic 2k-node / 20k-link graph                     | Focus and path work by mouse and keyboard; overview interactive in under 2s, panning smooth | To do  |
| M7  | Admin create/edit/delete for nodes and links, validation, confirmations, audit log, user management, cache invalidation | Edits show up in the graph straight away; audit rows written; non-admins blocked            | To do  |
| M8  | `/team`, `/team/[id]`, team gap summary                                                                                 | End-to-end Scenario 3                                                                       | To do  |
| M9  | Accessibility (axe on every page, both themes), keyboard pass, README, production deploy plus smoke test                | Zero serious or critical axe violations; production works with Microsoft sign-in            | To do  |

## 8. Repo and agent workflow (feature branch → PR → auto-merge)

**Repo**

- `gh repo create chrizspace/skill-graph --public --source=. --push`. The scaffold is the **only** commit made directly to `main`.

**`scripts/setup-repository.sh`** (idempotent `gh api` + `jq`):

- Repo settings: squash merge only; `allow_auto_merge`, `delete_branch_on_merge` and `allow_update_branch` on.
- **Ruleset on `main`**:
  - pull request required (0 approvals, because you can't approve your own PRs)
  - required status check `ci`, which must be up to date with `main`
  - no force pushes, no deletion, linear history
  - nobody can bypass it
- Secret scanning with push protection and Dependabot security updates turned on. Dependabot version updates run monthly, grouped (fewer PRs), and are **not** auto-merged.

**CI (`.github/workflows/ci.yml`)**

- A public repo gets free GitHub-hosted runners, so minutes aren't a constraint. The full suite runs on every PR.
- Runs on `pull_request` and on pushes to `main`. A newer push to a PR cancels its running checks.
- Jobs:
  - `static`: lint, typecheck, unit tests
  - `db`: PGlite tests
  - `build`
  - `e2e`: a Postgres service container, migrate and seed, `next start`, Playwright in Chromium plus axe
  - `ci`: `needs: all`; this is the single required check
- Setup steps: pnpm from `packageManager`, Node from `.nvmrc` (24).

**Local checks**: `scripts/check.mts` runs only what the change touches; `--full` runs everything.

**Claude configuration (committed in the repo)**

- `CLAUDE.md` → `@AGENTS.md` (keeps the Next 16 docs note). It adds:
  - **Git workflow**: never commit on `main`; one branch per feature, named `feat|fix|chore|docs/<milestone>-<slug>`; Conventional Commits; the PR title becomes the squash commit message.
  - **Definition of done**: `pnpm check` passes, the change was checked in the browser at 1280px and 375px, and docs are updated.
  - Commands and an architecture map.
- `.claude/hooks/guard-main.mjs`, run as a PreToolUse hook on Bash. It **blocks**:
  - `git commit`, `git push` and `git merge` while the current branch is `main`
  - any `git push` that targets `main`
  - `--force` / `--no-verify`
  - `gh pr merge --admin`

  When it blocks, it exits with code 2 and tells Claude to create a feature branch.

- `.claude/settings.json`
  - The hook registration.
  - Allow: `pnpm *`, `git switch/add/commit/push -u origin <feature branch>`, `gh pr create/view/checks`, `gh pr merge --auto --squash`, `docker compose *`.
  - Deny: force pushes, pushes to `main`, admin merges.
- `.claude/skills/feature/SKILL.md` (`/feature <slug>`): fetch, switch to `main`, `pull --ff-only`, create the branch.
- `.claude/skills/ship/SKILL.md` (`/ship`):
  1. Run `pnpm check`.
  2. Push the branch.
  3. `gh pr create` using the PR template (summary, how it was checked, screenshots).
  4. `gh pr merge --auto --squash --delete-branch`.
  5. In the desktop app, track CI with the PR tools instead of polling; in a terminal, `gh pr checks --watch`.
  6. If CI fails, fix it on the same branch.
  7. After the merge, switch to `main`, pull, and delete the local branch.
- `.github/pull_request_template.md`.

**Manual setup by the repository owner** (accounts and secrets):

1. Confirm that publishing this code publicly is fine under your employer's policy. The seed data is fictional.
2. Log in to Vercel and import the repo; add the Neon integration (accepting its terms).
3. Create an Entra app registration and paste its client ID and secret into Vercel's environment settings.

Step-by-step instructions are in README.md.

## 9. Risks

- **Company sign-in**: the organisation's Entra tenant may block consent to an app registered outside it, which means its IT has to grant admin consent. Fallbacks: personal Microsoft accounts, or demo sign-in.
- **Vercel Hobby is non-commercial**: real rollout needs Pro, or Azure App Service with the same Postgres.
- **Full-graph performance at 20k links**: the UX defaults to focus mode, the WebGL renderer is available, and it gets measured in M6.
- **Seed realism vs exact scenarios**: the Data Engineer's requirement list is deliberately small, and that's documented in the seed.
- **Next 16 changes**: always read the bundled docs before using caching, routing or server action APIs.
- **Auto-merge is sequential**: the next feature branch starts from `main` after the previous PR lands. CI should take about 5 minutes; if it gets slow, independent work can start meanwhile.

## 10. How it gets verified

- **Every PR**:
  - `pnpm check` passes locally, then the `ci` check is green, then auto-merge
  - each UI change is checked in the built-in browser at 1280px and 375px in both themes
  - the Vercel preview URL loads with the demo sign-in
- **Scenarios**:
  - Unit tests for Scenarios 1–2 (exact lists and order)
  - DB seed invariants
  - Playwright end-to-end for Scenarios 1–3, admin create/edit/delete with audit, permission denials, graph focus/path by keyboard, and axe on every page
- **Performance**: a synthetic 2k/20k graph fixture with a measured overview load time and frame rate (M6).
- **Release (M9)**: production deploy on Vercel; smoke test of Microsoft sign-in, the Scenario 1 compare, a graph focus and one admin edit.
