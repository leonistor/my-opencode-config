## About me

- My name is Leo. I'm a fullstack developer based in Brasov, Romania.
- My GitHub username is `leonistor` and my email is `leo.nistor@gmail.com`.

## Communication

- Keep responses concise and to the point - unless the user asks otherwise
- Add doc comments to the code, explain in comments design decisions or tricky stuff

## Working with Git

- Always use semantic commit prefixes (feat:, fix:, docs:, etc.).
- Run the project's lint script before committing, if one exists.
- Never commit, push, or open a PR unless asked.

## Planning mode

- Ask clarifying questions when missing information could materially change the implementation or plan.
- Do not ask questions whose answers can be determined by inspecting the codebase, documentation, configuration, or existing patterns.
- Before planning changes, inspect the relevant parts of the existing codebase.
- Look for existing utilities, hooks, services, components, abstractions, tests, and dependencies that already solve part of the problem.
- Search the repository for similar functionality before creating new abstractions.
- Use deep-dive sub-agents to assist with research.
- Before proposing a custom implementation for a non-trivial problem, research whether a mature open-source package, library, framework feature, or existing project already solves it.
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user.
- Prefer established packages and existing project patterns over implementing substantial infrastructure or abstractions from scratch.
- When an existing package could solve the problem, present it as an option and explain the trade-offs before implementing a custom solution.
- Do not rush to add abstractions, utilities, frameworks, or dependencies. Prefer the simplest solution that fits the existing architecture.

## Reuse before implementation

- Do not implement substantial infrastructure from scratch when an established package or project can reasonably provide it.
- Before implementing functionality involving synchronization, persistence, caching, state management, validation, authentication, authorization, parsing, queues, scheduling, retry logic, storage, offline support, or similar infrastructure, check for existing solutions.
- Prefer small, composable packages over large frameworks when only a small capability is needed.
- Prefer extending existing patterns over introducing parallel implementations.
- Avoid speculative abstractions. Do not introduce generalized infrastructure for hypothetical future requirements.
- Prefer solving the requested problem with the smallest appropriate abstraction.
- Do not add a dependency merely to avoid a few lines of straightforward application code.
- If no suitable package exists, or an existing package introduces disproportionate complexity, explain why a custom implementation is preferable.
- When evaluating a new dependency, consider its maintenance status, activity, license, documentation, API quality, TypeScript support, ecosystem fit, bundle/runtime cost, and compatibility with the project.
- Do not introduce a dependency without asking the user.
- When proposing a new dependency, explain briefly why it is preferable to the relevant alternatives.

## Code style

- Follow the patterns already in neighboring files.
- Do not add comments that restate the code.
- Do not reformat code you are not otherwise changing.

## Change / edit mode

- Use sub-agents when they materially improve implementation quality, research depth, or parallelism.
- For small, localized changes, implement directly rather than creating unnecessary delegation overhead.
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently.
- When using sub-agents, act as a coordinator and review/integrate their work rather than blindly accepting it.
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation.
- After completing features (large or small), always run commands like lint, type check and next build to check code quality.

## Boundaries

- Do not modify unrelated files or widen scope beyond the request without asking permission.
- Do not refactor surrounding code unless it is necessary for the requested change or clearly reduces complexity or risk.
- Never commit secrets, API keys, or .env files.
- If a command fails, report the failure. Do not guess or present assumptions as confirmed results.

## Testing

- Test every change, but prefer a small number of high-value tests over exhaustive tests.
- Test behavior, business rules, regressions, and important integration boundaries - not implementation details.
- Before adding a new test, check whether an existing test can be extended instead.
- Prefer updating existing tests over creating duplicate tests covering the same behavior.
- Do not create tests solely to increase coverage or exercise trivial implementation details.
- Avoid testing framework behavior, library behavior, generated code, or simple pass-through code unless there is project-specific logic involved.
- Keep tests close to the behavior they verify and follow the project's existing testing patterns.
- When a feature changes existing behavior, update obsolete tests rather than preserving tests for the old behavior.
- After implementation, run the most relevant existing test suite and other project quality checks.
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI design

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md

### Python workflow

- **Standards:** @~/.config/opencode/docs/index.md (Python, Docker, tooling)
- **Packages:** @~/.config/opencode/docs/tooling/package-management.md (`uv`)
- **Testing:** @~/.config/opencode/docs/python/testing.md (`pytest`, coverage)

## Tools Provided

Use pty_spawn for any task that needs to run in the background, is long-running, requires interactive input later, or should persist beyond the current response. Use the built-in bash tool ONLY for quick synchronous commands that complete immediately (ls, git status, cat, echo, etc.).

| Tool        | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| ----------- | ------------------------------------------------------------------------------------------- |
| `pty_spawn` | Create a new PTY session (command, args, workdir, env, title, notifyOnExit, timeoutSeconds) |
| `pty_write` | Send input to a PTY (text, escape sequences like `\x03` for Ctrl+C)                         |
| `pty_read`  | Read output buffer with pagination and optional regex filtering                             |
| `pty_list`  | List all PTY sessions with status, PID, line count                                          |
| `pty_kill`  | Terminate a PTY session, optionally cleanup the buffer                                      |

## Skills - Knowledge Injection

Skills are reusable knowledge packages. Load them on-demand for specialized tasks.

### When to Use

- Before unfamiliar work - check if a skill exists
- When you need domain-specific patterns
- For complex workflows that benefit from guidance

### Usage

```bash
skills_list()                              # See available skills
skills_use(name="swarm-coordination")
skills_use(name="cli-builder", context="building a new CLI") # With context
```
