# Leo's OpenCode Config

My global OpenCode v2 config for this machine. Agents follow `AGENTS.md`; this
file is the human map — what lives where, and the operational notes that are not
agent instructions.

## Recipes

Procedures for setting up and running agentic tooling across projects, each with
setup, verification and the traps already met. Index and writing conventions:
[cookbook/README.md](cookbook/README.md).

- **[agentation in a Vite app](cookbook/agentation-vite.md)** — point at the
  running UI, have the comments reach the agent, per session.
- **[OpenPencil: wireframes and full design](cookbook/openpencil-design.md)** —
  which mode, which tool surface, what comes back out.
- **[OpenSpec roadmap and status sync](cookbook/openspec-roadmap-sync.md)** — a
  generated `STATUS.md` and a sealed `ROADMAP.md` that cannot drift.
- **[Adversarial docs review](cookbook/adversarial-docs-review.md)** — find docs
  that claim more than the code does, with evidence.
- **[Vocabulary standardisation](cookbook/vocabulary-standardization.md)** — one
  word per concept, and how it stays that way.

## What is here

| Path | Purpose |
| --- | --- |
| `opencode.jsonc` | Providers, plugins, policies, permissions |
| `cli.json` | TUI: theme, keybinds, `attention` (notifications, sound) |
| `oh-my-opencode-slim.json` | Model presets: `openrouter` (active), `opencode-go`, `nomoney`; custom agents |
| `oh-my-opencode-slim/` | Agent prompts; `pencil.md` is the wireframe agent |
| `opencode-mem.jsonc` | Memory tuning: embeddings, capture lane, scope, retention |
| `model-table.ts` | Backs `/suggest-models <preset>` |
| `commands/` | Slash commands |
| `skills/` | Skills available in every project |
| `cookbook/` | Recipes for tools and workflows |
| `plugins/` | Local plugins: the pty wrapper, and cmux hooks once installed |

`AGENTS.md` holds the instructions and house rules. `RESOURCES.md` holds external
tools and links.

## Working with agents

- **Bottom-up** — thin end-to-end slices first; abstractions only when a second
  real use appears.
- **OpenSpec for green-field projects** — new projects are scaffolded with it;
  existing repos are left alone unless asked. Decisions live in `openspec/`, not
  in chat. `openspec validate <name> --strict` before calling work done.
- **Options before adoption** — package research ends with candidates,
  trade-offs and a recommendation; I pick, then it gets integrated.

### `pencil` — wireframes

A global subagent that builds wireframes and component skeletons in OpenPencil:
structure, hierarchy, real text from project data, no polish. Artifacts are
`docs/design/<slug>.fig` plus a PNG check; the component map comes back in its
reply. It needs the OpenPencil desktop app open with a document, and it is the
only agent allowed to call the `open-pencil` MCP server. Setup, tool selection
and the handoff: [cookbook/openpencil-design.md](cookbook/openpencil-design.md).

## Plugins

- `plugins/opencode-pty/` — a local wrapper for `opencode-pty/v2`, registering
  the five pty tools its V2 entry forgets. Removal trigger: `AGENTS.md` § Workarounds.
- `cmux-session.js` + `cmux-feed.js` — cmux's OpenCode hooks, written by
  `cmux hooks opencode install`; not installed here (checked 2026-11-24). They
  give per-workspace session attribution, so notifications can say *Completed in
  <workspace>*. Re-run the install after a cmux upgrade; there is no status
  command. Without them, nothing is lost outside a cmux terminal.

## Notifications

Set in `cli.json` → `attention` (`notifications`, `sound`, `volume`,
`sound_pack`, `sounds`). There is no per-directory setting.

OpenCode's built-in notifier titles a banner with the *session title* and nothing
else — no project, no pane — so two open projects look alike, and a click raises
the app rather than the pane. Until the cmux hooks are installed, split the
channels per launch instead:

```sh
# cmux — banners, no sound
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":true,"sound":false}}' opencode

# kitty — sound only
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":false,"sound":true}}' opencode
```

Also set `enable_audio_bell no` in `kitty.conf` (it adds its own unlabelled bell),
and `app.reorderOnNotification: false` in cmux if a click lands on the wrong
workspace.

## Memory

`opencode-mem` keeps a long-term store — auto-capture per session, a user profile,
and a `memory` tool. Data: `~/.opencode-mem/data`; tuning: `opencode-mem.jsonc`
(local embeddings, project scope, 60-day retention, capture on the cheap MiniMax
lane). `autoUpdate` is on, so a version bump is worth a look at its config.

`AGENTS.md` stays the authority — memory is recall, not a second source of truth —
and automatic capture deserves a periodic audit. Frozen `opencode-history-search`
still answers "what did we decide in that old session"; `ctx` is meant to replace
it, still blocked upstream. Details: `RESOURCES.md` § Agent memory.

## Plannotator

Plan review plus a machine-local Inbox for agent questions. Wire it with the
plugin in `opencode.jsonc` and `{"inboxTool":{"opencode":true}}` in
`~/.plannotator/config.json`, then `opencode service restart` — plugins load at
process start in the long-lived host. Confirm `plannotator_inbox` + `submit_plan`
in a fresh session before calling it done. Usage rules: `AGENTS.md` § Plannotator.

The CLI and the plugin upgrade on separate schedules; keep the halves together:

```sh
plannotator update                 # CLI + Inbox server
plannotator inbox restart          # loads the new server, refreshes the block
plannotator inbox status           # version the Inbox actually runs
opencode plugin update @plannotator/opencode
opencode plugin check
opencode service restart           # drops live sessions: run it when convenient
```

`inbox status` flags a running Inbox whose version differs from the CLI. The
managed block in `AGENTS.md` is refreshed only while untouched; house rules go
below the markers. Set `NO_ANON_PING=1` where Plannotator starts to stop the
anonymous daily ping. `commands/plannotator-*.md` are plugin-owned stubs —
regenerated on install and shadowed by the plugin; do not customise them.

Upstream gap still open: `send_message` results carry the thread `url`, but agents
drop it — a pointer-by-default line in the result text would close that.

## Tips

- Refresh the model list: `opencode models --refresh`
- Inspect an MCP server: `npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch`
- Check what the audio stack is doing: `pmset -g assertions | grep -A1 audio-out`