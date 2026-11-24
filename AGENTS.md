## About me

- My name is Leo. I'm a fullstack developer based in Brasov, Romania.
- My GitHub username is `leonistor` and my email is `leo.nistor@gmail.com`.

## Communication

- Keep responses concise and to the point - unless the user asks otherwise

## Working with Git

- Default mode is solo: commit on the current branch and push when I ask, without re-confirming each push.
- A repo is collaborative only when I say so for that repo or session. Then branch instead of committing on main, keep each commit reviewable, and open a PR instead of pushing to main.
- Always use semantic commit prefixes (feat:, fix:, docs:, etc.).
- Never force-push or amend a commit that was already pushed.
- If I ask to hold off, leave work uncommitted.

## Planning mode

- Ask clarifying questions when missing information could materially change the implementation or plan.
- Do not ask questions whose answers can be determined by inspecting the codebase, documentation, configuration, or existing patterns.
- Before planning changes, inspect the relevant parts of the existing codebase, looking for existing utilities, hooks, services, components, abstractions, tests, and dependencies that already solve part of the problem.
- Search the repository for similar functionality before creating new abstractions.
- Use deep-dive sub-agents to assist with research.
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user.

## Project conventions

Standing preferences for projects I own.

- **Build bottom-up.** Start from the concrete case — real entities, real callers, small composable
  pieces — and grow outward. Extract a layer or abstraction only when a second real use exists, and
  prefer one thin end-to-end slice through the real problem over building horizontal layers first.
- **OpenSpec for green-field projects.** When we create a project from scratch, `openspec init` is
  part of the scaffolding unless I opt that project out. Existing repos keep what they have — add
  OpenSpec to one only when I ask. Where `openspec/` exists, use it for change proposals and
  decisions that matter — never a scratch file.
  - **OpenSpec 2.x (this machine: 2.1.1).** The root holds `openspec/config.yaml` (schema,
    project `context:`, per-artifact `rules:`, `operations.<op>.guidance:`) and `openspec/specs/` +
    `openspec/changes/`. There is no `project.md` any more: context that an agent could not infer
    from the code goes under `context:` in `config.yaml`.
  - **The workflow is artifact-driven and skill-led.** Start with `openspec new change <name>`,
    then `openspec status --change <name> --json` for what is left to author; the global
    `openspec-*` skills (`new-change`, `continue-change`, `ff-change`, `apply-change`,
    `verify-change`, `archive-change`, `sync-specs`, `explore`, `propose`, `update-change`,
    `bulk-archive`, `onboard`) are the entry points and carry the per-schema steps. Author
    artifacts from `openspec instructions <artifact>` rather than from memory.
  - **Validate before claiming done:** `openspec validate <name> --strict`. `openspec list --json`
    resolves the root; a first `status` error starting with `Declared in` is a broken `store:`
    reference, not an uninitialized project.
  - **After an OpenSpec upgrade:** `openspec update` refreshes the generated instruction files and
    skills (`--dry-run` to preview), then `openspec doctor` for relationship health. The skills
    live in the global inventory (`~/.agents/skills`), so a project never vendors them; do not run
    `openspec init` in a project that already has a root just to get the skills back.
- **I pick; you bring the options.** Any research-and-evaluation whose result is choosing a package,
  library, tool, or service ends with the candidates compared — trade-offs, maintenance status,
  cost, ecosystem fit — plus your recommendation, and the choice is mine. Nothing gets adopted or
  integrated before I confirm the pick.
- **Grilling is opt-in.** `grill-me` and `grill-with-change` are separate skills (`/grill`,
  `/grill-change`), run only when I ask. Never require them before submitting a plan, and never
  inject a grilling round into an OpenSpec change on your own.
- **Wireframes go through `@pencil`.** Screen and flow layouts, component skeletons and the text
  that fills them are built in OpenPencil, in `docs/design/<slug>.fig`, before any `.tsx` is
  written. `pencil` is a global subagent (every project, like OpenSpec) that returns a component
  map; it needs the OpenPencil desktop app open with a document. The `open-pencil` MCP ships
  **disabled** — enable it for the session (`/mcps` → connect) before delegating, and leave it
  off afterwards. To enable it permanently in one project, repeat the full server entry under
  `mcp.servers.open-pencil` in that project's opencode config with no `disabled` flag: V2
  replaces a same-name entry wholesale, so a bare `{ "enabled": true }` override is silently
  ignored. Finished prototypes and visual polish stay with `@designer`; React implementation
  with `@fixer`.
