# Configuration improvements

Review date: 2026-10-02. Findings validated against resolved runtime state
(`opencode debug config`, `opencode mcp list`, `opencode debug agent`) and
opencode-mem logs. This document is instructions only — nothing here has been
applied automatically.

Each section states the problem, the exact edit, and how to verify it.
All edits are reversible; back up any file before changing it.

---

## 1. Re-enable opencode-mem auto-capture (high)

**Problem.** `opencode-mem.jsonc` sets `autoCaptureEnabled: true`, but no capture
provider is configured, so every session logs:

```
Auto-capture disabled by configuration. Issues: opencodeProvider is not configured; ...
user-profile-learning: skipped (provider not ready): ...
```

Evidence: `~/.opencode-mem/opencode-mem.log` (2026-10-02 sessions). Auto-capture,
deduplication, and user-profile learning are effectively dead; the 527 MB store
and the web UI at `http://127.0.0.1:4747` are not being fed.

**Edit.** In `~/.config/opencode/opencode-mem.jsonc`, add the provider block
(the plugin calls opencode's `session.prompt`, so no separate API key is needed):

```jsonc
"opencodeProvider": "synthetic",
"opencodeModel": "syn:small:text",
```

`syn:small:text` is cheap, has a 192k context, and is already authenticated.
Alternative: `"opencodeProvider": "opencode-go"`, `"opencodeModel": "deepseek-v4-flash"`.

**Verify.** Start a session and confirm the log no longer prints
`Auto-capture disabled`. Toasts for captured memories / profile updates should
resume.

---

## 2. Enable the Observer vision agent (high)

**Problem.** The orchestrator is `synthetic/syn:large:text` (text-only). The
synthetic preset defines an `observer` on `synthetic/syn:large:vision`, but
`observer` is disabled by default and `disabled_agents: []` is absent from the
config. Pasted images/screenshots/PDFs are therefore dropped — noticeable when
`@designer` (which runs on `syn:large:vision`) does UI work from a screenshot.

**Edit.** In `~/.config/opencode/oh-my-opencode-slim.json`, add these two
top-level keys next to `preset`:

```jsonc
"disabled_agents": [],
"image_routing": "auto",
```

`disabled_agents: []` re-enables Observer; `image_routing: "auto"` routes
attachments to it (requires Observer to be enabled).

**Verify.** `opencode debug config` should show `disabled_agents: []` and
`image_routing: "auto"`, and the `observer` agent should appear in
`opencode agent list`.

---

## 3. Grant design skills to @designer (medium)

**Problem.** `presets.synthetic.designer` has `"skills": []`, which resolves to
`skill: { "*": "deny" }`. Design skills already installed (shadcn, impeccable,
frontend-design, design-taste-frontend, redesign-existing-projects) cannot be
activated by the designer agent.

**Edit.** In `~/.config/opencode/oh-my-opencode-slim.json`, change
`presets.synthetic.designer` to:

```jsonc
"designer": {
  "model": "synthetic/syn:large:vision",
  "skills": ["shadcn", "impeccable", "frontend-design", "design-taste-frontend", "redesign-existing-projects"],
  "mcps": []
}
```

**Optional companion grants** (same file):
- `presets.synthetic.explorer` → `"skills": ["codemap"]` (bundled plugin skill).
- `presets.synthetic.fixer` → `"skills": ["verification-planning"]`.

Skill names not present in a given project are simply ignored, so global grants
are safe.

**Verify.** `opencode debug config` shows the designer's `skill` permission
allowing the listed names (and `opencode debug skill` still resolves them).

---

## 4. cmux + Ghostty settings (medium)

**Problem.** `~/.config/cmux/cmux.json` is entirely commented out — no settings
are file-managed, so nothing is reproducible. There is also no
`~/.config/ghostty/config`, although cmux reads it for terminal look.

**Backup (already done).** `cp ~/.config/cmux/cmux.json ~/.config/cmux/cmux.json.$(date +%s).bak`

**Edit `~/.config/cmux/cmux.json`** — uncomment / add a small high-value set:

```jsonc
"terminal": {
  "autoResumeAgentSessions": true
},
"automation": {
  "suppressSubagentNotifications": true
}
```

`suppressSubagentNotifications` matters here: the oh-my-opencode-slim plugin
spawns many background subagents, and each can otherwise raise a cmux
notification.

**Create `~/.config/ghostty/config`** for terminal appearance (cmux delegates
font/theme/opacity/blur to Ghostty), e.g.:

```
font-family = JetBrains Mono
font-size = 13
theme = ayu-dark
background-opacity = 1
```

Adjust to taste; this file did not exist before.

**Verify.**
```
cmux config doctor
cmux reload-config
```
No errors from `doctor`; terminals refresh without an app restart.

---

## 5. Housekeeping (optional)

- Delete stale `*.bak` files in `~/.config/opencode` and commit the config repo
  (`~/.config/opencode` is a git repo; only `oh-my-opencode-slim.json` is
  currently modified).
- If you observe watcher CPU churn in this Bun monorepo, uncomment
  `"node_modules/**"` in `watcher.ignore` in `~/.config/opencode/opencode.jsonc`.
- Permissions: optionally add `git reset --hard*` and `git clean -fdx*` to the
  `ask` list alongside `git push *`. Current denies already cover the
  catastrophic `rm -rf` cases; broad `"*": "allow"` is otherwise fine.

---

## Note: the two project config files (no change recommended)

The repo splits project config between `./opencode.json` (shadcn MCP) and
`./.opencode/opencode.jsonc` (octto plugin; crawlberg and chrome-devtools MCPs).
Both files are loaded and merged — confirmed with `opencode mcp list`, which
reports all 5 servers connected (shadcn, crawlberg, chrome-devtools, context7,
gh_grep). Nothing is ignored.

Consolidating them into one file is purely cosmetic and has no functional
benefit. Recommendation: leave as-is unless you personally prefer a single file.
If you do want one file, move the shadcn entry into `.opencode/opencode.jsonc`
and delete `./opencode.json` (or the reverse) — either works.

---

## Also verified OK (no change needed)

- `preset: synthetic` and all three preset blocks are valid.
- Multiplexer config (`cmux-tui`, `main-vertical`, `main_pane_size: 60`) is valid
  against the plugin schema.
- `simplify` skill grant on `oracle` resolves to the bundled skill.
- `default_agent: "plan"` is valid, but note it starts every session in plan mode
  ("disallows all edit tools") until you switch agents. Intentional if you always
  plan first; otherwise consider `orchestrator`.

## Verification checklist

- [ ] `opencode debug config` shows `disabled_agents: []`, `image_routing: "auto"`,
      and the designer skill grants.
- [ ] `opencode agent list` includes `observer`.
- [ ] opencode-mem log on next session no longer prints `Auto-capture disabled`.
- [ ] `cmux config doctor` clean after edits; `cmux reload-config` applied.
- [ ] `opencode debug skill` still resolves every skill name you granted.
