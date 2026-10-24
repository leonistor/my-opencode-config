---
description: Validate and show the recommended models for an oh-my-opencode-slim preset
---

Model recommendation for an oh-my-opencode-slim preset. Each preset maps to one
provider, so every agent in a session bills that provider's quota.

!`bun ~/.config/opencode/model-table.ts --validate $ARGUMENTS`

Print the command output exactly as shown, inside a single fenced code block. Keep any warnings and
the "Apply:" line. Add no columns, no "why" or commentary, and do not reformat the numbers.

- Argument is a preset name: `synthetic`, `opencode-go`, `openrouter`, `openrouter-no-floor`
  (`--all` for all of them; no argument = the active preset).
- To switch the session to a preset, use the built-in `/preset <name>`.
- Rationale and per-agent trade-offs live at `~/.config/opencode/oh-my-opencode-slim-models.md`
  (`/models-doc`).
