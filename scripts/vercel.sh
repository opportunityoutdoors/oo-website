#!/usr/bin/env bash
#
# Project-scoped wrapper for Vercel. Same pattern and same reasoning as scripts/stripe.sh.
#
# WHY THIS EXISTS
#
# `vercel login` writes to a global config (~/.local/share/com.vercel.cli), shared by every
# project on the machine, and the claude.ai Vercel connector is account-level by design. On
# 2026-08-05 that connector was used from this repo and returned a team containing
# `fire-tools`, `framework`, and `ultra-processed-food-list` but NOT opportunity-outdoors:
# wrong scope, and it exposed unrelated businesses' projects in the process.
#
# Everything here is driven by this repo's gitignored .env.local and .vercel/project.json,
# so it cannot see or act on another team's projects.
#
# TWO KINDS OF TOKEN, AND IT MATTERS
#
# A Vercel access token may or may not carry a user identity.
#
#   Team/project-scoped token   GET /v2/user -> 404.  REST project endpoints work.
#                               The CLI does NOT work: it calls /v2/user on startup to
#                               identify the caller and dies when there is nobody there.
#   Personal token              GET /v2/user -> 200.  Both the CLI and REST work.
#
# The token in .env.local on 2026-08-08 was the first kind. The CLI's failure mode for it is
# genuinely misleading: it reports "Could not retrieve Project Settings" and advises removing
# the .vercel directory and deploying again. Do NOT do that. Deploying from an unlinked
# directory is how this account ends up with a duplicate project, and the real cause has
# nothing to do with the link, which is intact.
#
# So: read-only inspection is served here over REST, which works with either token. Anything
# needing the real CLI gets a clear explanation up front rather than that error.
#
# SETUP (once)
#   1. Create a token at https://vercel.com/account/tokens and put it in .env.local as
#      VERCEL_TOKEN. For CLI subcommands it must be a personal token with access to the team
#      that owns opportunity-outdoors, not a team- or project-scoped one.
#   2. .vercel/project.json must exist. It is created by `vercel link` and pins both the
#      project and the team, which is what makes the scope unambiguous.
#
# USAGE
#   npm run vercel -- deployments [n]     recent deployments, state and commit (REST)
#   npm run vercel -- project             project name and team (REST)
#   npm run vercel -- whoami              what this token actually is (REST)
#   npm run vercel -- <anything else>     passed to the real CLI, needs a personal token
#
# Do NOT run bare `vercel` in this repo, and do not use the claude.ai Vercel connector for
# this project: neither is scoped here.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
LINK_FILE="$REPO_ROOT/.vercel/project.json"
API="https://api.vercel.com"

read_env() {
  [ -f "$ENV_FILE" ] || return 0
  # `|| true` is load-bearing. Under `set -euo pipefail`, grep finding nothing exits 1, the
  # pipeline inherits it, and the whole script dies with no output at all. That is exactly
  # what happened the first time this ran: VERCEL_SCOPE was unset, an optional variable, and
  # the wrapper exited silently before doing anything. Absent must mean empty, not fatal.
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

json_field() {
  # $1 = file, $2 = key. Empty string when absent, never fatal.
  python3 -c 'import json,sys
try:
    print(json.load(open(sys.argv[1])).get(sys.argv[2], ""))
except Exception:
    print("")' "$1" "$2" 2>/dev/null || echo ""
}

TOKEN="$(read_env VERCEL_TOKEN)"

if [ -z "$TOKEN" ]; then
  cat >&2 <<'MSG'
error: VERCEL_TOKEN is not set in .env.local

  Create one at https://vercel.com/account/tokens with access to the team that owns
  opportunity-outdoors, then add to .env.local:

    VERCEL_TOKEN=...

  Deliberately not falling back to `vercel login`: that config is global and has
  already been observed pointing at the wrong team.
MSG
  exit 1
fi

if [ ! -f "$LINK_FILE" ]; then
  cat >&2 <<'MSG'
error: .vercel/project.json is missing, so the project and team are not pinned.

  Restore it rather than running `vercel link` or deploying from an unlinked
  directory: deploying unlinked can silently create a DUPLICATE project. The file
  is small and its contents are not secret:

    {"projectId":"prj_...","orgId":"team_...","projectName":"oo-website"}

  Read the ids off the project's Settings page in the Vercel dashboard.
MSG
  exit 1
fi

PROJECT_ID="$(json_field "$LINK_FILE" projectId)"
ORG_ID="$(json_field "$LINK_FILE" orgId)"
PROJECT_NAME="$(json_field "$LINK_FILE" projectName)"

if [ -z "$PROJECT_ID" ] || [ -z "$ORG_ID" ]; then
  echo "error: .vercel/project.json is present but missing projectId or orgId." >&2
  exit 1
fi

api() {
  # $1 = path with leading slash. teamId is appended so the call can never resolve against
  # a different team, whatever the token can otherwise see.
  local sep="?"
  case "$1" in *\?*) sep="&" ;; esac
  curl -sS -H "Authorization: Bearer $TOKEN" "${API}${1}${sep}teamId=${ORG_ID}"
}

