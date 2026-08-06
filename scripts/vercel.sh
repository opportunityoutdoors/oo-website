#!/usr/bin/env bash
#
# Project-scoped wrapper for the Vercel CLI. Same pattern and same reasoning as
# scripts/stripe.sh.
#
# WHY THIS EXISTS
#
# `vercel login` writes to a global config (~/.local/share/com.vercel.cli), shared by every
# project on the machine, and the claude.ai Vercel connector is account-level by design. On
# 2026-08-05 that connector was used from this repo and returned a team containing
# `fire-tools`, `framework`, and `ultra-processed-food-list` but NOT opportunity-outdoors:
# wrong scope, and it exposed unrelated businesses' projects in the process.
#
# This wrapper passes --token and --scope explicitly on every call, sourced from this repo's
# gitignored .env.local, so the CLI cannot see or act on another team's projects.
#
# SETUP (once)
#   1. Create a token at https://vercel.com/account/tokens, scoped to the team that owns
#      opportunity-outdoors. Put it in .env.local as VERCEL_TOKEN.
#   2. Put the owning team's slug in .env.local as VERCEL_SCOPE.
#   3. Run: npm run vercel -- link      (writes .vercel/project.json, pinning the project)
#
# USAGE
#   npm run vercel -- logs <deployment-url>
#   npm run vercel -- env ls
#   npm run vercel -- inspect <url>
#
# Do NOT run bare `vercel` in this repo, and do not use the claude.ai Vercel connector for
# this project: neither is scoped here.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

read_env() {
  [ -f "$ENV_FILE" ] || return 0
  # `|| true` is load-bearing. Under `set -euo pipefail`, grep finding nothing exits 1, the
  # pipeline inherits it, and the whole script dies with no output at all. That is exactly
  # what happened the first time this ran: VERCEL_SCOPE was unset, an optional variable, and
  # the wrapper exited silently before doing anything. Absent must mean empty, not fatal.
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

TOKEN="$(read_env VERCEL_TOKEN)"
SCOPE="$(read_env VERCEL_SCOPE)"

if [ -z "$TOKEN" ]; then
  cat >&2 <<'MSG'
error: VERCEL_TOKEN is not set in .env.local

  Create one at https://vercel.com/account/tokens, scoped to the team that owns
  opportunity-outdoors, then add to .env.local:

    VERCEL_TOKEN=...
    VERCEL_SCOPE=<team-slug>

  Deliberately not falling back to `vercel login`: that config is global and has
  already been observed pointing at the wrong team.
MSG
  exit 1
fi

# --scope is what stops a correctly-authenticated token from acting on the wrong team when
# the token has access to several. Warn rather than fail, since some subcommands ignore it.
SCOPE_ARGS=()
if [ -n "$SCOPE" ]; then
  SCOPE_ARGS=(--scope "$SCOPE")
else
  echo "warning: VERCEL_SCOPE unset. If this token can see more than one team, commands may" >&2
  echo "         resolve against the wrong one. Set VERCEL_SCOPE=<team-slug> in .env.local." >&2
fi

# State the target before acting, so the account is never assumed.
if [ -f "$REPO_ROOT/.vercel/project.json" ]; then
  PROJ="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));print(d.get("projectId","?"))' "$REPO_ROOT/.vercel/project.json" 2>/dev/null || echo "?")"
  echo "vercel (project-scoped) -> scope: ${SCOPE:-<unset>}  project: $PROJ" >&2
else
  echo "vercel (project-scoped) -> scope: ${SCOPE:-<unset>}  project: not linked yet (run: npm run vercel -- link)" >&2
fi
echo "" >&2

# The +"..." form is required, not stylistic. macOS ships bash 3.2, where expanding an
# EMPTY array as "${ARR[@]}" under `set -u` is treated as an unbound variable and aborts.
# VERCEL_SCOPE is optional, so the empty case is the normal one.
exec npx -y vercel@latest --token "$TOKEN" ${SCOPE_ARGS[@]+"${SCOPE_ARGS[@]}"} "$@"
