# Resources

External tools and references worth keeping. Things that are *wired into* this
config live in `README.md`; this file is for candidates, comparisons, and links.

## Quota / usage tools

### Recommended: CodexBar (cross-provider view + standalone CLI)

A macOS menu-bar app **with a standalone CLI** (`codexbar`). It covers every
provider this setup uses and normalises each provider's quota shape.

- Repo: https://github.com/steipete/CodexBar — MIT, ~22.7k★, actively released (v0.81.0, 2026-10-24).
- Providers include: **OpenCode Go, OpenRouter, OpenCode Zen, DeepSeek, z.ai/GLM** (+100 more).
- Standalone commands:
  ```bash
  codexbar usage  --provider opencodego --format json --pretty
  codexbar usage  --provider all --format json --pretty
  codexbar guard  --provider opencodego --window weekly --min-remaining 20 --json   # exit 0/1/69
  codexbar serve  --port 8080        # GET /usage, /cost for a statusline
  ```
- Install: `brew install --cask codexbar`, then app **Preferences → Advanced → Install CLI**
  (symlinks `codexbar` into `/usr/local/bin` and `/opt/homebrew/bin`).
- Caveats: macOS-first (Linux CLI builds exist). No tool reports opencode-go **per-model monthly
  dollars** — every implementation collapses Go to aggregate 5h/weekly/monthly from the same API.

**Why it is here and not wired in:** nothing quota-related is wired into OpenCode. CodexBar is used
directly — the menu bar for at-a-glance windows, plus a standalone CLI, a `guard` exit code for
scripts, and an HTTP endpoint for a statusline.

### Evaluated and rejected

- **`vbgate/opencode-mystatus`** — https://github.com/vbgate/opencode-mystatus.
  Providers: OpenAI, Zhipu AI, Z.ai, GitHub Copilot, Google Antigravity only — **no
  opencode-go, no OpenRouter**. Plugin-only (`/mystatus`), no standalone CLI, stale (last push
  2026-01-20). Not a fit.

## External tools

- https://basemind.ai/start/installation/ — if basemind is a no-go:
  - https://github.com/ZaxbyHub/opencode-swarm
  - https://github.com/darrenhinde/OpenAgentsControl
- In a repo: `basemind scan`; DESIGN.md tools https://oh-my-design.kr/docs/en ;
  https://github.com/Goldziher/ai-rulez
- Skills source: https://github.com/TerminalSkills/skills
- Convex skills: https://github.com/waynesutton/convexskills
- Bug scanner (installed, not configured for OpenCode):
  https://github.com/Dicklesworthstone/ultimate_bug_scanner
- **Webcmd** (https://webcmd.dev/, `@agentrhq/webcmd`) — "browser infrastructure that
  learns": compiles repeated browser-agent workflows into durable `webcmd <site> <command>`
  CLI commands with structured output. Reviewed 2026-11-07: *not adopted* — it overlaps
  `webfetch`/`websearch` plus the `playwriter` skill, and its ~90% token-reduction claim is
  an illustrative placeholder, not a measured benchmark. Watch candidate if a repeated,
  auth-gated web-UI workflow ever appears (its COOKIE/INTERCEPT/UI strategies).

## MCP

- Inspect a server locally: `npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch`
  — from https://github.com/modelcontextprotocol/servers/issues/4560

## Agent memory

Evaluated 2026-10-25 for OpenCode **v2.1.4** on Apple Silicon (Bun 1.4.4, local Ollama running).
The constraints that remove most of the field: it must load on OpenCode V2 (the `plugins` array, a
`./server` export) and stay local — no cloud API key.

**Status 2026-11-17:** `opencode-mem` (the runner-up below) is enabled in `opencode.jsonc`; nothing
else here is wired in. `ctx` is installed but idle and blocked upstream — see its section.

### Recommended at the time: `@mathew-cf/opencode-memory`

https://github.com/mathew-cf/opencode-memory — memory as **git-tracked markdown**
(`~/opencode-memory/`, seven category dirs) plus local embeddings (~90 MB on `bunx … init`).

- Same philosophy as this config: the store is grep-able, diffable, reviewable; no opaque vector DB.
- Loads on V2 through the package's `./server` export. Ships a bundled skill, a search-first nudge at
  8 tool calls, a retrospective reminder at compaction, and `session_search` across OpenCode (also
  Pi and Codex) history — the actual "what did we decide last session" gap.
- No API key, no background model calls.

Trade-offs: young project; the store is global rather than per-repo (watch for cross-project bleed);
it auto-applies edit permissions for `~/opencode-memory/**`; and its prompt prefixes target only the
built-in subagents, so omo-slim's `explorer`/`orchestrator` will not get them (`explore`/`general`
are disabled here anyway).

Not chosen on 2026-11-17 — the owner enabled `opencode-mem` instead (below). It stays the option
that matches this repo's markdown-and-git philosophy, and the one to revisit if an opaque store,
a localhost service or its audit burden becomes the friction.

### Chosen 2026-11-17: `opencode-mem` (tickernelz)