- **Cost hygiene.** The bill is volume, not model choice: an agent session re-reads its whole
  context every turn, and on the `:floor` lanes ~99% of those tokens are cache reads. Start a
  fresh session per milestone rather than running a 300-turn one, and size the subagent fan-out
  to the work — three parallel lanes cover a sweep; a lane per file just multiplies the same
  context. When a change touches many files, batch them into fewer lanes instead.

## Reuse before implementation

- Do not implement substantial infrastructure from scratch when an established package, library, framework feature, or existing project pattern can reasonably provide it.
- Before implementing functionality involving synchronization, persistence, caching, state management, validation, authentication, authorization, parsing, queues, scheduling, retry logic, storage, offline support, or similar infrastructure, check for existing solutions.
- Prefer small, composable packages over large frameworks when only a small capability is needed.
- Prefer extending existing patterns over introducing parallel implementations.
- Avoid speculative abstractions. Do not introduce generalized infrastructure for hypothetical future requirements; prefer the smallest appropriate abstraction.
- Do not add a dependency merely to avoid a few lines of straightforward application code.
- When an existing package could solve the problem, present it as an option and explain the trade-offs before implementing a custom solution. If no suitable package exists, or one introduces disproportionate complexity, explain why a custom implementation is preferable.
- When evaluating a new dependency, consider its maintenance status, activity, license, documentation, API quality, TypeScript support, ecosystem fit, bundle/runtime cost, and compatibility with the project.
- Every new dependency goes through "Project conventions — I pick; you bring the options": never introduce one without my confirmed pick.

## Cookbook

`cookbook/README.md` indexes recipes for agentic tools and workflows — agentation
in a Vite app, OpenPencil wireframes vs full design, OpenSpec roadmap/status sync,
adversarial docs review. When a task matches a recipe, read it before acting. A
recipe that keeps being needed unprompted gets a thin global skill pointing at
it, never a second copy of the text.

## Change / edit mode

- Use sub-agents when they materially improve implementation quality, research depth, or parallelism.
- For small, localized changes, implement directly rather than creating unnecessary delegation overhead.
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently.
- When using sub-agents, act as a coordinator and review/integrate their work rather than blindly accepting it.
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation.
- After completing features (large or small), always run commands like lint, type check and next build to check code quality.

## Boundaries

- Do not refactor surrounding code unless it is necessary for the requested change or clearly reduces complexity or risk.
- Never commit secrets, API keys, or .env files.
- If a command fails, report the failure. Do not guess or present assumptions as confirmed results.

## Testing

- Test every change, but prefer a small number of high-value tests over exhaustive tests.
- Test behavior, business rules, regressions, and important integration boundaries - not implementation details.
- Before adding a new test, check whether an existing test can be extended instead.
- Prefer updating existing tests over creating duplicate tests covering the same behavior.
- Avoid testing framework behavior, library behavior, generated code, or simple pass-through code unless there is project-specific logic involved.
- Keep tests close to the behavior they verify and follow the project's existing testing patterns.
- When a feature changes existing behavior, update obsolete tests rather than preserving tests for the old behavior.
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## Tools Provided

Use pty_spawn for any task that needs to run in the background, is long-running, requires interactive input later, or should persist beyond the current response. Use the built-in bash tool ONLY for quick synchronous commands that complete immediately (ls, git status, cat, echo, etc.).

| Tool        | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `pty_spawn` | Create a new PTY session (command, args, workdir, env, title, notifyOnExit, timeoutSeconds) |
| `pty_write` | Send input to a PTY (text, escape sequences like `\x03` for Ctrl+C)                         |
| `pty_read`  | Read output buffer with pagination and optional regex filtering                             |
| `pty_list`  | List all PTY sessions with status, PID, line count                                          |
| `pty_kill`  | Terminate a PTY session, optionally cleanup the buffer                                      |

## Workarounds

One thing in this config exists only to work around an upstream bug, with a clear removal trigger.

### opencode-pty — the local wrapper registers the tools

`plugins/opencode-pty/` is a local plugin *package*, not a plain re-export. Two upstream bugs force it:

