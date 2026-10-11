# Skill Graph

An interactive graph of **roles, skills, certifications and technologies**:

- **employees** keep a profile, see how they meet their role, compare roles with their own skills and plan their development
- **managers** follow their direct reports, recommend next steps and send feedback on roles to the practice
- **Practice Leads** keep their practice's roles, requirements and paths up to date and review change requests
- **the Site Lead** oversees the practices with numbers only, never named profiles

The plan, data model and milestones are in [docs/PLAN.md](docs/PLAN.md).

**Stack:**

- Next.js 16 (App Router) and TypeScript
- Tailwind 4 with shadcn/ui
- Neon Postgres with Drizzle ORM
- Better Auth (Microsoft Entra ID)
- Cytoscape.js
- Vitest, Playwright and axe
- hosted on Vercel

## Design system

Storybook with every primitive and component, in the Orange and Violet themes (light only; the toolbar switches between them): https://chrizspace.github.io/skill-graph/ (published from `main`). Locally: `pnpm storybook`.

## Getting started

Requirements: Node 24+, pnpm (the version is pinned in `package.json`), Docker (Colima, OrbStack or Docker Desktop) for the local database.

```bash
pnpm install
cp .env.example .env.local   # local database connection
pnpm db:up                   # Postgres 17 in Docker on port 5433
pnpm db:reset                # build the schema and seed the demo graph and people
pnpm dev
```

Open http://localhost:3000.

The seed holds a demo site with 5 practices, 19 roles (4 specialisations), a catalogue of technical skills, soft skills and certifications, and 18 fictional people (`@example.com`): a Site Lead, a Practice Lead per practice, two managers and their teams. Production gets the site, practices and graph but never the demo people. Details: `docs/PLAN.md` §7.

## End-to-end tests

Playwright specs live in `e2e/`, one file per scenario or area (`scenario-1-…`, `permissions`, …). `pnpm test:e2e` builds the app, **resets the local database** (it refuses any other), starts the app on port 3100 and runs everything; `pnpm db:up` must be running. Each test is limited to 30 s and the run to 20 min, and `list` output shows every test as it passes.

To run one file quickly, start the app yourself once and keep its database:

```bash
pnpm db:reset && pnpm build && pnpm exec next start -p 3100   # in one terminal
E2E_KEEP_DB=1 pnpm exec playwright test e2e/permissions.spec.ts   # in another
```

(`E2E_KEEP_DB=1` is needed because the app caches the graph with its row ids, which a reset replaces.)

## Accessibility

The target is WCAG 2.2 AA, checked in the repository rather than by hand:

