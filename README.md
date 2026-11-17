# Leo's OpenCode Config

Global OpenCode v2 config for this machine.

| Path | Purpose |
| --- | --- |
| `opencode.jsonc` | The real config: providers, plugins, policies, permissions |
| `cli.json` | TUI only: theme, keybinds, `attention` (notifications/sound) |
| `oh-my-opencode-slim.json` | Model presets — three since the 2026-11-13 consolidation: `opencode-go` (active; all lanes on the Go subscription), `nomoney` (Go-quota relief; the only mixed-provider preset — Go plan/designer lanes, OpenRouter cash on the oracle and `:floor` execution lanes, Mistral failover tails), `openrouter` (all-cash; floor routing on the volume lanes); top-level `agents` holds custom specialists |
| `oh-my-opencode-slim/` | Agent prompt files (`pencil.md` is the OpenPencil wireframe agent) |
| `opencode-mem.jsonc` | Tuning for the `opencode-mem` plugin: embeddings, capture model/lane, project scope, retention (README § Memory) |
| `model-table.ts` | Backs `/suggest-models <preset>` |
| `commands/` | Custom slash commands |
| `plugins/` | Local plugins: the opencode-pty wrapper, plus the two cmux hook files once `cmux hooks opencode install` has run |

Agent instructions: `AGENTS.md`. External tools and links: `RESOURCES.md`.

## Plugins

Local plugin artifacts live under `plugins/`:

- `opencode-pty/` — a local package wrapping `opencode-pty/v2` (which OpenCode cannot
  load as a package spec) and registering the five pty tools the 0.4.0 V2 entry forgets.
  See `AGENTS.md` § Workarounds for the removal trigger.
- `cmux-session.js` + `cmux-feed.js` — the cmux OpenCode hooks, generated and updated by
  `cmux hooks opencode install` (not present as of 2026-11-17; `cmux agent hook install`
  does not exist in 0.65.x). Auto-discovered, no `opencode.jsonc` entry; both return
  early unless `CMUX_SURFACE_ID` is set, and `CMUX_OPENCODE_HOOKS_DISABLED=1` disables
  them per process. There is no status command — re-run the install with `--yes` on a
  fresh clone or after a cmux upgrade. `--project` writes only `.opencode/plugins/cmux-feed.js`.
  Installing them is what gives cmux per-workspace session attribution, and with it
  project-labelled notifications; see § Notifications.

## How I work with agents

Conventions every agent session follows in my projects — the rules themselves live in `AGENTS.md`:

- **Bottom-up** — thin end-to-end slices first; abstractions only when a second real use appears.
- **OpenSpec for green-field projects** — fresh projects are scaffolded with `openspec init`;
  existing repos are left alone unless asked. Spec changes and decisions live in `openspec/`,
  not in chat or scratch files. OpenSpec 2.x: the root is `openspec/config.yaml` plus
  `specs/` and `changes/` (`project.md` is gone — context and per-artifact rules live in
  `config.yaml`), a change starts with `openspec new change <name>`, and the global
  `openspec-*` skills drive the artifact workflow. `openspec update` after an upgrade,
  `openspec validate <name> --strict` before calling work done. Details: `AGENTS.md`
  § Project conventions.
- **Options reviewed before adoption** — package/tool research ends with candidates, trade-offs
  and a recommendation; the pick is mine, and precedes integration.

### The `pencil` agent

A global subagent that builds wireframes and component skeletons in OpenPencil — structure,
hierarchy and real text from project data, not polish. It is declared in
`oh-my-opencode-slim.json` (`agents.pencil`, model inherited from the orchestrator) with its
prompt in `oh-my-opencode-slim/pencil.md`, and it is the only agent allowed to call the
`open-pencil` MCP server in `opencode.jsonc`.

- **Artifacts:** `docs/design/<slug>.fig` plus an exported `<slug>.png` for the visual check. The
  component map (frame → React component → props → data source) comes back in its reply, or in
  `docs/design/<slug>.md` when a brief asks for a persisted note.
- **Boundaries:** `edit` is confined to `docs/design/**`. No `.tsx` output, no design-system tools,
  no icon hunting; polish is `@designer`'s lane, implementation is `@fixer`'s.
- **Needs** the OpenPencil desktop app open with a document. Without it the tools answer "start the
  app" and the agent stops rather than retrying.
- **Cost:** inside that subagent, one Code Mode catalog entry plus `search` (~2k tokens); in
  `plan`/`build` sessions, a two-line "open-pencil (42 tools)" pointer. The orchestrator and the
  omo-slim specialists carry nothing, because omo-slim compiles each agent's `mcps` list into
  `open-pencil_*` denies. To keep it cold per project without editing config: `/mcps` → disconnect.
- **Observation loop (opt-in per project, 2026-11-14):** the denylist above stays wireframe-only
  here, but a project where the owner points at layers and leaves feedback re-enables seven tools
  in its own entry — `get_selection`, `select_nodes`, `viewport_zoom_to_fit` and the four comment
  tools (`get_comments`, `add_comment`, `reply_to_comment`, `resolve_comment`; upstream
  open-pencil/open-pencil#681 — the Comment tool pins threads to layers, agents read, reply,
  resolve). Working example: `~/work/darius/la-ade-insta-static/.opencode/opencode.jsonc`.

## Notifications

