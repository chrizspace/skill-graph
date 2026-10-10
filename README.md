# Skill Graph

An interactive graph of **roles, skills and technologies**:

- employees see which competencies they're missing for a role they want
- managers plan their team's development
- Practice Leads keep their practice's roles and paths up to date; the Site Lead oversees the practices

The plan, data model and milestones are in [docs/PLAN.md](docs/PLAN.md).

**Stack:**

- Next.js 16 (App Router) and TypeScript
- Tailwind 4 with shadcn/ui
- Neon Postgres with Drizzle ORM
- Better Auth (Microsoft Entra ID)
- Cytoscape.js
- Vitest and Playwright
- hosted on Vercel

## Design system

Storybook with every primitive and component, in the Orange theme (light only; Violet comes later): https://chrizspace.github.io/skill-graph/ (published from `main`). Locally: `pnpm storybook`.

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

## Commands

| Command                                    | What it does                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server                                                                        |
| `pnpm check`                               | Only the checks that matter for what changed; `pnpm check --full` runs everything |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | ESLint, `next typegen` + `tsc`, Vitest                                            |
| `pnpm format`                              | Prettier                                                                          |
| `pnpm db:up`, `pnpm db:down`               | Start / stop the local Postgres                                                   |
| `pnpm db:reset`                            | Rebuild the local database from the migrations (refuses any non-local database)   |
| `pnpm db:generate`                         | Write a migration after changing `src/db/schema.ts`                               |
| `pnpm db:seed`                             | Add the seed graph and demo people (idempotent)                                   |
| `pnpm test:db`                             | Database tests on PGlite (in-process Postgres, no Docker needed)                  |
| `pnpm build`                               | Production build                                                                  |

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
3. In Vercel (Production only), set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (the production URL), `MICROSOFT_CLIENT_ID` (the application ID), `MICROSOFT_CLIENT_SECRET` and `MICROSOFT_TENANT_ID` (the directory ID; the default `common` also allows personal accounts).
4. If your organisation blocks users from consenting to new apps, its IT has to grant admin consent once.

A person who signs in with Microsoft for the first time has no profile yet; onboarding (M7) creates it. Their user types come from the data (reporting lines and lead assignments), see `docs/PLAN.md` §1. Every capability is checked on the server by `can()` (`src/domain/access.ts`).