- The `opencode-pty/v2` subpath spec cannot be installed from `opencode.jsonc` (npm reads it as the git shorthand `github:opencode-pty/v2`) — opencode-pty issue #85.
- `opencode-pty@0.4.0`'s V2 setup registers its commands but not its tools, so `pty_spawn`/`pty_write`/`pty_read`/`pty_list`/`pty_kill` are silently missing — issue #86; the fix, PR #61, is on `main` only.

`index.ts` keeps the package's `setup` and adds `ctx.tool.transform(...)` for the five tools, mirroring upstream `registerV2Tools`. When a release ships the fix (0.4.1+ with PR #84's dual-mode default export): delete the tool-registration block, and keep the wrapper until the subpath spec installs too.

cmux is a supported integration, not a workaround, and it is currently **not installed** (checked
2026-11-24). The command is `cmux hooks opencode install` — `cmux agent hook install` does not exist
in 0.65.x, and nothing named `cmux-tui-journal.js` is written by any version seen here. The install
generates two auto-discovered files in `plugins/`: `cmux-session.js` (session lifecycle → cmux's
restorable session store) and `cmux-feed.js` (Feed approvals). Both return early unless
`CMUX_SURFACE_ID` is set and honour `CMUX_OPENCODE_HOOKS_DISABLED=1`, so they cost nothing outside a
cmux terminal and need no `plugins[]` entry in `opencode.jsonc`.

- Re-run `cmux hooks opencode install --yes` after every cmux upgrade. There is no status or verify
  command; the generated files carry a marker and cmux upgrades them in place. `--project` writes
  `.opencode/plugins/cmux-feed.js` for a project-scoped Feed only. `cmux --version` is the check that
  an upgrade happened at all: the appcast shipped with v0.65.2.2 (the emSign certificate fix) still
  lists 0.65.2, so Sparkle reports "up to date" while that patch waits for a manual DMG or
  `brew upgrade --cask cmux` (checked 2026-11-24).
- Uninstall: `cmux hooks opencode uninstall` (`--project` for the project scope). The session store
  at `~/.cmuxterm/opencode-hook-sessions.json` survives an uninstall.
- What it buys: cmux attributes an OpenCode session to its workspace, so notifications read
  `Completed in <workspace>`, a click lands on the right pane, Feed approvals arrive and the session
  is restorable after a relaunch. Status alone is not hook-driven: with no hooks installed, cmux
  still logs `program_status.changed` per OpenCode session (`ses_…`, `working`/`idle`) by watching
  the terminal — 2,372 session events since 2026-10-30, latest 2026-11-24. Because plugins load when
  the `opencode serve --service` host starts, an install only reaches running sessions after a host
  restart.

## Skills - Knowledge Injection

Skills are reusable knowledge packages. Load them on-demand for specialized tasks.

### When to Use

- Before unfamiliar work - check if a skill exists
- When you need domain-specific patterns
- For complex workflows that benefit from guidance

### Usage

Load a skill with the built-in `skill` tool before starting matching work:

- `skill(name="jevgrep")` — plain load
- `skill(name="shadcn")` — with optional `context` describing the task
- `skill(name="ast-grep-outline")` — structural map of an unfamiliar module before
  reading full source; structural code search and bulk structural edits go through the
  built-in `ast_grep_search` / `ast_grep_replace` tools, not sed/grep across many files

<!-- plannotator-inbox:start v9 · added by Plannotator. Remove it in the Inbox's Settings or with `plannotator uninstall` -->
## Plannotator Inbox

