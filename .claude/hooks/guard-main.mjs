#!/usr/bin/env node
/**
 * PreToolUse hook for Bash: keeps every change on a feature branch.
 * Blocks (exit 2, the reason goes back to Claude):
 *   - git commit / merge / cherry-pick / revert / am while the current branch is main
 *   - any git push that targets main, or a bare `git push` from main
 *   - force pushes and --no-verify
 *   - gh pr merge --admin (it skips the required CI check)
 * GitHub's ruleset on main enforces the same server side; this hook just stops the mistake earlier.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const PROTECTED = "main";

let input = "";
for await (const chunk of process.stdin) input += chunk;
let command = "";
let cwd = process.cwd();
try {
  const payload = JSON.parse(input);
  command = payload?.tool_input?.command ?? "";
  cwd = payload?.cwd ?? cwd;
} catch {
  process.exit(0); // not something we understand: let the normal permission flow decide
}

// split into simple commands on ; && || | and newlines, then tokenize each with quote handling
function tokenize(segment) {
  const tokens = [];
  let current = "";
  let quote = null;
  let started = false;
  for (const ch of segment) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || current) tokens.push(current);
      current = "";
      started = false;
    } else {
      current += ch;
    }
  }
  if (started || current) tokens.push(current);
  return tokens;
}
const segments = command
  .split(/&&|\|\||;|\||\n/)
  .map((s) => tokenize(s.trim()))
  .filter((t) => t.length);

function currentBranch(dir) {
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function block(reason) {
  process.stderr.write(
    `${reason}\nWork on a feature branch instead: git switch main && git pull --ff-only && git switch -c feat/<milestone>-<slug>, ` +
      "then ship it with a PR (see .claude/skills/ship/SKILL.md). main only changes through PRs that pass CI.\n",
  );
  process.exit(2);
}

for (let tokens of segments) {
  // skip leading env assignments (FOO=bar git commit …)
  while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) tokens = tokens.slice(1);
  const [bin, ...rest] = tokens;

  // follow `cd <dir> && git …` so the branch check looks at the right repository
  if (bin === "cd" && rest[0]) {
    cwd = resolve(cwd, rest[0].replace(/^~(?=$|\/)/, process.env.HOME ?? "~"));
    continue;
  }

  if (bin === "gh" && rest[0] === "pr" && rest[1] === "merge" && rest.includes("--admin")) {
    block("Blocked: `gh pr merge --admin` bypasses the required CI check on main.");
  }
  if (bin !== "git") continue;

  // git global options before the subcommand: -C <dir>, -c <key=value>, --flags
  let dir = cwd;
  let i = 0;
  while (i < rest.length && rest[i].startsWith("-")) {
    if (rest[i] === "-C") {
      dir = rest[i + 1] ?? dir;
      i += 2;
    } else if (rest[i] === "-c") i += 2;
    else i += 1;
  }
  const sub = rest[i];
  const args = rest.slice(i + 1);
  const branch = currentBranch(dir);

  if (args.includes("--no-verify")) block("Blocked: --no-verify skips the repository's checks.");

  if (["commit", "merge", "cherry-pick", "revert", "am"].includes(sub) && branch === PROTECTED) {
    block(`Blocked: \`git ${sub}\` on ${PROTECTED}.`);
  }

  if (sub === "push") {
    if (
      args.some(
        (a) => a === "-f" || a === "--force" || a.startsWith("--force-with-lease") || a.startsWith("+"),
      )
    ) {
      block("Blocked: force pushes are not allowed.");
    }
    const positional = args.filter((a) => !a.startsWith("-"));
    const refspecs = positional.slice(1); // first positional is the remote
    const targetsMain = refspecs.some((r) => {
      const dst = r.includes(":") ? r.split(":").pop() : r;
      return (
        dst === PROTECTED || dst === `refs/heads/${PROTECTED}` || (dst === "HEAD" && branch === PROTECTED)
      );
    });
    if (targetsMain || (refspecs.length === 0 && branch === PROTECTED)) {
      block(`Blocked: pushing to ${PROTECTED}.`);
    }
  }
}

process.exit(0);
