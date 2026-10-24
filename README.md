# Leo's OpenCode Config

## fixes

open-plan-annotator is no longer loaded (removed 2026-10-24, see `plannotator` below). If it is ever
reinstated, its runtime repair script now lives at:

`node "$(echo ~/.cache/opencode/npm/open-plan-annotator@latest/*/node_modules/open-plan-annotator/scripts/install-runtime.mjs)"`

The cache path carries a per-install id segment after `@latest/`, so it is
`~/.cache/opencode/npm/...`, not the old `~/.cache/opencode/packages/...`.

## plugins

- https://basemind.ai/start/installation/

in case basemind no go:

- https://github.com/ZaxbyHub/opencode-swarm
- https://github.com/darrenhinde/OpenAgentsControl

# in a repo

- basemind scan
- DESIGN.md tools https://oh-my-design.kr/docs/en
- https://github.com/Goldziher/ai-rulez

## skills

- good src: https://github.com/TerminalSkills/skills

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

- bug scanner: https://github.com/Dicklesworthstone/ultimate_bug_scanner installed but not configured for opencode

---

## convex

https://github.com/waynesutton/convexskills

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

- https://opencode.school/
- https://freedium-mirror.cfd/https://ai.sulat.com/the-definitive-guide-to-opencode-from-first-install-to-production-workflows-aae1e95855fb#skills-reusable-knowledge
