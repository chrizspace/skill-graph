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

Requirements: Node 24+, pnpm (the version is pinned in `package.json`), Docker (for the local database, from M1).

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Commands

| Command                                    | What it does                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm dev`                                 | Dev server                                                                        |
| `pnpm check`                               | Only the checks that matter for what changed; `pnpm check --full` runs everything |
| `pnpm lint`, `pnpm typecheck`, `pnpm test` | ESLint, `next typegen` + `tsc`, Vitest                                            |
| `pnpm format`                              | Prettier                                                                          |
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

## Deployment (one-time setup by the repository owner)

### 1. Vercel

1. In Vercel, choose **Add New → Project**, import `chrizspace/skill-graph`, and keep the Next.js defaults.
2. Production deploys from `main`. Every pull request gets a preview URL.

### 2. Neon

1. In the Vercel project, go to **Storage → Create Database → Neon**.
2. Connect it to all environments and turn on **preview branches**. Each preview deploy then gets its own copy of the database.
3. This sets `DATABASE_URL` and needs to be done before M1 reaches production.

### 3. Microsoft sign-in

This comes at M3. The README will list the Entra app registration steps and the environment variables then.
