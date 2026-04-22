# LLM Personal Knowledge Base — triceisright fork

> **Private fork** of [coleam00/claude-memory-compiler](https://github.com/coleam00/claude-memory-compiler) with local patches and a one-command installer. See [Differences from upstream](#differences-from-upstream) below.

**Your AI conversations compile themselves into a searchable knowledge base.**

Adapted from [Karpathy's LLM Knowledge Base](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) architecture, but instead of clipping web articles, the raw data is your own conversations with Claude Code. When a session ends (or auto-compacts mid-session), Claude Code hooks capture the conversation transcript and spawn a background process that uses the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk) to extract the important stuff — decisions, lessons learned, patterns, gotchas — and appends it to a daily log. You then compile those daily logs into structured, cross-referenced knowledge articles organized by concept. Retrieval uses a simple index file instead of RAG — no vector database, no embeddings, just markdown.

Anthropic has clarified that personal use of the Claude Agent SDK is covered under your existing Claude subscription (Max, Team, or Enterprise) — no separate API credits needed. Unlike OpenClaw, which requires API billing for its memory flush, this runs on your subscription.

## Install (one command)

From any git-tracked project, in a Claude Code session:

```
/install-memory-compiler
```

Or equivalently via curl + bash (if slash command not configured):

```bash
curl -sSL https://raw.githubusercontent.com/triceisright/claude-memory-compiler/main/install.sh | bash
```

The installer is **idempotent** — run again to upgrade in place. User edits to `AGENTS.md` (inside `<!-- CMC:LOCAL_NOTE_START/END -->` sentinels) and all user data (`daily/`, `knowledge/`) survive upgrades.

## Differences from upstream

| | Upstream | This fork |
|---|---|---|
| Install pattern | Agent-guided clone of whole repo as project root | `.claude-memory-compiler/` subdirectory install via one-command script |
| Concurrent SessionEnds (Claude app quit with N sessions) | All N flushes race on bundled Claude CLI → **all fail with FLUSH_ERROR, content lost** | `flush-exec.lock` file lock serializes concurrent Agent SDK calls — all N succeed |
| Auto-compile trigger | 6 PM local time gate; doesn't fire if no session after 6 PM | Stale-based: any daily-log change + last compile ≥24h → trigger (fires any time of day) |
| Transcript path race (Claude Desktop) | Hook bails with "SKIP: transcript missing" on timing race | 10 × 0.5s retry loop waits for async transcript write |
| Seeding from existing transcripts | Not included | `scripts/batch-flush.py` (upstream PR #10 applied locally) |
| Worktree support | One KB per worktree (fragments across branches) | Single shared KB in main checkout via `git rev-parse --git-common-dir` routing (see Installation Note in AGENTS.md) |

## How It Works

```
Conversation -> SessionEnd/PreCompact hooks -> flush.py extracts knowledge
    -> daily/YYYY-MM-DD.md -> compile.py -> knowledge/concepts/, connections/, qa/
        -> SessionStart hook injects index into next session -> cycle repeats
```

- **Hooks** capture conversations automatically (session end + pre-compaction safety net)
- **flush.py** calls the Claude Agent SDK to decide what's worth saving, and triggers stale-based auto-compilation when yesterday's log is un-compiled
- **compile.py** turns daily logs into organized concept articles with cross-references (triggered automatically or run manually)
- **query.py** answers questions using index-guided retrieval (no RAG needed at personal scale)
- **lint.py** runs 7 health checks (broken links, orphans, contradictions, staleness)
- **batch-flush.py** seeds the KB from existing Claude Code transcripts

## Slash commands

Paired with the installer. Drop these into `~/.claude/commands/` and they become available across all your projects in Claude Code:

- `/install-memory-compiler` — fresh install or in-place upgrade
- `/seed-memory-compiler` — cost-gated backfill from existing transcripts
- `/uninstall-memory-compiler` — clean removal, preserves user data by default

## Uninstall

```
/uninstall-memory-compiler
```

Or:

```bash
curl -sSL https://raw.githubusercontent.com/triceisright/claude-memory-compiler/main/uninstall.sh | bash
```

By default, preserves your `daily/` and `knowledge/` directories by moving them to a timestamped archive directory. Add `--purge` to delete everything.

## How It Works

```
Conversation -> SessionEnd/PreCompact hooks -> flush.py extracts knowledge
    -> daily/YYYY-MM-DD.md -> compile.py -> knowledge/concepts/, connections/, qa/
        -> SessionStart hook injects index into next session -> cycle repeats
```

- **Hooks** capture conversations automatically (session end + pre-compaction safety net)
- **flush.py** calls the Claude Agent SDK to decide what's worth saving, and automatically triggers background compilation when pending changes need a stale knowledge base refreshed
- **compile.py** turns daily logs into organized concept articles with cross-references (triggered automatically or run manually)
- **query.py** answers questions using index-guided retrieval (no RAG needed at personal scale)
- **lint.py** runs 7 health checks (broken links, orphans, contradictions, staleness)

## Key Commands

```bash
uv run python scripts/compile.py                    # compile new daily logs
uv run python scripts/query.py "question"            # ask the knowledge base
uv run python scripts/query.py "question" --file-back # ask + save answer back
uv run python scripts/lint.py                        # run health checks
uv run python scripts/lint.py --structural-only      # free structural checks only
uv run python scripts/batch-flush.py --dry-run       # seed KB from past transcripts
```

## Seeding the Knowledge Base from Past Conversations

If you've already been using Claude Code on a project for a while, `batch-flush.py` extracts knowledge from your existing JSONL transcripts (under `~/.claude/projects/<project>/`) so the KB starts with real context instead of empty. It parses every transcript, chunks large sessions at user-message boundaries (not just the last 30 turns like the live hook), runs LLM extraction on each chunk, and writes everything into dated daily logs ready for `compile.py`.

```bash
uv run python scripts/batch-flush.py --dry-run            # preview — shows sessions, chunks, est. cost
uv run python scripts/batch-flush.py                       # run full extraction
uv run python scripts/batch-flush.py --max-cost 5.00       # stop after $5 spent
uv run python scripts/batch-flush.py --dates 2026-04-11    # only specific dates
uv run python scripts/batch-flush.py --resume              # skip sessions already processed
uv run python scripts/batch-flush.py --compile             # extract + trigger compile
```

The script auto-discovers the transcripts directory from `cwd`; override with `--transcripts-dir`. Resumes via `state.json`, so interruptions are safe.

## Why No RAG?

Karpathy's insight: at personal scale (50-500 articles), the LLM reading a structured `index.md` outperforms vector similarity. The LLM understands what you're really asking; cosine similarity just finds similar words. RAG becomes necessary at ~2,000+ articles when the index exceeds the context window.

## Known limitations

- **KB size ceiling ~100–150 articles.** `compile.py` and `query.py` pass the whole KB in their prompt on every run. Past ~100–150 articles, each compile/query becomes expensive (~$1+) and approaches subscription token limits. Upstream issues [#3](https://github.com/coleam00/claude-memory-compiler/issues/3) and [#5](https://github.com/coleam00/claude-memory-compiler/issues/5) track this. Workarounds: trim old concepts periodically, or wait for upstream retrieval improvements.
- **batch-flush.py bypasses the flush-exec lock.** `batch-flush.py` has its own Agent SDK call path separate from `flush.py::run_flush()`. Normally fine (it's single-threaded), but concurrent with a live flush it could race. Mitigated by the `CLAUDE_INVOKED_BY` recursion guard. Refactor to share the lock is a TODO.
- **KB quality ≤ daily log quality.** `compile.py` extracts articles from whatever's in `daily/`. Thin or misleading log entries produce correspondingly poor articles. If a compiled article is wrong, edit the markdown directly or delete and re-compile.
- **No automatic KB contradiction reconciliation.** `lint.py --contradictions` can surface conflicts but you resolve them by hand.

## Upstream PRs applied locally

- [#2](https://github.com/coleam00/claude-memory-compiler/pull/2) — transcript-file retry loop in `SessionEnd`/`PreCompact` hooks (Claude Desktop race fix)
- [#10](https://github.com/coleam00/claude-memory-compiler/pull/10) — `batch-flush.py` for seeding KB from existing transcripts
- [#13](https://github.com/coleam00/claude-memory-compiler/pull/13) — stale-based auto-compile trigger replacing 6 PM gate + cross-process `last-flush.lock` + regression tests

When upstream merges any of these, we'll rebase this fork to drop the local cherry-picks in favor of the merged versions.

## Local patches (not yet PR'd upstream)

- `flush-exec.lock` in `scripts/flush.py` — serializes concurrent Agent SDK calls. Fixes a production-observed bug where N simultaneous SessionEnds (Claude app restart) caused all N flushes to race on the bundled Claude CLI and fail with `FLUSH_ERROR`. Verified with 5-concurrent-flush stress test.

## Technical Reference

See **[AGENTS.md](AGENTS.md)** for the complete technical reference: article formats, hook architecture, script internals, cross-platform details, costs, and customization options. AGENTS.md is designed to give an AI agent everything it needs to understand, modify, or rebuild the system.

See **[install.sh](install.sh)** and **[lib/install-lib.sh](lib/install-lib.sh)** for the installer internals (sentinel markers, atomic staging, Python-based JSON merge). Tested with `bats test/install.bats` (19 tests).
