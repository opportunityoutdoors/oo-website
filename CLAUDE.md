@AGENTS.md

## What this is

The website and back office for **Opportunity Outdoors**, a North Carolina 501(c)(3) that
runs mentored hunt and fish camps. Public marketing site plus an admin at `/admin` that
carries the whole camp workflow: waitlist, pre-camp meetings, approval, registration,
payment, background screening, mentor matching, welcome packets, and post-camp surveys.
Also handles donations, a mentee nurture sequence, and a partner-events feed.

## Stack

Next.js 16 (App Router) - Sanity (content, Studio embedded at `/admin/studio`) - Supabase
(Postgres, the operational source of truth) - Stripe (donations and camp fees) - Resend
(all email, React Email templates in `src/emails/`) - VolunteerBadge (background checks) -
Google Calendar (pre-camp meeting invites) - Tailwind 4 - deployed on Vercel.

Sanity is the source of truth for event configuration; Supabase mirrors it via the
`/api/revalidate` webhook. Everything about a person lives in Supabase.

## Commands

```bash
npm run dev            # local dev server
npm run build          # production build
npm test               # vitest, pure logic only
npm run fixture -- create|status|reset|destroy   # ZZ TEST Fixture Camp, see TESTING.md
npm run stripe         # project-scoped Stripe CLI wrapper
npm run vercel         # project-scoped Vercel wrapper (reads over REST)
```

Deploy is Vercel on push to `main`. Cron jobs are declared in `vercel.json` and run in UTC
against production.

## Quirks

- **Never run a bare `stripe` or `vercel` CLI.** Use `scripts/stripe.sh` / `scripts/vercel.sh`,
  which pass this project's credentials explicitly from `.env.local`. A global login has
  already pointed at the wrong business once.
- **MCP servers are pinned in `.mcp.json`** and read credentials from `.env.local`. Nothing
  account-touching is allowed at user scope.
- **Sanity date-only fields are midnight UTC.** Format them through
  `src/lib/format-event-date.ts` or dates render a day early outside UTC.
- **Camp location is never disclosed** before the welcome packet, and the packet gate refuses
  anyone not cleared to attend.
- Testing philosophy and the pre-push checklist are in [TESTING.md](TESTING.md). Prefer the
  check that observes the outcome, not the attempt.
- **Run the `verify-oo` skill before reporting any task complete.** It drives the real site
  and admin against the ZZ TEST fixture camp and writes evidence to `.verify/`. A passing
  build is not a verified change.



<!-- CMC:SECTION_START -->
## Memory Compiler

Personal knowledge base auto-compiled from Claude Code conversations lives at [.claude-memory-compiler/](.claude-memory-compiler/). See [.claude-memory-compiler/AGENTS.md](.claude-memory-compiler/AGENTS.md) for the full schema and local design notes (the Installation Note at the top of that file documents how hooks route every worktree to the main checkout's single shared KB via `git rev-parse --git-common-dir`).

Hooks wired in [.claude/settings.json](.claude/settings.json) fire on SessionStart / PreCompact / SessionEnd:
- **SessionStart** — injects today's KB index + recent daily log into new sessions (pure local I/O, no API calls)
- **PreCompact** — before auto-compaction, background-extracts the current session's context into `daily/YYYY-MM-DD.md` via Agent SDK (~$0.02-$0.05)
- **SessionEnd** — same as PreCompact but on session close

Common commands (run from project root):
- `uv run --directory .claude-memory-compiler python scripts/compile.py` — manually compile daily logs → knowledge articles
- `uv run --directory .claude-memory-compiler python scripts/query.py "your question"` — ask the KB (~$0.15-$0.40)
- `uv run --directory .claude-memory-compiler python scripts/batch-flush.py --dry-run` — preview seeding from existing transcripts
- `uv run --directory .claude-memory-compiler python scripts/lint.py --structural-only` — KB health check (free, no API)

Slash commands (user-scope):
- `/install-memory-compiler` — install or upgrade (idempotent)
- `/seed-memory-compiler` — backfill KB from existing Claude Code transcripts
- `/uninstall-memory-compiler` — remove cleanly (preserves user data by default)
<!-- CMC:SECTION_END -->

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
