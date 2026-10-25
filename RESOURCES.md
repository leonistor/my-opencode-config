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

## MCP

- Inspect a server locally: `npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch`
  — from https://github.com/modelcontextprotocol/servers/issues/4560

## Agent memory

Evaluated 2026-10-25 for OpenCode **v2.1.4** on Apple Silicon (Bun 1.4.4, local Ollama running).
Nothing here is wired in. The constraints that remove most of the field: it must load on OpenCode
V2 (the `plugins` array, a `./server` export) and stay local — no cloud API key.

### Recommended: `@mathew-cf/opencode-memory`

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

### Runner-up: `opencode-mem` (tickernelz)

https://github.com/tickernelz/opencode-mem — 3.7k downloads/week, MIT, V2-native, updated
2026-10-24. Local Turso/libSQL vector store, 12+ local embedding models, automatic capture,
first-message context injection, web UI on `:4747`, TUI toasts.

Trade-offs: heaviest footprint (`@tursodatabase` + `onnxruntime` native bindings, Apple Silicon only
— no Intel support), memory in an opaque SQLite audited through a web UI, one more localhost
service, and auto-extraction can be pointed at a model — keep it on local embeddings, since a
compression model would burn the lanes the presets are tuned to protect.

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