- **Colour**: every text and component colour pair of both themes is tested for contrast in `src/design-system/tokens.test.ts`, including the fade of an expired certification.
- **`e2e/a11y.spec.ts`** scans every page with [axe](https://github.com/dequelabs/axe-core) for each kind of user, in both themes, at phone width and with menus and windows open, and fails on any violation. A new page gets a line in it.
- **`e2e/keyboard.spec.ts`** is the keyboard pass: the skip link, tab order, a visible focus on every interactive element, menus, windows (focus trapped and given back), tabs, and the graph.
- The graph has a table view with the same content, and on phones the table opens first.
- Storybook's accessibility panel fails on violations for every component.

## Commands

| Command                                     | What it does                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                                  | Dev server                                                                        |
| `pnpm check`                                | Only the checks that matter for what changed; `pnpm check --full` runs everything |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`  | ESLint, `next typegen` + `tsc`, Vitest                                            |
| `pnpm format`                               | Prettier                                                                          |
| `pnpm db:up`, `pnpm db:down`                | Start / stop the local Postgres                                                   |
| `pnpm db:reset`                             | Rebuild the local database from the migrations (refuses any non-local database)   |
| `pnpm db:generate`                          | Write a migration after changing `src/db/schema.ts`                               |
| `pnpm db:seed`                              | Add the seed graph and demo people (idempotent)                                   |
| `pnpm test:db`                              | Database tests on PGlite (in-process Postgres, no Docker needed)                  |
| `pnpm test:e2e`                             | Playwright end-to-end tests (resets the local database, see above)                |
| `pnpm build`                                | Production build                                                                  |
| `pnpm smoke <url> [--production \| --demo]` | Quick check of a deployed copy (see "Going live")                                 |

## How changes reach `main`

`main` is protected: every change goes through a feature branch and a pull request, and a PR merges itself (squash) once the `ci` check passes.

```text
git switch main && git pull --ff-only
git switch -c feat/<milestone>-<slug>
# work, commit (Conventional Commits)
pnpm check
git push -u origin feat/<milestone>-<slug>
gh pr create --fill
gh pr merge --auto --squash --delete-branch
```

Claude Code follows the same flow automatically:

- `AGENTS.md` holds the rules.
- `.claude/hooks/guard-main.mjs` blocks commits and pushes on `main`.
- The `/feature` and `/ship` skills start and finish a branch.

`scripts/setup-repository.sh` (re)applies the GitHub settings and the ruleset:

- squash merges only
- auto-merge
- the required `ci` check
- no force pushes
- secret scanning

## Deployment

|            |                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production | https://skill-graph-one.vercel.app (deploys from `main`)                                                                                                                    |
| Previews   | One URL per pull request, each with its own Neon database branch; Vercel posts it on the PR. `docs/*` and Dependabot branches get none (`vercel.json`)                      |
| Hosting    | Vercel project `skill-graph`, functions in `fra1` (Frankfurt), see `vercel.json`                                                                                            |
| Database   | Neon Postgres (free plan, `fra1`), connected through the Vercel Marketplace; it sets `DATABASE_URL` and the other `PG*` / `POSTGRES_*` variables for Preview and Production |

Local development doesn't use Neon: from M1 it runs Postgres in Docker. `vercel link` connects a checkout to the project if you need the Vercel CLI.

### Setting it up again from scratch

1. **Vercel:** choose **Add New → Project**, import `chrizspace/skill-graph`, and keep the Next.js defaults.
2. **Neon:** in the Vercel project, go to **Storage → Create Database → Neon** and pick region Frankfurt. Connect it to Preview and Production.
3. **Preview database branches:** in the Neon resource's settings, under deployments, turn on a database branch for **Preview**. Each preview deploy then migrates and seeds its own copy instead of the production database.

### Sign-in

- **Demo sign-in** (locally and on previews, never in production): the sign-in page lists the seeded people; pick one to use the app as them. It needs no setup.
- **Microsoft sign-in** (production): Better Auth with the Microsoft (Entra ID) provider. It is shown when `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are set.

To set up Microsoft sign-in:

1. In the Entra admin centre: **App registrations → New registration**. Supported account types: your organisation only (or "any organisation and personal accounts" to allow personal accounts too). Redirect URI (Web): `https://<production domain>/api/auth/callback/microsoft`. Entra has no wildcard redirect URIs, which is why previews use the demo sign-in.
2. **Certificates & secrets → New client secret**; copy its value.
3. In Vercel (Production only; without `BETTER_AUTH_SECRET` production builds and runs, but sign-in is switched off), set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (the production URL), `MICROSOFT_CLIENT_ID` (the application ID), `MICROSOFT_CLIENT_SECRET` and `MICROSOFT_TENANT_ID` (the directory ID; the default `common` also allows personal accounts).
4. If your organisation blocks users from consenting to new apps, its IT has to grant admin consent once.

A person who signs in with Microsoft for the first time has no profile yet; onboarding (M7) creates it. Their user types come from the data (reporting lines and lead assignments), see `docs/PLAN.md` §1. Every capability is checked on the server by `can()` (`src/domain/access.ts`).

### Going live

Production is the `main` branch on Vercel. Before real people use it:

1. **Sign-in**: set the variables above in Vercel (Production only). Until `BETTER_AUTH_SECRET` and the Microsoft settings exist, production builds and runs but nobody can sign in.
2. **The first Site Lead**: there is nobody yet to appoint one in the app, so add them once in the Neon console, after they have signed in with Microsoft for the first time:

   ```sql
   insert into site_leads (site_id, user_id)
   select s.id, u.id from sites s, "user" u where u.email = 'first.site.lead@your-company.com';
   ```

   From then on the Site Lead appoints Practice Leads, other Site Leads, home practices and reporting lines in the app (`/site/practices`, `/site/people`).

3. **Smoke test**: `pnpm smoke https://<production domain> --production` checks that the site is alive, that sign-in is Microsoft (or switched off) and that the demo sign-in is not offered. It prints what is left to try by hand with a real account: sign in and onboard, Scenario 1 on `/compare`, focus a role on `/explore`, send and approve one change request, and see that `/site` names nobody.
4. **Before wide use** (see the risks in `docs/PLAN.md` §10): Vercel's Hobby plan is for non-commercial use only, so use Pro or move to Azure; and export and deletion of a person's own data (GDPR) is not built yet.
