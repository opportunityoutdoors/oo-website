#!/usr/bin/env bash
#
# Project-scoped wrapper for the Stripe CLI.
#
# WHY THIS EXISTS
#
# `stripe login` writes credentials to ~/.config/stripe/config.toml, which is GLOBAL to the
# machine. Every project on this Mac shares it. On 2026-08-04 that config was found logged
# into an unrelated Stripe account ("Fire Tools"), meaning any `stripe` command run from
# this repo was talking to the wrong business. Nothing in .mcp.json prevents that, because
# the CLI is not an MCP server and does not read .env.local.
#
# This wrapper removes the global config from the equation entirely. It passes --api-key
# explicitly on every invocation, sourced from THIS repo's gitignored .env.local, so the
# CLI cannot reach another account no matter what `stripe login` was last pointed at.
#
# It also refuses to run against the wrong thing:
#   - no key            -> stops
#   - a live key        -> stops (local dev must never touch real money)
#   - unverifiable key  -> stops
# and prints the resolved account name before doing anything, so the account you are
# operating on is stated out loud rather than assumed.
#
# USAGE
#   npm run stripe -- listen --forward-to localhost:3000/api/webhooks/stripe
#   npm run stripe:listen
#   npm run stripe -- trigger checkout.session.completed
#
# Do NOT run bare `stripe` in this repo. It will use the global config.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if ! command -v stripe >/dev/null 2>&1; then
  echo "error: stripe CLI not installed. brew install stripe/stripe-cli/stripe" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi

# Same extraction the MCP servers in .mcp.json use, for consistency.
KEY="$(grep -E '^STRIPE_SECRET_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//')"

if [ -z "$KEY" ]; then
  echo "error: STRIPE_SECRET_KEY is empty in .env.local" >&2
  echo "       Add a TEST key (sk_test_...) from the Opportunity Outdoors account." >&2
  exit 1
fi

case "$KEY" in
  sk_live_*|rk_live_*)
    echo "error: refusing to run. STRIPE_SECRET_KEY in .env.local is a LIVE key." >&2
    echo "       Local development must use sk_test_. Live keys belong in Vercel only." >&2
    exit 1
    ;;
esac

# Confirm which account this key actually belongs to BEFORE running the command. The whole
# failure mode being guarded against is silently operating on the wrong business, and a key
# prefix does not tell you the account name.
ACCOUNT_JSON="$(curl -s --max-time 10 https://api.stripe.com/v1/account -u "$KEY:")"
ACCOUNT_NAME="$(printf '%s' "$ACCOUNT_JSON" | python3 "$REPO_ROOT/scripts/stripe-account-name.py" 2>/dev/null || echo "")"

if [ -z "$ACCOUNT_NAME" ]; then
  echo "error: could not reach Stripe to verify the account. Check your connection." >&2
  exit 1
fi

case "$ACCOUNT_NAME" in
  ERROR:*)
    echo "error: Stripe rejected the key in .env.local." >&2
    echo "       ${ACCOUNT_NAME#ERROR:}" >&2
    exit 1
    ;;
esac

echo "stripe (project-scoped) -> account: $ACCOUNT_NAME  [test mode]" >&2
echo "" >&2

exec stripe --api-key "$KEY" "$@"
