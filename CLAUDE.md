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
