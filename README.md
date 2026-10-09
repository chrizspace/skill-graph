# Skill Graph

An interactive graph of **roles, skills and technologies**:

- employees see which competencies they're missing for a role they want
- managers plan their team's development
- admins keep the graph up to date

The plan, data model and milestones are in [docs/PLAN.md](docs/PLAN.md).

**Stack:**

- Next.js 16 (App Router) and TypeScript
- Tailwind 4 with shadcn/ui
- Neon Postgres with Drizzle ORM
- Better Auth (Microsoft Entra ID)
- Cytoscape.js
- Vitest and Playwright
- hosted on Vercel

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

The seed holds 17 roles, 62 skills and 42 technologies, plus four fictional people (`@example.com`): Alex Rivera (Frontend Developer), Sam Patel (Project Manager), Morgan Lee (their manager) and Jordan Kim (admin). Production gets the graph but never the demo people.

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
| Previews   | One URL per pull request; Vercel posts it on the PR                                                                                                                         |
| Hosting    | Vercel project `skill-graph`, functions in `fra1` (Frankfurt), see `vercel.json`                                                                                            |
| Database   | Neon Postgres (free plan, `fra1`), connected through the Vercel Marketplace; it sets `DATABASE_URL` and the other `PG*` / `POSTGRES_*` variables for Preview and Production |

Local development doesn't use Neon: from M1 it runs Postgres in Docker. `vercel link` connects a checkout to the project if you need the Vercel CLI.

### Setting it up again from scratch

1. **Vercel:** choose **Add New → Project**, import `chrizspace/skill-graph`, and keep the Next.js defaults.
2. **Neon:** in the Vercel project, go to **Storage → Create Database → Neon** and pick region Frankfurt. Connect it to Preview and Production.
3. **Preview database branches:** in the Neon resource's settings, under deployments, turn on a database branch for **Preview**. Each preview deploy then migrates and seeds its own copy instead of the production database.

### Microsoft sign-in

This comes at M3. The README will list the Entra app registration steps and the environment variables then.
