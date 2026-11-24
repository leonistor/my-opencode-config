# Recipe: agentation in a Vite app

**Use when** a person should point at the running UI and have their comments land
in the agent's hands — design QA on a live page, a UI review, a batch of small
visual fixes. **Do not use** for an agent-driven browser run (use Playwright /
`playwriter`) or for reviewing a static document (the Inbox or `annotate`).

Two packages, both dev-only, both source-available under **PolyForm Shield**:
`agentation` (the in-page toolbar) and `agentation-mcp` (the store + MCP tools).
They are never a runtime dependency; the licence alone forbids shipping them.

## One-time setup

1. **Install in the web package:** `bun add -d agentation agentation-mcp`. Node
   ≥ 20 (really 22/24) — `agentation-mcp` pulls a native `better-sqlite3`.
2. **Script:** `"dev:agentation": "agentation-mcp server"` (HTTP on **4747**).
3. **Mount lazily, behind both gates** — this is the whole mechanism:

   ```tsx
   const Agentation =
     import.meta.env.DEV && import.meta.env.VITE_ANNOTATE === '1'
       ? lazy(() => import('agentation').then((m) => ({ default: m.Agentation })))
       : null
   // …
   {Agentation && (
     <Suspense fallback={null}>
       <Agentation appName="<project>" endpoint="http://localhost:4747" />
     </Suspense>
   )}
   ```

   `DEV` keeps it out of the bundle (verify: `grep -r agentation dist/` finds
   nothing); `VITE_ANNOTATE` keeps it off in normal dev runs. Without
   `endpoint` the toolbar only copies markdown — annotations never reach the
   agent.
4. **Runner flag** `--annotate` on the project's dev command, doing both things:
   export `VITE_ANNOTATE=1` to the Vite child, and start `dev:agentation` as an
   extra child. Plain `bun run dev` does neither. Do not make the runner start it
   unconditionally: a second store process fights for the port.
5. **Project-local MCP entry** (stdio, joined to the HTTP store — never bind a
   second server):

   ```jsonc
   "mcp": { "servers": { "agentation": {
     "type": "local",
     "command": ["<web>/node_modules/.bin/agentation-mcp", "server",
                 "--mcp-only", "--http-url", "http://localhost:4747"],
     "disabled": false } } }
   ```

   `--mcp-only` is mandatory. The path is relative to the repo root; a bare
   `agentation-mcp` needs a global install.

## Per-session enabling (OpenCode)

There is no runtime toggle: tools register at opencode/host start.

- **On:** set `"disabled": false` on the project entry (or add it), restart the
  session host. A session opened before the edit has no tools.
- **Off:** `"disabled": true` and restart; the toolbar also dies with the dev
  stack. Leaving the tools enabled while the server is down is harmless — they
  list, and calls answer "nothing pending".
- **Rule:** keep it project-local and off by default in the global config; this
  is heavy enough that a global entry costs every session a process.

## The loop

A `/annotate` command makes it repeatable:

1. **Preflight** — confirm the agentation tools are *listed*. If not, stop and
   say so; never pretend a copy-paste round is the same loop. A failing *call*
   is expected while the store is down.
2. **Start the stack in the background** with the annotate flag; wait for the app
   and `:4747` to answer; reuse a store that is already serving.
3. **Capture only** — append every annotation (id, page, element path, component,
   comment) to a per-run file, e.g.
   `openspec/changes/<open change>/annotations-<YYYYMMDD-HHmmss>.md`. That file is
   the durable record; the toolbar's store is not. Do not edit the UI yet.
4. **On DONE** — group by screen and kind, propose fixes, **wait for approval**,
   implement, then `agentation_resolve` each annotation with a one-line summary.
5. **Stop what you started**, and confirm the ports are free.

The watch variant (`agentation_watch_annotations`, re-armed on a quiet timeout)
is for hands-free sessions; the batch variant above is the default because it
produces one reviewable file per run.

## Gotchas

- **One machine-global store** at `~/.agentation/store.db`; pending annotations
  span every project. `AGENTATION_STORE=memory` or a second port are the only
  separators. Say which one a shared machine uses.
- **CORS**: the default policy allows loopback/private origins on any port;
  annotating from a phone over the LAN needs `AGENTATION_CORS_ORIGINS`. The store
  binds loopback unless `--host` / `AGENTATION_HOST`.
- **Port 4747 is written in three places** (mount, MCP entry, server default);
  changing it means changing all three.
- **Naming collision**: a project may already have its own annotation overlay
  (argus-forge has one on a websocket for its capture surface). Agentation is a
  different thing; name the recipe's file and command after it, not after
  "annotate".
- **Paste drift**: snippets copied between repos break on relative paths and the
  `node` prefix. Copy the repo's own entry, not a doc's.
- **Prod check every time**: the licence forbids shipping, and the `DEV` guard is
  the only thing enforcing it — `grep -r agentation <dist>` before a release.