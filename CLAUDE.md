@AGENTS.md

<!-- MEMORY COMPILER START -->
## Memory compiler

This project has a personal knowledge base at [.claude-memory-compiler/](.claude-memory-compiler/). Hooks in `.claude/settings.json` capture sessions (SessionEnd, PreCompact) into `.claude-memory-compiler/daily/` and inject the knowledge index into every new session (SessionStart). All worktrees share one KB via `git rev-parse --git-common-dir`. See [.claude-memory-compiler/AGENTS.md](.claude-memory-compiler/AGENTS.md) for the schema, hook architecture, and install note.
<!-- MEMORY COMPILER END -->
