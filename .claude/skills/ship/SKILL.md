---
name: ship
description: Check, push and open a pull request for the current feature branch, then let GitHub auto-merge it into main once CI passes. Use when a feature branch is done, e.g. "/ship".
---

Ship the current branch.

1. **Branch.** `git branch --show-current` must not be `main`. If it is, stop: the work belongs on a feature branch (use the `feature` skill).
2. **Commit.** Commit anything left, with a Conventional Commit message. Make sure `git status --short` is clean.
3. **Local checks.** Run `pnpm check`. Fix every failure and run it again until it passes. Never skip a check to get green.
4. **UI changes.** If the branch changes UI, check it in the browser at 1280 px and 375 px before going on.
5. **Push.** `git push -u origin <branch>`.
6. **Open the PR.** `gh pr create --base main --title "<conventional title>" --body-file <file>`. Fill in `.github/pull_request_template.md` and write the body to a temp file. The title becomes the squash commit on `main`, so make it a good one.
7. **Auto-merge.** `gh pr merge <number> --auto --squash --delete-branch`. GitHub merges once the required `ci` check passes. Never use `--admin`, and never touch the ruleset.
8. **Follow CI.**
   - In the Claude desktop app, use the PR tools: `get_status`, then `bind_pr` if the PR isn't bound. Wait for the CI event; don't poll.
   - In a terminal session, use `gh pr checks <number> --watch`.
   - If a check fails, read the log with `gh run view <run-id> --log-failed`. Fix it on the same branch, run `pnpm check`, then commit and push. Auto-merge stays on.
   - If the PR is behind `main` (the ruleset needs branches to be up to date), run `gh pr update-branch <number>`. Then wait for CI again.
9. **After the merge.** Run `git switch main && git pull --ff-only`. Check that `git diff <branch> main` is empty, then `git branch -D <branch>` (`-d` refuses after a squash merge).
10. **Report.** Give the PR link, a line on what landed, how it was checked, and anything deferred.
