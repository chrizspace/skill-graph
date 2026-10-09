#!/usr/bin/env bash
# Idempotent GitHub setup for the feature-branch workflow:
#   - squash merges only, auto-merge on, branches deleted after merge
#   - a ruleset on main: pull request required (no approvals: you can't approve your own PR),
#     the `ci` check must pass on an up-to-date branch, no force pushes, no deletion, linear history, no bypass
#   - secret scanning with push protection, Dependabot alerts and security updates
# Usage: scripts/setup-repository.sh [owner/repo]   (defaults to the current repository)
set -euo pipefail

command -v gh >/dev/null && command -v jq >/dev/null || { echo "gh and jq are required." >&2; exit 1; }

repository="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"

gh api --method PATCH "repos/${repository}" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F allow_auto_merge=true \
  -F allow_update_branch=true \
  -F delete_branch_on_merge=true \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY >/dev/null
echo "Merge settings: squash only, auto-merge on, delete branch on merge."

gh api --method PATCH "repos/${repository}" --input - >/dev/null <<'JSON'
{ "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
gh api --method PUT "repos/${repository}/vulnerability-alerts" >/dev/null
gh api --method PUT "repos/${repository}/automated-security-fixes" >/dev/null
echo "Secret scanning with push protection, Dependabot alerts and security updates on."

actions_app_id="$(gh api /apps/github-actions --jq .id)"
payload="$(jq -n --argjson app "$actions_app_id" '{
  name: "main",
  target: "branch",
  enforcement: "active",
  bypass_actors: [],
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [
    { type: "deletion" },
    { type: "non_fast_forward" },
    { type: "required_linear_history" },
    { type: "pull_request", parameters: {
        required_approving_review_count: 0,
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
        allowed_merge_methods: ["squash"] } },
    { type: "required_status_checks", parameters: {
        strict_required_status_checks_policy: true,
        do_not_enforce_on_create: false,
        required_status_checks: [ { context: "ci", integration_id: $app } ] } }
  ]
}')"

ruleset_id="$(gh api "repos/${repository}/rulesets" --jq '.[] | select(.name == "main") | .id' | head -n 1)"
if [[ -n "$ruleset_id" ]]; then
  gh api --method PUT "repos/${repository}/rulesets/${ruleset_id}" --input - <<<"$payload" >/dev/null
  echo "Updated ruleset \"main\" (${ruleset_id})."
else
  gh api --method POST "repos/${repository}/rulesets" --input - <<<"$payload" >/dev/null
  echo "Created ruleset \"main\"."
fi

echo "Configured ${repository}."
