---
name: feature
description: Start a new feature branch from an up-to-date main. Use before any code change in this repo, e.g. "/feature m4-role-browser" or when beginning the next item of a milestone.
argument-hint: <milestone>-<slug>, optionally prefixed with fix/, chore/ or docs/
---

Start a branch for: $ARGUMENTS

1. Check the working tree with `git status --short`. If there are uncommitted changes, stop and ask what to do with them; never stash or discard them silently.
2. If a previous PR from this session is still open, check it with `gh pr view <number> --json state,mergeStateStatus`. Don't start the next branch from `main` until that PR has merged, unless the new work is independent of it.
3. Update main: `git switch main && git pull --ff-only`.
4. Pick the branch name:
   - `$ARGUMENTS` already starts with `feat/`, `fix/`, `chore/` or `docs/`: use it as is.
   - Otherwise prefix it with `feat/`.
   - Use the milestone number from `docs/PLAN.md`, e.g. `feat/m4-role-browser`.
5. `git switch -c <branch>`.
6. Say in one line which branch you're on and what it will contain. Then do the work, committing in small steps with Conventional Commit messages.