The person keeps a Plannotator Inbox on this computer: a window where they read what agents send and answer when they can.
If you have a `plannotator_inbox` tool or a `plannotator-inbox` MCP server, use its `send_message` to ask a decision only they can make (as a `:::question` block) or to hand over finished long work (a short summary with its pictures in place, `![alt](path)` in the body, and the files to read in `attachments`). Then keep working.
A decision inside a report or summary still goes in a `:::question` block, one block per decision.
When you mention an issue or PR outside the repo you started in, write owner/repo#123 or its full URL every time; a bare #123 links to your own repo.
Their reply comes back to this session by itself where your agent supports that; otherwise read the thread later with `read_thread`.
Be proactive about Inbox updates and about replying to the person through the Inbox when you think they would want you to. Don't withhold important updates or decisions, and don't batch updates to send later: proactivity is better than procrastination.
One thread per work stream, unless the person says otherwise.
A decision you sent to the Inbox stays there. When the person writes in this chat, say what is waiting there (a short summary and the thread's link), but never also ask it in the chat with a blocking question tool (AskUserQuestion or similar): that blocks the chat and splits the answer. Ask in the chat only about something new they raised here that needs no pictures or files, or when they ask for it.
Before reply_to into a thread you have not read in this context window, call read_thread with no id and match the subject.
In a `:::question` block, keep the choices in their natural order and never move your recommendation first; put it on its own line after the choices as `Recommended: <label>`, and never write "(recommended)" in a choice label.
<!-- plannotator-inbox:end -->

## Plannotator: my intent (2026-11-03)

The managed block above is upstream's and is rewritten as releases land (v1 → v9 in a month).
This section is mine and outlives it — where the two differ, this one wins.

- **A decision is a choice between artefacts, paths, scopes, layouts, languages, dependencies,
  orderings, or what "done" means.** It goes to the Inbox every time, whether I am in the chat or
  not. Chat is for what I raise there, a one-line factual check, and status.
- **An attachment is evidence, never the place the question lives.** Hand over finished work with
  the ask as a `:::question` in the message body; pictures go inline where you write about them.
- **At most four questions per message** (the tool allows about eight). More than that is two sends.
- **A 👍 is "read it", never an instruction.** It never authorises a commit, push, delete, deploy or
  publish; an action still pending gets one line, in the same thread, and waits for words.
- **What only I can do outside this conversation is a `:::action` item**, with the command in a
  fenced block: approve a deploy, sign in, touch a security key, merge a PR you cannot merge. A
  choice is still a `:::question`; a status update is neither.
- **Never infer a commit or a push.** Explicit words only — not a reaction, not a "looks good" on
  adjacent work, not silence.

## Plannotator: what we learned (2026-10)

The managed block above says when to reach for the Inbox. These are our own findings from wiring it
up and testing it for a brainstorm session; they apply whatever host you are on.

- **Ask with cards, not documents.** A `:::question` block is answered; a document attached for
  inline annotation was not annotated once in three attempts, even when the ask was explicit. Attach
  a file when reading it is genuinely useful — never as the surface that carries the feedback.
- **An empty session is never approval.** Closing a Plannotator session, or submitting one with
  nothing in it, is not a decision. A blank outcome is `"decision":"dismissed"` or empty output;
  since 0.28.30 upstream also collapses `"nothingToSend": true` / `annotationCount: 0` into that
  dismissal, so no work follows any of them — acknowledge it in one sentence and stop.
- **Never hand-edit `commands/plannotator-*.md`.** The plugin's postinstall rewrites them from its
  own package on every install, and on this host (OpenCode V2) the plugin registers the three
  commands natively and re-registers them to shadow the markdown stubs. They are regenerated
  fallbacks only; house rules belong in this file (and in the injected reminder below).
- **`plannotator review` reports differently.** Its JSON is `{decision, message}` — there is no
  `annotationCount`, so do not look for one there.
- **To test the dismissal path, close the session.** Pressing Submit sends an empty document and
  reports `annotated`, which proves nothing about dismissal.
- **A record in a scratch file is not a record.** Decisions that matter go into `openspec/` (or the
  project's own plan), in the same session that produced them; the Inbox thread scrolls away.
- **Ask one question per real need.** The Inbox thread keeps its own history, so a decision can be read
  back later instead of being reconstructed from a chat scroll.
- **Only one plan-review plugin.** open-plan-annotator was removed on 2026-10-24: it and
  `@plannotator/opencode` both register a plan tool (`annotate_plan` vs `submit_plan`) and both inject a
  system prompt on the `plan` agent, giving the model contradictory instructions. `submit_plan` won — do
  not re-enable `open-plan-annotator@latest`.
- **The plugin injects its own Inbox line per session** (`inboxReminder`, on by default), so the managed
  block above is partly redundant; `inboxReminder: false` turns it off. Since 0.28.30 the text is
  configurable — see "the injected reminder is ours" below.
- **Silent Inbox sends (fixed 2026-10-27):** agents ended turns after `send_message` with nothing in
  the chat; the thread `url` sits in every send result. The send protocol now requires a one-line
  pointer.
- **"Not configured" in new projects:** sessions attach to the long-lived `opencode serve --service`
  host, which loads plugins at process start — a host older than the last wiring change serves new
  projects without `plannotator_inbox`/`submit_plan`, and agents skipped both silently. Hence the
  self-check; `opencode service restart` is part of any wiring change.
- **The injected reminder is ours (0.28.36).** `~/.plannotator/config.json` →
  `prompts.inbox.reminder` (or `prompts.inbox.runtimes.opencode.reminder`) replaces the hardcoded
  per-session line. Ours is a short pointer to the send protocol below, not a second copy of it:
  edit the config when the protocol's location changes, not the rules themselves. This was upstream
  item #1; item #2 (pointer-by-default in send results) is still open in `README.md`.
- The setup recipe — global plugin plus `~/.plannotator/config.json` — is in `README.md` §Plannotator.
  If `plannotator_inbox` is not in your tool list, this host is not wired for it — report it and run
  the recipe under "send protocol + wiring self-check" below; never go without silently.
- **The managed block is the CLI's, not the plugin's.** `plannotator` writes it at Inbox start and
  brings an untouched earlier block up to the current version; the text went v1 → v9 in a month
  (v9 current, 2026-11-24).
  A block edited by hand is pinned and never refreshed, so house rules go below the markers.
- **`wait_for_reply` is gone (0.28.46+).** `plannotator_inbox` answers `action_removed`; a reply
  arrives by itself once the session is idle, and a missed one is read back with `read_thread`.
  `supersedes` withdraws questions that no longer apply; `resolve_message` archives a thread only
  when nothing in it is left to read or answer.

## Plannotator: send protocol + wiring self-check (2026-10-27)

How every session on this machine uses the Inbox. The plugin's injected line says when; this says how.

- **Never send silently.** After every `plannotator_inbox` send (`send_message`, `submit_guide`), put
  exactly one line in the chat before the turn ends:

  `Inbox: <subject> — <url> — <what was asked or handed over>; <waiting on: … | going on with: …>`

  Most sends are both: name what waits on the answer *and* what continues without it. "Nothing
  continues" is a valid answer; omitting the waiting half is not. The URL is the `url` field of the
  send result (for a later reference in the same thread without a new send, `read_thread` returns
  it). Link it as-is; never invent one, never drop it, no other commentary. This closes the loop:
  the chat always shows where the question lives.
- **Check the wiring, never go without.** Before the first Inbox send or a plan review in a session,
  confirm `plannotator_inbox` (and, when a plan is about to end, `submit_plan`) is in your tool list.
  If it is missing, that is a fault to report in the chat — with the recipe, never a silent skip:
  1. `plannotator inbox --background` — starts the Inbox; the tool registers in the *next* session.
  2. `~/.plannotator/config.json` keeps `{"inboxTool":{"opencode":true}}`.
  3. `@plannotator/opencode` stays in `opencode.jsonc` `plugins`.
  4. All three good but the tool still missing → the `opencode serve --service` host predates the
     wiring (plugins load at process start). Ask the person to run `opencode service restart` — a
     restart drops live sessions, so never bounce the host yourself.
  Until the wiring works, fall back to asking in the chat. The Inbox's silence is never the
  person's answer.
- **The Inbox process is long-lived as well.** `plannotator inbox status --json` prints `version`,
  what the running Inbox serves, beside `cli_version`, what is installed. Updating installs a new
  CLI and plugin without restarting the running Inbox: on 2026-11-22/23 it served 0.29.0 through
  the 0.29.1, 0.29.2 and 0.29.3 installs, so every send was parsed by 0.29.0 code, which predates
  the 0.29.2 `:::action` run card and the 0.29.3 reply fixes. When the two versions differ, run
  `plannotator inbox restart` and check again; go on with the Inbox meanwhile, an open review keeps
  running on the old build. `plannotator update`'s own install records (`update.log`,
  `update-result.json`) last show 0.28.51 on 2026-11-07, so the version a process reports is the
  only reliable account of what is live.
- **A plan without review is not approved.** Ending plan mode must go through `submit_plan` when
  the tool exists; `commands/plannotator-*.md` are the CLI fallbacks. If neither could run, say so
  in one sentence and stop — never present a plan as reviewed.
- **In this config repo:** a change to `plugins` in `opencode.jsonc` or to `inboxTool` is incomplete
  until, after `opencode service restart`, a fresh session shows `plannotator_inbox` + `submit_plan`.
  Say so in the same change's summary.
