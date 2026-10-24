# Leo's OpenCode Config

## fixes

open-plan-annotator is no longer loaded (removed 2026-10-24, see `plannotator` below). If it is ever
reinstated, its runtime repair script now lives at:

`node "$(echo ~/.cache/opencode/npm/open-plan-annotator@latest/*/node_modules/open-plan-annotator/scripts/install-runtime.mjs)"`

The cache path carries a per-install id segment after `@latest/`, so it is
`~/.cache/opencode/npm/...`, not the old `~/.cache/opencode/packages/...`.

### opencode-pty — local wrapper registers the tools

`plugins/opencode-pty/index.ts` is a local plugin package, not a plain re-export. Two upstream bugs
force it (both tracked, neither fixed in a release):

- The `opencode-pty/v2` subpath spec cannot be installed from `opencode.jsonc` (npm reads it as the
  git shorthand `github:opencode-pty/v2`) — upstream issue #85.
- `opencode-pty@0.4.0`'s V2 setup registers its **commands but not its tools**, so every `pty_*` tool
  was silently missing from 2026-10-14 until this wrapper registered them (upstream issue #86; the
  fix, PR #61, is on `main` only).

The wrapper keeps the package's `setup` and adds `ctx.tool.transform(...)` for the five tools,
mirroring upstream `registerV2Tools`. **When a release ships the fix** (0.4.1+ with PR #84's
dual-mode default export), delete the tool-registration block and keep the wrapper until the subpath
spec is also installable.

### cmux — deny policies still required

`cmux hooks setup` regenerates two loose plugin files (`cmux-feed.js`, `cmux-session.js`) whose
default export reuses `id: "cmux.server"` — the same id as the real V2 package at `plugins/cmux/`.
Three entries sharing one id makes the TUI report `2 plugins failed: cmux.server, cmux.server`. The
`integration.use` deny policies in `opencode.jsonc` keep only the V2 package. Upstream fixed the ids
in PR #20819 (merged 2026-10-15) but **no tagged cmux release contains it** (installed app 0.65.2).
When a release ships it: re-run `cmux hooks setup`, then delete the two deny entries.

## notifications

OpenCode v2's desktop notifications live in `cli.json` under `attention`
(`notifications`, `sound`, `volume`, `sound_pack`, `sounds`). There is no per-directory CLI config and
no `attention.enabled`. The built-in notifier fires on `session.execution.*` and `permission.asked`
with **title = the session title and a fixed body ("Session done")**, delivered as OSC 99 (kitty) /
OSC 777 (cmux). The routing is per-tty-correct, but the payload is identical, so with two concurrent
sessions macOS Notification Center groups them and you cannot tell which window fired.

To disambiguate two live sessions (e.g. cmux + kitty), give each launch its own `attention` block —
the inline JSON merges over `cli.json`:

```sh
# cmux window — desktop banners, no sound
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":true,"sound":false}}' opencode

# kitty window — sound only, no banner
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":false,"sound":true}}' opencode
```

Better (self-identifying banners) would be a small TUI plugin that calls `attention.notify` with a
`[kitty|cmux] <dir> · <session title>` title; not written yet. Also useful: macOS System Settings →
Notifications, styled per app (kitty vs cmux), and `attention.sounds` per-event overrides.

## external tools

Candidates, comparisons, and links live in `RESOURCES.md` (including the CodexBar
quota-tool recommendation).

## MCPs

- commented, copy in project config

## plannotator

Plan review plus a local Inbox: one window per machine where agents leave me questions to click and
files to look at, without holding a session open.

Wiring the Inbox tool (off by default for OpenCode) takes two pieces — and it is per host, not per
project:

1. `opencode.jsonc`, global `plugins`:
   ```jsonc
   "@plannotator/opencode",
   ```
2. `~/.plannotator/config.json`, merged in, keeping every other key:
   ```json
   { "inboxTool": { "opencode": true } }
   ```

Then restart (`opencode service restart`). Plugins load at process start, so a connection only takes
effect in the *next* session. It ships with every request: ~8 KB, roughly 2,300 tokens.

- An agent's send never opens a window; it starts a stopped Inbox in the background. I open mine with
  `plannotator inbox`.
- Sessions bind a random localhost port, and the thread URL carries it. `plannotator sessions` lists
  the live ones.
- To test a session, run it in the background and read stdout when it exits: `plannotator annotate
  <file> --json` prints one record with the decision.

### What actually worked

- **Cards, not documents.** A `:::question` block gets answered every time. Three rounds of an
  attached Markdown file produced zero annotations — the answers came back, the comments never did.
  Attachments are optional reading; the card is the surface.
- **Closing a session is not approval.** The three files in `commands/plannotator-*.md` say so, and
  cover the three empty outcomes: empty output, `{"decision":"dismissed"}`, and a submission that
  carried nothing (`"annotationCount": 0`, `"nothingToSend": true`). `plannotator review` differs:
  its JSON is `{decision, message}` with no `nothingToSend`, so it gets the `dismissed` clause only.
- **To test dismissal, press Close — not Submit.** Submit sends an empty document and reports
  `annotated`; only Close reports `dismissed`.
- **One question per real need.** The Inbox thread keeps its own history, so a decision can be read
  back later instead of being reconstructed from a chat scroll.
- **Only one plan-review plugin.** On 2026-10-24 open-plan-annotator was removed: it and
  `@plannotator/opencode` both register a plan tool (`annotate_plan` vs `submit_plan`) and both
  inject a system prompt on the `plan` agent telling it to use theirs, so the model got contradictory
  instructions. `submit_plan` won. Keep it that way — do not re-enable `open-plan-annotator@latest`.
- **The `commands/plannotator-*.md` stubs are shadowed.** Since 0.28.x the plugin registers
  `/plannotator-review|annotate|last` natively (`ctx.command.transform`; it re-registers when the
  stub's description differs, which ours do). The stubs only run on a host without native command
  execution. Our hardening is therefore belt-and-braces: upstream suppresses empty and dismissed
  outcomes itself (`buildReviewPromptFromBridgeOutcome` returns no message for `dismissed`; annotate
  returns early on empty feedback). Keep them for the fallback path, but they are not what runs here.
- **The plugin injects its own Inbox line per session** (`inboxReminder`, on by default, one line
  telling the agent when to use the Inbox), so the managed AGENTS.md block is partly redundant.
  `inboxReminder: false` turns the injected line off.

## to investigate

- bug scanner (installed, not configured for opencode): see `RESOURCES.md`

---

## tips

### refresh models

`opencode models --refresh`

### inspect mcp

```
npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch
```

from https://github.com/modelcontextprotocol/servers/issues/4560

### tuts

See `RESOURCES.md`.
