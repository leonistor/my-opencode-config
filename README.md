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

## Tips

- Refresh the model list: `opencode models --refresh`
- Inspect an MCP server: `npx @modelcontextprotocol/inspector uvx --with "mcp<2" mcp-server-fetch`
