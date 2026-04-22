@AGENTS.md


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
