# Leo's OpenCode Config

Global OpenCode v2 config for this machine.

| Path | Purpose |
| --- | --- |
| `opencode.jsonc` | The real config: providers, plugins, policies, permissions |
| `cli.json` | TUI only: theme, keybinds, `attention` (notifications/sound) |
| `oh-my-opencode-slim.json` | Model presets — each maps to one provider |
| `model-table.ts` | Backs `/suggest-models <preset>` |
| `commands/` | Custom slash commands |
| `plugins/` | Local plugin workarounds (cmux, opencode-pty) |

Agent instructions: `AGENTS.md`. External tools and links: `RESOURCES.md`.

## How I work with agents

Conventions every agent session follows in my projects — the rules themselves live in `AGENTS.md`:

- **Bottom-up** — thin end-to-end slices first; abstractions only when a second real use appears.
- **OpenSpec for green-field projects** — fresh projects are scaffolded with `openspec init`;
  existing repos are left alone unless asked. Spec changes and decisions live in `openspec/`,
  not in chat or scratch files.
- **Options reviewed before adoption** — package/tool research ends with candidates, trade-offs
  and a recommendation; the pick is mine, and precedes integration.

## Notifications

Notifications are set in `cli.json` → `attention` (`notifications`, `sound`, `volume`, `sound_pack`,
`sounds`; there is no per-directory config). Every session sends the same payload, so two concurrent
sessions (cmux + kitty) look identical in Notification Center. Give each launch its own block — the
inline JSON merges over `cli.json`:

```sh
# cmux window — desktop banners, no sound
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":true,"sound":false}}' opencode

# kitty window — sound only, no banner
OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":false,"sound":true}}' opencode
```

## Plannotator

Plan review plus a machine-local Inbox for agent questions. Wire it with the plugin in
`opencode.jsonc` and `{"inboxTool":{"opencode":true}}` in `~/.plannotator/config.json`, then
`opencode service restart`: plugins load at process start in the long-lived service host, so a host
older than the last wiring change serves new projects without the tools. After any wiring change,
open a fresh session and confirm `plannotator_inbox` + `submit_plan` before calling it done.
Usage rules (one-line pointer after every Inbox send; wiring self-check) and findings:
`AGENTS.md` § Plannotator.

### Upstream status (draft — not filed; no `gh` on this machine)

For the GitHub web UI (backnotprop/plannotator):

1. ~~**Configurable reminder line.**~~ **Shipped in 0.28.30.** `~/.plannotator/config.json` now takes
   `prompts.inbox.reminder` (string) or `prompts.inbox.runtimes.<host>.reminder`, and
   `inboxReminder` turns the injected line off. Ours is set to a pointer at `AGENTS.md` § Plannotator:
   send protocol + wiring self-check.
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
