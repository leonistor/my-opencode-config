# Recipe: OpenPencil for wireframes and full design

**Use when** a project needs a screen or flow laid out before code: a wireframe
pass (`@pencil`) or a finished visual pass (`@designer`). **Do not use** for a
one-off sketch that a text mock or an HTML page answers faster.

The API surface, CLI flags and MCP tools live in `skills/open-pencil/SKILL.md`
(vendored from upstream v0.17.0). This recipe is the *decision* layer: which
mode, which tools, and how the result leaves the editor.

## Pick the mode first

| Need | Mode | Owner | Tool surface |
| --- | --- | --- | --- |
| Screen structure, hierarchy, empty states, "what is on this page" | **Wireframe** | `@pencil` | 42 tools (denylist in `opencode.jsonc`) |
| Component anatomy, variants, states, real content in frames | **Wireframe** | `@pencil` | same 42 |
| Colour, type, spacing, motion, a prototype a person can click | **Full design** | `@designer` | full surface (no denylist) |
| React implementation | neither | `@fixer` | — |

A wireframe is not a prototype. `@pencil` stops when a screen needs polish and
says so; that is the handoff, not a failure.

## One-time setup

1. **Install** the app plus both packages (`bun add -g @open-pencil/cli
   @open-pencil/mcp`). The desktop app starts the HTTP/WS bridge itself
   (`:7600`, `:7601`); stdio clients use `openpencil-mcp`.
2. **Entry in the global config** (`opencode.jsonc` → `mcp.servers.open-pencil`)
   ships `disabled: true` on purpose: design work is the exception, and the entry
   otherwise spawns a bridge in every session. Keep that file untouched.
3. **Subagent**: `oh-my-opencode-slim/pencil.md` is the prompt; `mcps` in
   `oh-my-opencode-slim.json` scopes the server to that agent. Host built-ins
   (`plan`, `build`) see only the collapsed Code Mode catalog entry.
4. The app must be **open with a document**. Without it every call answers
   "start the app" (or times out on a wedged bridge) — report it and stop, never
   retry in a loop.

## Enable it per session or per project

- **Per session / location:** `/mcps` → `open-pencil` → connect. Nothing is
  written to disk; the next session starts with it off again.
- **Per project:** repeat the **whole** entry under `mcp.servers.open-pencil` in
  that project's opencode config — `type`, `command`, `environment` — with no
  `disabled` flag. V2 replaces a same-name entry wholesale, so a partial
  `{ "enabled": true }` override is silently ignored. Working example:
  `~/work/darius/la-ade-insta-static/.opencode/opencode.jsonc`.
- **Global off-switch:** the entry ships `disabled: true`, and only
  `agents.pencil.mcps` names the server, so the orchestrator and every other
  specialist deny it. There is no separate `disabled_mcps` key in this config
  (older comments mention one); to turn design off entirely, keep the entry
  disabled and drop `open-pencil` from `pencil.mcps`.

## Tool selection is a denylist of literal names

`OPENPENCIL_MCP_DISABLED_TOOLS` (comma list) keeps the wireframe posture. In 0.17.0
the surface is 117 verb-first tools; the list leaves **exactly 42** enabled:
build, layout, components, text, verification. Off: variables and design-system
plumbing, vectors, booleans, diff/patches, icons, comments, settings, `eval`.

- Names are matched **literally**, so a renamed tool silently re-enables. After
  every OpenPencil upgrade: `openpencil tool list`, diff against the enabled set,
  regenerate the denylist, and verify the server starts clean with the expected
  count.
- The **observation-loop variant** (a project where you iterate on an existing
  design with comments) adds the seven comment/selection tools back (68 disabled
  names).
- The full-design mode drops the denylist entirely; variables, components and
  `set_behaviour` become legitimate. Do not run full design under the wireframe
  set — it cannot express a design system.

## The loop (wireframe)

1. `list_documents` → `open_document docs/design/<slug>.fig`, or `create_document`
   + `save_document` for a new file. One file per project, one page per flow.
2. Read the project before drawing: `openspec/**`, `docs/design/*.md`, the data
   types or fixtures that will fill the frames, existing components/routes.
3. One `render` (JSX) call per screen; auto-layout frames; frame names are
   PascalCase component names, layer names are the prop or data key.
4. Repeated anatomy becomes a component (`convert_to_components`) plus
   `create_instance` per occurrence — a card or row that appears twice is a
   component.
5. Fill with the project's **real** text via `batch_update` / `update_node`.
6. `export_image` on the frames and read the PNG back — that is the visual gate,
   not the JSX looking right.

## What leaves the editor

- The `.fig` committed under `docs/design/`.
- A **component map** returned to the orchestrator: frame → component name,
  layer → prop/data key, plus the screens covered and the ones left open.
- For full design: exported JSX (`--style tailwind`) or tokens
  (`--format dtcg | tailwind`) for `@fixer`, and the CSS custom properties for
  the app's theme.

## Failure modes seen

- **Dead tool names after an upgrade** — the 0.16 pencil prompt called five tools
  that 0.17 had renamed, so it failed at step 1. Regenerate and re-verify.
- **Silent unrestricted sessions** — regenerating only the global denylist left
  two project configs with full tool access. Update every config that repeats the
  entry.
- **Wrong agent got the server** — without the `mcps` scoping, `plan`/`build`
  sessions pay for 8.1k tokens of schemas they never use (Code Mode holds this
  off; a server-wide `codemode: false` would undo it).
- **Host restart required** — plugins/MCP entries load at `opencode serve
  --service` start; a config change is not live until the host restarts.