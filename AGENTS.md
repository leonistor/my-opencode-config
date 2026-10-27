## About me

- My name is Leo. I'm a fullstack developer based in Brasov, Romania.
- My GitHub username is `leonistor` and my email is `leo.nistor@gmail.com`.

## Communication

- Keep responses concise and to the point - unless the user asks otherwise

## Working with Git

- Always use semantic commit prefixes (feat:, fix:, docs:, etc.).
- Never push without explicit user approval, every time. Never force-push or amend commits that were already pushed.
- Only open a PR when asked.
- If the user asks to hold off, leave work uncommitted.

## Planning mode

- Ask clarifying questions when missing information could materially change the implementation or plan.
- Do not ask questions whose answers can be determined by inspecting the codebase, documentation, configuration, or existing patterns.
- Before planning changes, inspect the relevant parts of the existing codebase, looking for existing utilities, hooks, services, components, abstractions, tests, and dependencies that already solve part of the problem.
- Search the repository for similar functionality before creating new abstractions.
- Use deep-dive sub-agents to assist with research.
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user.

## Reuse before implementation

- Do not implement substantial infrastructure from scratch when an established package, library, framework feature, or existing project pattern can reasonably provide it.
- Before implementing functionality involving synchronization, persistence, caching, state management, validation, authentication, authorization, parsing, queues, scheduling, retry logic, storage, offline support, or similar infrastructure, check for existing solutions.
- Prefer small, composable packages over large frameworks when only a small capability is needed.
- Prefer extending existing patterns over introducing parallel implementations.
- Avoid speculative abstractions. Do not introduce generalized infrastructure for hypothetical future requirements; prefer the smallest appropriate abstraction.
- Do not add a dependency merely to avoid a few lines of straightforward application code.
- When an existing package could solve the problem, present it as an option and explain the trade-offs before implementing a custom solution. If no suitable package exists, or one introduces disproportionate complexity, explain why a custom implementation is preferable.
- When evaluating a new dependency, consider its maintenance status, activity, license, documentation, API quality, TypeScript support, ecosystem fit, bundle/runtime cost, and compatibility with the project.
- Do not introduce a dependency without asking the user; when proposing one, explain briefly why it is preferable to the relevant alternatives.

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

Two things in this config exist only to work around upstream bugs. Each has a clear removal trigger.

### opencode-pty — the local wrapper registers the tools

`plugins/opencode-pty/` is a local plugin *package*, not a plain re-export. Two upstream bugs force it:

- The `opencode-pty/v2` subpath spec cannot be installed from `opencode.jsonc` (npm reads it as the git shorthand `github:opencode-pty/v2`) — opencode-pty issue #85.
- `opencode-pty@0.4.0`'s V2 setup registers its commands but not its tools, so `pty_spawn`/`pty_write`/`pty_read`/`pty_list`/`pty_kill` are silently missing — issue #86; the fix, PR #61, is on `main` only.

`index.ts` keeps the package's `setup` and adds `ctx.tool.transform(...)` for the five tools, mirroring upstream `registerV2Tools`. When a release ships the fix (0.4.1+ with PR #84's dual-mode default export): delete the tool-registration block, and keep the wrapper until the subpath spec installs too.

### cmux — deny policies

`cmux hooks setup` regenerates `plugins/cmux-feed.js` and `plugins/cmux-session.js`, whose default export reuses `id: "cmux.server"` — the same id as the real V2 package at `plugins/cmux/`. Three entries sharing one id makes the TUI report `2 plugins failed: cmux.server, cmux.server`. The `integration.use` deny policies in `opencode.jsonc` keep only the V2 package. Upstream fixed the ids in cmux PR #20819 (merged 2026-10-15), but no tagged release contains it yet (installed app 0.65.2). When a release ships it: re-run `cmux hooks setup`, then delete the two deny entries.

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

<!-- plannotator-inbox:start v1 · added by Plannotator. Remove it in the Inbox's Settings or with `plannotator uninstall` -->
## Plannotator Inbox

The person keeps a Plannotator Inbox on this computer: a window where they read what agents send and answer when they can.
If you have a `plannotator_inbox` tool or a `plannotator-inbox` MCP server, use its `send_message` when the person isn't here to answer in this chat: to ask a decision only they can make (as a `:::question` block), or to hand over finished long work (put the files to read in `attachments`). Then keep working.
Their reply comes back to this session by itself where your agent supports that; otherwise call `wait_for_reply`. When they are here, ask in this chat instead.
<!-- plannotator-inbox:end -->

## Plannotator: what we learned (2026-10)

The managed block above says when to reach for the Inbox. These are our own findings from wiring it
up and testing it for a brainstorm session; they apply whatever host you are on.

- **Ask with cards, not documents.** A `:::question` block is answered; a document attached for
  inline annotation was not annotated once in three attempts, even when the ask was explicit. Attach
  a file when reading it is genuinely useful — never as the surface that carries the feedback.
- **An empty session is never approval.** Closing a Plannotator session, or submitting one with
  nothing in it, is not a decision. The three files in `commands/plannotator-*.md` name every empty
  outcome — empty output, `{"decision":"dismissed"}`, and `"nothingToSend": true` — and end with
  "acknowledge it in one sentence and stop". Honour that: no work follows a blank session. Those
  stubs only run where the plugin cannot register its native commands; upstream now suppresses the
  same outcomes itself, so the rule holds either way.
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
  block above is partly redundant; `inboxReminder: false` turns the injected line off.
- **Silent Inbox sends (fixed 2026-10-27):** agents ended turns after `send_message` with nothing in
  the chat; the thread `url` sits in every send result. The send protocol now requires a one-line
  pointer.
- **"Not configured" in new projects:** sessions attach to the long-lived `opencode serve --service`
  host, which loads plugins at process start — a host older than the last wiring change serves new
  projects without `plannotator_inbox`/`submit_plan`, and agents skipped both silently. Hence the
  self-check; `opencode service restart` is part of any wiring change.
- The setup recipe — global plugin plus `~/.plannotator/config.json` — is in `README.md` §Plannotator.
  If `plannotator_inbox` is not in your tool list, this host is not wired for it — report it and run
  the recipe under "send protocol + wiring self-check" below; never go without silently.

## Plannotator: send protocol + wiring self-check (2026-10-27)

How every session on this machine uses the Inbox. The plugin's injected line says when; this says how.

- **Never send silently.** After every `plannotator_inbox` send (`send_message`, `submit_guide`), put
  exactly one line in the chat before the turn ends:

  `Inbox: <subject> — <url> — <what was asked or handed over>; <blocked: … | going on with …>`

  The URL is the `url` field of the send result (for a later reference in the same thread without a
  new send, `read_thread` returns it). Link it as-is; never invent one, never drop it, no other
  commentary. This closes the loop: the chat always shows where the question lives.
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
- **A plan without review is not approved.** Ending plan mode must go through `submit_plan` when
  the tool exists; `commands/plannotator-*.md` are the CLI fallbacks. If neither could run, say so
  in one sentence and stop — never present a plan as reviewed.
- **In this config repo:** a change to `plugins` in `opencode.jsonc` or to `inboxTool` is incomplete
  until, after `opencode service restart`, a fresh session shows `plannotator_inbox` + `submit_plan`.
  Say so in the same change's summary.
