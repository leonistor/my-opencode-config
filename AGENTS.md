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

- Always ask clarifying questions
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user
- don't rush to implement or suggest the implementation of heavy abstractions or features, ask if there is a package available

## Code style

- Follow the patterns already in neighboring files.
- Do not add comments that restate the code.
- Do not reformat code you are not otherwise changing.

## Change / edit mode

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## Boundaries

- Do not modify unrelated files or widen scope beyond the request without asking permission.
- Do not add dependencies without asking.
- Never commit secrets, API keys, or .env files.
- If a command fails, report the failure. Do not guess or present assumptions as confirmed results.

## Testing

- Use any testing tools, libraries available to the project for testing your changes
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

Use pty_spawn for any task that needs to run in the background, is long-running, requires interactive input later, or should persist beyond the current response. Examples: dev servers, watch modes, REPLs, builds, database servers. Use the built-in bash tool ONLY for quick synchronous commands that complete immediately (ls, git status, cat, echo, etc.).

| Tool        | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `pty_spawn` | Create a new PTY session (command, args, workdir, env, title, notifyOnExit, timeoutSeconds) |
| `pty_write` | Send input to a PTY (text, escape sequences like `\x03` for Ctrl+C)                         |
| `pty_read`  | Read output buffer with pagination and optional regex filtering                             |
| `pty_list`  | List all PTY sessions with status, PID, line count                                          |
| `pty_kill`  | Terminate a PTY, optionally cleanup the buffer                                              |

---

## Skills - Knowledge Injection

Skills are reusable knowledge packages. Load them on-demand for specialized tasks.

### When to Use

- Before unfamiliar work - check if a skill exists
- When you need domain-specific patterns
- For complex workflows that benefit from guidance

### Usage

```bash
skills_list()                              # See available skills
skills_use(name="swarm-coordination")      # Load a skill
skills_use(name="cli-builder", context="building a new CLI") # With context
```

**Bundled Skills:** cli-builder, learning-systems, skill-creator, swarm-coordination, system-design, testing-patterns
