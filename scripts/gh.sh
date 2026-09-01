#!/usr/bin/env bash
#
# Project-scoped wrapper for the GitHub CLI.
#
# WHY THIS EXISTS
#
# `gh auth login` writes to ~/.config/gh/hosts.yml, which is GLOBAL to this Mac. That file
# holds two identities, triceisright and opportunityoutdoors, and one of them is marked
# active. Every bare `gh` command run from this repo uses whichever one is active.
#
# For git push this repo is already safe: origin uses the github-opportunityoutdoors SSH alias, which pins its own key.
# The GitHub API is the exposed half. `gh repo create`, `gh pr`, `gh issue`, `gh release`
# and `gh api` ignore the remote entirely and act as the global active account. Running
# `gh pr create` here with the other identity active files the PR as the wrong person, and
# it succeeds. That is the failure mode this rule exists to prevent.
#
# This wrapper removes the active-account setting from the equation. It reads the token for
# EXPECTED_ACCOUNT by name and passes it as GH_TOKEN for one invocation, so `gh` cannot act
# as another identity no matter which account `gh auth switch` last selected. It does not
# write to the global config and does not change the active account.
#
# It also refuses to run against the wrong thing:
#   - expected account not logged in       -> stops
#   - resolved identity is not the one     -> stops
#   - origin remote owned by someone else  -> stops
#   - origin uses another account's SSH alias -> stops
# and prints the resolved login before acting, so the account is stated rather than assumed.
#
# USAGE
#   ./scripts/gh.sh repo view
#   ./scripts/gh.sh pr create --fill
#   ./scripts/gh.sh api user --jq .login
#
# Do NOT run bare `gh` in this repo. It will use the global active account.

set -euo pipefail

EXPECTED_ACCOUNT="opportunityoutdoors"
EXPECTED_REPO="opportunityoutdoors/oo-website"
# SSH host alias this repo's origin must use, or "" when origin is HTTPS.
EXPECTED_SSH_HOST="github-opportunityoutdoors"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not installed. brew install gh" >&2
  exit 1
fi

# Read this account's token by name. This does NOT switch the global active account.
TOKEN="$(gh auth token --user "$EXPECTED_ACCOUNT" 2>/dev/null || true)"

if [ -z "$TOKEN" ]; then
  echo "error: no stored token for GitHub account '$EXPECTED_ACCOUNT'." >&2
  echo "       Run: gh auth login --hostname github.com" >&2
  echo "       and sign in as $EXPECTED_ACCOUNT." >&2
  exit 1
fi

# Confirm which identity the token actually belongs to BEFORE running the command. The
# failure mode being guarded against is silently acting as the wrong account, and a name in
# hosts.yml does not prove the token behind it still resolves to that login.
ACTUAL_LOGIN="$(GH_TOKEN="$TOKEN" gh api user --jq .login 2>/dev/null || true)"

if [ -z "$ACTUAL_LOGIN" ]; then
  echo "error: could not reach GitHub to verify the account. Check your connection," >&2
  echo "       or the stored token for $EXPECTED_ACCOUNT has been revoked." >&2
  exit 1
fi

if [ "$ACTUAL_LOGIN" != "$EXPECTED_ACCOUNT" ]; then
  echo "error: refusing to run. Token for '$EXPECTED_ACCOUNT' resolves to '$ACTUAL_LOGIN'." >&2
  exit 1
fi

# The remote is the other half of the target. Check it too, so a repo copied or re-pointed
# at another owner cannot be operated on as if it were this project.
ORIGIN_URL="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"

if [ -z "$ORIGIN_URL" ]; then
  # Do not pass quietly. A guard that cannot resolve its target must say so.
  echo "warning: no 'origin' remote found under $REPO_ROOT. Remote check skipped." >&2
  ORIGIN_REPO="(none)"
else
  # Handles https://github.com/o/r.git, git@github.com:o/r.git, and the per-account SSH
  # host aliases in ~/.ssh/config such as git@github-triceisright:o/r.git.
  ORIGIN_REPO="$(printf '%s' "$ORIGIN_URL" \
    | sed -e 's#^git@[^:]*:##' \
          -e 's#^ssh://git@[^/]*/##' \
          -e 's#^https://github.com/##' \
          -e 's#\.git$##')"

  if [ "$ORIGIN_REPO" != "$EXPECTED_REPO" ]; then
    echo "error: refusing to run. origin is '$ORIGIN_REPO', expected '$EXPECTED_REPO'." >&2
    exit 1
  fi

  # Each account has its own SSH key behind its own Host alias. A repo pointed at the other
  # account's alias would push as the other identity, so treat that as a mismatch too.
  if [ -n "$EXPECTED_SSH_HOST" ]; then
    ORIGIN_SSH_HOST="$(printf '%s' "$ORIGIN_URL" | sed -n -e 's#^git@\([^:]*\):.*#\1#p')"
    if [ "$ORIGIN_SSH_HOST" != "$EXPECTED_SSH_HOST" ]; then
      echo "error: refusing to run. origin SSH host is '$ORIGIN_SSH_HOST'," >&2
      echo "       expected '$EXPECTED_SSH_HOST' (see ~/.ssh/config)." >&2
      exit 1
    fi
  fi
fi

echo "gh (project-scoped) -> account: $ACTUAL_LOGIN  repo: $ORIGIN_REPO" >&2
echo "" >&2

exec env GH_TOKEN="$TOKEN" GH_HOST=github.com gh "$@"