Notifications are set in `cli.json` → `attention` (`notifications`, `sound`, `volume`, `sound_pack`,
`sounds`; there is no per-directory config).

**What actually fires, and why several projects look alike (checked 2026-11-17).** The notifier is
OpenCode's own built-in `opencode.notifications` plugin: it calls `attention.notify` with the *session
title* as the banner title and a fixed body (`Session done`, `Permission needs input`, `Input needs
response`, the error text). No directory, no project, no workspace. With two sessions open in two
projects you get two banners that are distinguishable only by session title, both from "OpenCode",
both with the same sound — and a click raises the app, not the pane.

The layer that used to fix that is cmux's hook (README § Plugins), which attributes a session to its
workspace and subtitles the banner `Completed in <workspace>`; the last such store
(`~/.cmuxterm/opencode-hook-sessions.json`, 11-07) still shows it. The hooks are **not installed**,
and cmux's event log records workspace events only — so today cmux contributes nothing to routing and
everything is OpenCode's unlabelled banner. Installing the hooks, then letting cmux be the only
notifier inside cmux, is the fix; until then, split the channels per launch instead — the inline JSON
merges over `cli.json`:

```sh
# cmux window — desktop banners, no sound
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":true,"sound":false}}' opencode

# kitty window — sound only, no banner
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":false,"sound":true}}' opencode
```

That splits cmux from kitty, not project A from project B. kitty adds its own unlabelled channel when
left at defaults (`kitty.conf` sets no bell options), so `enable_audio_bell no` is the other half.
cmux defaults `app.reorderOnNotification: true`, which re-sorts workspaces when a notification
arrives — set it to `false` if a click keeps landing on the wrong workspace.

## Memory

`opencode-mem` (2.42.0, `plugins` in `opencode.jsonc`) keeps a long-term store: auto-capture per
session, a user profile, and a `memory` tool for search. Data lives in `~/.opencode-mem/data`; tuning
is `opencode-mem.jsonc` (local Xenova/nomic embeddings, project scope, 60-day retention, capture on
the OpenRouter MiniMax `:floor` lane — one cheap call per captured prompt, never on a lane the
presets protect). `autoUpdate` is on, so a version change is a config change worth noting.

Two rules still apply: `AGENTS.md` is the authority and memory is recall, not a second source of
truth; and because capture is automatic, audit what it stores on a schedule. `opencode-mem` replaces
nothing else — the frozen `opencode-history-search-v2` still answers "what did we decide in that old
session", and `ctx` (installed, idle, blocked upstream) is meant to take that over. Both stories:
`RESOURCES.md` § Agent memory.

## Plannotator

Plan review plus a machine-local Inbox for agent questions. Wire it with the plugin in
`opencode.jsonc` and `{"inboxTool":{"opencode":true}}` in `~/.plannotator/config.json`, then
`opencode service restart`: plugins load at process start in the long-lived service host, so a host
older than the last wiring change serves new projects without the tools. After any wiring change,
open a fresh session and confirm `plannotator_inbox` + `submit_plan` before calling it done.
Usage rules (one-line pointer after every Inbox send; wiring self-check) and findings:
`AGENTS.md` § Plannotator.

### Two halves, upgraded together

The CLI (`plannotator`, from the install script) serves the Inbox and writes the
`plannotator-inbox` block in `AGENTS.md`; the OpenCode plugin (`@plannotator/opencode`) provides the
`plannotator_inbox` tool and the plan-review hook, and is resolved from npm on its own schedule. A
mismatch leaves a tool talking to a server of another version — e.g. 0.28.46 removed
`wait_for_reply` from the tool while an older Inbox still documents it.

```sh
plannotator update                 # CLI + Inbox server
plannotator inbox restart          # loads the new server; refreshes the AGENTS.md block
plannotator inbox status           # URL, pid, version the Inbox actually runs
opencode plugin update @plannotator/opencode  # tool schema + plan review
opencode plugin check
opencode service restart           # drops live sessions: run it when convenient
```

`inbox status` calls out a running Inbox whose version differs from `plannotator`. The managed
block is refreshed only while it is byte-identical to an earlier version; a block edited by hand is
pinned, so house rules belong below the markers. 0.28.48 adds an anonymous daily ping, on by
default: set `NO_ANON_PING=1` in the environment that starts Plannotator to turn it off.

### Upstream status (draft — not filed; no `gh` on this machine)

For the GitHub web UI (backnotprop/plannotator):

1. ~~**Configurable reminder line.**~~ **Shipped in 0.28.30.** `~/.plannotator/config.json` now takes
   `prompts.inbox.reminder` (string) or `prompts.inbox.runtimes.<host>.reminder`, and
   `inboxReminder` turns the injected line off. Ours points at `AGENTS.md` § Plannotator: my intent,
   then the send protocol + wiring self-check.
2. **Pointer-by-default in send results.** `send_message` results already carry the thread `url`,
   but agents silently drop it; an instruction line in the result text ("end your turn with
   `Inbox: <subject> — <url>`") would make the pointer default on every host.

### Command stubs are plugin-owned

`commands/plannotator-*.md` are copied from `@plannotator/opencode` by its postinstall on every
install, and on OpenCode V2 the plugin registers the three commands natively and reclaims the names
from the stubs. Do not customise them: they get overwritten, and they are shadowed anyway.

## Tips

- Refresh the model list: `opencode models --refresh`
- Inspect an MCP server: `npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch`