# State the target before acting, so the account is never assumed.
echo "vercel (project-scoped) -> project: ${PROJECT_NAME:-?} ($PROJECT_ID)  team: $ORG_ID" >&2
echo "" >&2

CMD="${1:-}"

case "$CMD" in
  whoami)
    # Says what the token IS, which is the question worth answering before anything else.
    code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$API/v2/user")"
    if [ "$code" = "200" ]; then
      echo "Personal token: has a user identity, so the Vercel CLI will work."
    else
      echo "Team or project-scoped token: GET /v2/user returned $code, so there is no user"
      echo "identity behind it. REST works; the Vercel CLI does NOT and will report"
      echo "'Could not retrieve Project Settings'. Ignore that message's advice to remove"
      echo "the .vercel directory."
    fi
    ;;

  project)
    api "/v9/projects/$PROJECT_ID" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if "error" in d:
    print("error:", d["error"].get("message")); sys.exit(1)
print("name       ", d.get("name"))
print("id         ", d.get("id"))
print("team       ", d.get("accountId"))
print("framework  ", d.get("framework"))
'
    ;;

  deployments)
    limit="${2:-5}"
    api "/v6/deployments?projectId=$PROJECT_ID&limit=$limit" | python3 -c '
import json, sys, datetime
d = json.load(sys.stdin)
if "error" in d:
    print("error:", d["error"].get("message")); sys.exit(1)
rows = d.get("deployments", [])
if not rows:
    print("No deployments."); sys.exit(0)
for x in rows:
    when = datetime.datetime.fromtimestamp(x["created"] / 1000).strftime("%Y-%m-%d %H:%M")
    meta = x.get("meta", {})
    sha = (meta.get("githubCommitSha") or "")[:7]
    raw = meta.get("githubCommitMessage") or ""
    lines = raw.splitlines()
    msg = lines[0][:52] if lines else ""
    # Bound to a name first. This whole program is inside single shell quotes, so a
    # single quote anywhere in it terminates the string and Python sees garbage.
    state = x.get("state", "")
    print(f"{when}  {state:9} {sha:8} {msg}")
'
    ;;

  "")
    echo "usage: npm run vercel -- <deployments|project|whoami|...>" >&2
    exit 1
    ;;

  *)
    # Anything not served over REST goes to the real CLI, which needs a personal token.
    # Checked first so the failure is explained here rather than misdiagnosed there.
    code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$API/v2/user")"
    if [ "$code" != "200" ]; then
      cat >&2 <<MSG
error: '$CMD' needs the Vercel CLI, and this token cannot drive it.

  GET /v2/user returned $code. This is a team- or project-scoped token with no user
  identity behind it. The CLI calls that endpoint on startup and fails, reporting:

    Could not retrieve Project Settings. To link your Project, remove the
    \`.vercel\` directory and deploy again.

  That message is wrong about the cause and its advice is dangerous. The link is
  intact; deploying from an unlinked directory can create a duplicate project.

  Either:
    - use a read-only subcommand here (deployments, project, whoami), or
    - put a PERSONAL token in .env.local as VERCEL_TOKEN, created at
      https://vercel.com/account/tokens while signed in as a user with access to
      the team that owns this project.
MSG
      exit 1
    fi

    # bash 3.2 on macOS aborts on an empty array expansion under `set -u`, hence the +"..."
    # form. --scope takes the team id from the pinned link file, so it cannot drift.
    exec npx -y vercel@latest --token "$TOKEN" --scope "$ORG_ID" "$@"
    ;;
esac