https://github.com/tickernelz/opencode-mem — 2.42.0 (published 2026-11-09), MIT, V2-native, ~1.9k
stars and pushed daily. Local Turso/libSQL vector store, 12+ local embedding models, automatic
capture, first-message context injection, web UI on `:4747`, TUI toasts. Enabled in
`opencode.jsonc`; tuning lives in `opencode-mem.jsonc` (Xenova embeddings, project scope, 60-day
retention, capture on the OpenRouter MiniMax lane).

Trade-offs as evaluated: heaviest footprint (`@tursodatabase` + `onnxruntime` native bindings, Apple
Silicon only — no Intel support), memory in an opaque SQLite audited through a web UI, one more
localhost service, and auto-extraction can be pointed at a model — keep it on local embeddings,
since a compression model would burn the lanes the presets are tuned to protect.

Ownership note: the earlier comment in `opencode.jsonc` disabled this package because "the ctx daemon
spins CPU". That was a different program — `ctx` (ctx.rs, next section). Verified against
opencode-mem 2.42.0's `package.json`: it depends on libsql/transformers/onnxruntime and has no ctx
dependency, so the CPU loop could not have come from it.

### `ctx` (ctx.rs) — history search across agents, installed but blocked

https://github.com/ctxrs/ctx — CLI plus skill, no plugin entry. `~/.local/bin/ctx` **2.4.1** (newest
release, 2026-11-05) with the skill in `~/.agents/skills/ctx`. Tantivy lexical search over OpenCode,
Continue, Zed and Claude histories, optional local-E5 semantic; no LLM cost. Meant to replace the
frozen `opencode-history-search-v2`.

Checked 2026-11-17 — two separate faults, neither fixed yet:

- **Schema ambiguity — the real blocker.** This machine's `opencode.db` was migrated in place from V1
  to V2, so both generations are populated (`message` 14,238 rows and `session_message` 77,962, with
  `part`/`session_part`/`session_v2` alongside). ctx reports that as an ambiguous message-schema
  family: upstream ctxrs/ctx#1105, fixed by PR #1109 in **v2.2.5**, but a 2.3.0 user still reports it
  and nothing in the 2.3.0–2.4.1 notes touches it. Locally `ctx status` shows
  `Refresh partial (completed with source failures)` and indexes only Continue and Zed — OpenCode
  contributes nothing.
- **Daemon CPU loop.** While the OpenCode server holds the 1.3 GB DB open, ctx's `core_refresh`
  retries for minutes at 40–76% CPU, failing with `SQLite source file changed while its read snapshot
  was active`. That exact message has no upstream issue (prior art: #282, #802, #1030, and the #1132/
  #1125 admission fix already shipped in 2.3.0) — worth filing if it matters.

Safe use today: `ctx index mode manual` (the daemon never auto-indexes) and
`ctx search … --refresh off` (strictly read-only over the published index).

**Watch trigger:** a release **> 2.4.1** whose notes mention the import/ambiguous-schema fix. Then
re-verify with `ctx import --provider opencode --path ~/.local/share/opencode/opencode.db` (exits
non-zero on failure since 2.2.5) before re-enabling auto-indexing. When it works, drop
`opencode-history-search-v2` and its `~/Library/Application Support/opencode/opencode.db` symlink in
the same commit.

### MCP route: Basic Memory

https://github.com/basicmachines-co/basic-memory — markdown + wikilinks beside your own notes, SQLite
index, `uvx basic-memory mcp`; any MCP client can read it (Claude, ChatGPT, Cursor). Goes under `mcp`
in `opencode.jsonc`, not `plugins`, so there is no plugin-loading risk — opencode-pty already lost a
release to the V2 subpath trap.

Trade-offs: tools only, no auto-injection or auto-capture (the agent writes when it decides to);
still 0.2x; adds a Python/uv server.

### Also considered

- **`@chiaboon/opencode-agent-memory`** — LanceDB vectors with **local Ollama** embeddings, zero
  runtime deps, tools only (`memory_store`/`recall`/`forget`). Best local fit on paper, but 26
  downloads/week and last published March 2026.
- **Rejected:** `opencode-supermemory` (cloud API key); `opencode-memory-plugin` (claude-mem port)
  and **Magic Context** (both spend model calls compressing and consolidating memories — the same
  budget the presets are tuned to protect); `mem0` (Docker Compose + Qdrant/Postgres for one user;
  OpenMemory MCP retired July 2026).

### Before wiring any of them

1. `AGENTS.md` stays authoritative; memory is scratch/recall. Two sources of truth drift.
2. Prefer explicit capture over auto-capture, or audit what auto-capture stores on a schedule.
3. Plugins load at process start — `opencode service restart` afterwards, then confirm the TUI
   reports no `plugins failed` and that the tools actually registered.

## Tutorials

- https://opencode.school/
- https://freedium-mirror.cfd/https://ai.sulat.com/the-definitive-guide-to-opencode-from-first-install-to-production-workflows-aae1e95855fb#skills-reusable-knowledge
