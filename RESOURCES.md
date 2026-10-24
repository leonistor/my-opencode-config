# Resources

External tools and references worth keeping. Things that are *wired into* this
config live in `README.md`; this file is for candidates, comparisons, and links.

## Quota / usage tools

### Recommended: CodexBar (Synthetic and cross-provider view)

A macOS menu-bar app **with a standalone CLI** (`codexbar`). It covers every
provider this setup uses and parses Synthetic defensively, which `@slkiser/opencode-quota`
does not (see below).

- Repo: https://github.com/steipete/CodexBar — MIT, ~22.7k★, actively released (v0.81.0, 2026-10-24).
- Providers include: **Synthetic, OpenCode Go, OpenRouter, OpenCode Zen, DeepSeek, z.ai/GLM** (+100 more).
- Synthetic parsing (`docs/synthetic.md`): `GET https://api.synthetic.new/v2/quotas`, tries
  `rollingFiveHourLimit` → `weeklyTokenLimit` → `search.hourly`, then **generic fallbacks**
  (`quotas`, `quota`, `limits`, `usage`, `entries`, `subscription`). This is why it survives
  Synthetic's shape change that breaks `opencode-quota`.
- Standalone commands:
  ```bash
  # key (Synthetic is API-key only)
  printf '%s' "$SYNTHETIC_API_KEY" | codexbar config set-api-key --provider synthetic --stdin

  codexbar usage  --provider synthetic --format json --pretty
  codexbar usage  --provider opencodego --format json --pretty
  codexbar usage  --provider all --format json --pretty
  codexbar guard  --provider synthetic --window weekly --min-remaining 20 --json   # exit 0/1/69
  codexbar serve  --port 8080        # GET /usage, /cost for a statusline
  ```
- Install: `brew install --cask codexbar`, then app **Preferences → Advanced → Install CLI**
  (symlinks `codexbar` into `/usr/local/bin` and `/opt/homebrew/bin`).
- Caveats: macOS-first (Linux CLI builds exist). No tool reports opencode-go **per-model monthly
  dollars** — every implementation collapses Go to aggregate 5h/weekly/monthly from the same API.

**Why it is here and not wired in:** `@slkiser/opencode-quota` is kept (its Go/Zen/OpenRouter numbers
are correct, and its TUI sidebar is useful). Its Synthetic row errors permanently — Synthetic changed
`/v2/quotas` from `rollingFiveHourLimit`/`weeklyTokenLimit` to `subscription` + `search.hourly` +
`planWeeklyLimit`, and the plugin hard-requires the old fields (fix absent even in 6.0.0-beta.1). We
live with the error in the sidebar and use CodexBar when Synthetic numbers are actually needed.

### Evaluated and rejected

- **`vbgate/opencode-mystatus`** — https://github.com/vbgate/opencode-mystatus.
  Providers: OpenAI, Zhipu AI, Z.ai, GitHub Copilot, Google Antigravity only — **no Synthetic, no
  opencode-go, no OpenRouter**. Plugin-only (`/mystatus`), no standalone CLI, stale (last push
  2026-01-20). Not a fit.
- **`@npv12/opencode-quota`** — fork of `@slkiser/opencode-quota`; same Synthetic parser lineage, no gain.
- **`opencode-quotas-extended`** — extra providers, but still aggregates Go the same way.

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

## Tutorials

- https://opencode.school/
- https://freedium-mirror.cfd/https://ai.sulat.com/the-definitive-guide-to-opencode-from-first-install-to-production-workflows-aae1e95855fb#skills-reusable-knowledge
