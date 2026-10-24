# OpenCode v2 setup review — 2026-10-24

Scope: `~/.config/opencode` on OpenCode **v2.1.4**. Every claim below was checked against the
installed artifacts, the live provider APIs, the SQLite history, and upstream repos. Evidence is
inline.

## TL;DR

| # | Finding | Severity | Action |
|---|---|---|---|
| 1a | **opencode-pty tools are dead** — `pty_spawn/write/read/list/kill` stopped registering at the V2 migration. Verified: no `pty_*` tool call since 2026-10-14. | **High** | Pin the wrapper to upstream `main`, or patch the wrapper to register tools. |
| 1b | cmux duplicate-id workaround still required; upstream fix merged but **not released**. | Low | Keep the deny policies; revisit when cmux ships PR #20819. |
| 2a | `opencode-quota` Synthetic **always errors**: Synthetic changed its `/v2/quotas` shape. | **High** | Use CodexBar for Synthetic (or patch, with reduced data). |
| 2b | `vbgate/opencode-mystatus` cannot help — no Synthetic/opencode-go/OpenRouter, plugin-only, stale. | — | Skip it. |
| 2c | Go/Zen/OpenRouter numbers are actually correct; the "incorrectness" is the Synthetic error + a one-row-per-provider projection. | Info | Optional display tweak. |
| 3 | Model-selection knowledge is scattered across 4 files + config comments. | Medium | Fold into one doc + a single `/suggest-models <preset>` command. |
| 4 | Notification mix-up: v2 delivers identical OSC payloads for every session; macOS groups them. | Medium | Tag the payload per session (plugin) or differentiate per launch. |
| 5 | `provider`/`plugin` keys are deprecated in the V2 schema; stray `.bak`; `attention.volume: 1`. | Low | Small cleanups. |

---

## 1. Local "fixes" for cmux and opencode-pty

### 1a. opencode-pty — the fix works, but the tools never register (High)

The local wrapper `plugins/opencode-pty/` loads successfully (no plugin errors in the log), **but it
does not register any tools**. Upstream npm `opencode-pty@0.4.0` (2026-09-18) ships a V2 entry whose
`setup` registers *commands only*:

```js
// dist/src/v2/index.js  (installed 0.4.0)
setup: async (ctx) => {
    const adapter = createV2Adapter();
    installHostAdapter(adapter);
    if (ctx.command && typeof ctx.command.transform === 'function') { ... registerV2Commands ... }
    // (no ctx.tool.transform — registerV2Tools does not exist in 0.4.0)
}
```

`dist/src/v2/tools.js` exports `ptyTools`, but **nothing ever adds them to the host** (`grep -rn
"tool.transform" node_modules/opencode-pty` → no matches). This is upstream issue
[#86](https://github.com/shekohex/opencode-pty/issues/86).

**Verified against your own history:**

```sql
-- last pty_* tool call:
2026-10-10   (3 calls)
-- calls after 2026-10-14 (V2 migration): 0
```

So the pty tools have been absent for ~2 weeks while `AGENTS.md` still advertises them as available.
(The 208 historical `pty_spawn` calls are all V1-era, up to Oct 10.)

Two other npm-0.4.0 defects, for context:
- **#85**: the `opencode-pty/v2` subpath spec is parsed as git shorthand by OpenCode → `NpmInstallFailedError`. *This is why your wrapper exists at all.*
- **#83**: the bare package `.` export lacks a default V2 definition.

Upstream `main` **has the fix** (PR #61) — it calls `ctx.tool.transform((draft) => registerV2Tools(draft))`
— but it was merged a day *after* the 0.4.0 release. PR [#84](https://github.com/shekohex/opencode-pty/pull/84) (dual-mode default export so the bare `opencode-pty` spec loads on V2) is **open, unmerged**.

**Fix options**

1. **Pin the wrapper to upstream `main`** (contains #61 + the exit notifier):
   ```jsonc
   // plugins/opencode-pty/package.json
   { "dependencies": { "opencode-pty": "github:shekohex/opencode-pty#<sha-with-#61>" } }
   ```
   then `bun install` in that dir. Needs a git build (repo is TS), so verify it produces `dist/`.
2. **Patch the wrapper in place** (no network, survives npm updates). Add to
   `plugins/opencode-pty/index.ts` a tool registration that mirrors upstream `registerV2Tools`
   (`draft.add({ name, description, input: tool.schema.toJSONSchema(...), execute })`). ~20 lines.
3. **Wait for 0.4.1** with PR #84, then delete the wrapper and use the bare `"opencode-pty"` spec.

Whichever we pick: fix `AGENTS.md` so it does not promise pty tools until they actually register.

### 1b. cmux — no released fix yet (Low)

`cmux hooks setup` still writes two loose V1-era files that reuse the id of the real V2 package:

```
plugins/cmux-feed.js      id: "cmux.server"
plugins/cmux-session.js   id: "cmux.server"
plugins/cmux/index.js     id: "cmux.server"   <- the real V2 package
```

Three entries sharing one id → `2 plugins failed: cmux.server, cmux.server`. Your deny policies
(`integration.use` on the two loose files) are the correct workaround.

- Installed app: **0.65.2** (2026-10-16). Its embedded `opencode-plugin.js` still has `id: "cmux.server"`.
- Fix **merged** in PR [#20819](https://github.com/manaflow-ai/cmux/pull/20819) (2026-10-15) — it gives the loose files unique ids (`cmux.feed`, `cmux.session`) — but it sits under `## Unreleased`; **no tagged release contains it**.

**Action:** keep the denies. When a cmux build ships #20819, re-run `cmux hooks setup`, then delete the
two `plugin:.../cmux-feed.js` / `cmux-session.js` deny entries from `opencode.jsonc`.

---

## 2. Quotas

### 2a. Root cause of the Synthetic "stumble" (High)

Synthetic changed its quota response. Live today:

```http
GET https://api.synthetic.new/v2/quotas   (200)
{
  "subscription":    { "limit": 500, "requests": 0, "renewsAt": "..." },
  "search":          { "hourly": { "limit": 250, "requests": 0, "renewsAt": "..." } },
  "planWeeklyLimit": { "nextRegenAt": "...", "percentRemaining": 99.36, "nextRegenPercent": 2 }
}
```

`opencode-quota` hard-requires the **old** undocumented shape and bails:
`rollingFiveHourLimit` (numeric `max`/`remaining`) and `weeklyTokenLimit` (`maxCredits`/`remainingCredits`
as `"$X.XX"`). Hence:

```
/quota_status → synthetic: live_probe: error
                live_error_1: Synthetic API response missing rollingFiveHourLimit quota window
/quota show   → Synthetic: Synthetic API response missing rollingFiveHourLimit quota window
```

**This is not fixed in 6.0.0-beta.1** — the parser is byte-identical. No released version handles the
current Synthetic response.

### 2b. `opencode-mystatus` is a dead end

- Providers: OpenAI, Zhipu AI, Z.ai, GitHub Copilot, Google Antigravity. **No Synthetic, no opencode-go, no OpenRouter.**
- Type: OpenCode **plugin** (`mystatus` tool + `/mystatus`); **no standalone CLI**.
- Stale: last push 2026-01-20; npm `1.2.4` (2026-01-20); 259★.

### 2c. What `opencode-quota` actually gets right

The numbers are provider-reported and matched the live APIs:

```
opencode-go:  5h 95% left | Weekly 17% left | Monthly (row suppressed)   ← all three computed
opencode zen: Monthly budget 77% left; Current balance USD 44.67
openrouter:   Credits left $13.77                                       ← your local patch
```

So "numbers often incorrect" reduces to: (i) the Synthetic error, (ii) the glance collapsing each
provider to one row, (iii) OpenRouter showing lifetime key spend *before* your patch.

If you want every window in the TUI, the config knob is `formatStyle: "allWindows"` (already the
default) / `tuiSidebarPanel.formatStyle`; `tuiSidebarPanel.opencodeGoPreferredWindow` picks the one-row
window for Go.

### 2d. Recommended alternative: **steipete/CodexBar** (recommended for Synthetic)

A macOS menu-bar app **with a standalone CLI** (`codexbar`) that already covers all your providers and
parses Synthetic defensively.

- Repo: https://github.com/steipete/CodexBar — 22.7k★, MIT, v0.81.0 (2026-10-24), very active.
- Synthetic parser: tries `rollingFiveHourLimit`, `weeklyTokenLimit`, `search.hourly`, **then generic
  fallbacks including `subscription`** — exactly the case that breaks `opencode-quota`.
- Providers include: Synthetic, OpenCode Go, OpenRouter, OpenCode Zen, DeepSeek, z.ai/GLM (+100 more).
- Standalone commands:
  ```bash
  codexbar config set-api-key --provider synthetic --stdin   # printf '%s' "$SYNTHETIC_API_KEY" | ...
  codexbar usage --provider synthetic --format json --pretty
  codexbar usage --provider opencodego --format json --pretty
  codexbar guard  --provider synthetic --window weekly --min-remaining 20 --json   # exit 0/1/69
  codexbar serve  --port 8080        # GET /usage, /cost for a statusline
  ```
- Install: `brew install --cask codexbar`, then app **Preferences → Advanced → Install CLI**.

**Trade-offs / caveats**
- macOS-first (CLI has Linux builds; you're on macOS, fine). One extra tool to install/run.
- No tool anywhere reports opencode-go **per-model monthly dollars** — every implementation collapses Go
  to aggregate 5h/weekly/monthly percentages from the same API. Per-model dollar windows are simply not exposed publicly.

**Suggested wiring (no plugin churn):** add `commands/quota.md` that shells out to CodexBar for the
authoritative cross-provider view, and keep `opencode-quota` for the in-TUI sidebar (it works for
Go/Zen/OpenRouter; patch or ignore Synthetic there).

> Decision needed: **adopt CodexBar as the quota source** (recommended), or **patch `opencode-quota`'s
> Synthetic parser locally** — which is possible but only yields *weekly % + plan request counts*, not a
> 5h token window (the new response does not contain one for this account/plan).

---

## 3. Unify model-selection knowledge → `/suggest-models <preset>`

**Current scatter (same facts in four places):**

| Artifact | Role |
|---|---|
| `oh-my-opencode-slim.json` | presets — the actual assignments (source of truth) |
| `oh-my-opencode-slim-models.md` (~23 KB) | per-agent rationale, per preset |
| `SYNTHETIC-PRICE.md` (~20 KB) | one-off cost investigation for the now-inactive `synthetic` preset |
| `model-table.ts`, `commands/models.md`, `commands/models-doc.md` | two overlapping read-only views |
| `opencode.jsonc` comments + `AGENTS.md` | model/provider notes |

**Proposal**

1. **One source of truth:** `oh-my-opencode-slim.json` (unchanged). Everything else is derived or commentary.
2. **One rationale doc:** fold `SYNTHETIC-PRICE.md` into `oh-my-opencode-slim-models.md` as a "Cost notes /
   history" appendix (or move both under `docs/`) and delete the duplication. Strip model rationale out of
   `opencode.jsonc` comments (keep only plugin/provider wiring notes).
3. **One command:** replace `/models` + `/models-doc` with `/suggest-models <preset>` backed by an enhanced
   `model-table.ts`:
   - resolves the preset (including `extends` chains) and prints the live table (as today);
   - **validates** each model against `opencode models` (available + authed) and flags `:floor` declared models;
   - **enforces single-provider**: warn if a preset mixes providers (all four current presets are already
     single-provider, so "all agents from one provider per session" holds by construction — make it a guard, not a hope);
   - shows **price drift** vs the cached models.dev snapshot;
   - prints the one-line apply hint: `/preset <name>`.
   - optional `--apply` delegates to the built-in `/preset`.
4. **Note:** `oh-my-opencode-slim@3.0.5` **already ships `/preset`** (runtime TUI switch through
   `openPresetManagerV2` / `switchPresetOnDisk`). So `/suggest-models` is the *advisor*; `/preset` is the
   *applier*. Don't rebuild the switching logic.

---

## 4. Two concurrent sessions (cmux + kitty): notification mix-up

**Mechanism (verified against the v2 schema + binary):**

- The switch lives in the **global** `~/.config/opencode/cli.json`:
  `attention: { notifications: true, sound: true, volume: 1, sound_pack: "opencode.default" }`.
  Schema keys: `notifications`, `sound`, `volume`, `sound_pack`, `sounds` (per-event overrides:
  `default|question|permission|error|done|subagent_done`). **There is no `attention.enabled` and no
  per-directory CLI config.**
- The built-in `opencode.notifications` fires on `session.execution.succeeded/failed/interrupted` and
  `permission.asked`, with **title = session title, body = a fixed string ("Session done")**.
- Delivery is **OSC 99 (kitty)** / **OSC 777 (cmux)** on the correct tty — routing is right; the
  **payload is identical**, so macOS Notification Center groups/confuses the two windows.

**Options, cheapest first**

1. **Differentiate per launch** (no code) via the inline env override, which merges over `cli.json`:
   ```bash
   # cmux window — desktop banners
   OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":true,"sound":false}}' opencode
   # kitty window — sound only, no banner
   OPENCODE_CLI_CONFIG_CONTENT='{"attention":{"notifications":false,"sound":true}}' opencode
   ```
2. **macOS System Settings → Notifications**: style kitty and cmux differently so the banner is unambiguous.
3. **cmux notification hooks**: rewrite the subtitle with the workspace/surface name
   (`CMUX_NOTIFICATION_SUBTITLE` / the JSON payload's `surface_id`/`workspace_id`).
4. **Best UX — a tiny TUI plugin** that emits `attention.notify({ title: "[kitty|cmux] <dir> · <session title>", message })`.
   A unique, self-identifying payload defeats Notification Center grouping. (Verify the exact v2 TUI
   attention surface before wiring; `ctx.ui.toast.show` is the confirmed one, `attention.notify` is the
   documented CLI/TUI API.)
5. **Per-event sounds per session** via `attention.sounds` if you prefer ear-based disambiguation.

Also: `volume: 1` is maximum; the schema default is `0.4`.

---

## 5. Other improvements

- **Deprecated config keys.** The V2 schema marks `provider` and `plugin` (singular) **`deprecated: true`**;
  the current keys are `providers` and `plugins`. `opencode.jsonc` has `"provider": { "opencode": {} }`
  (added by opencode-quota). Move it under `providers.opencode` or drop it, and re-check `/quota_status`.
  (You already use `plugins` correctly; `cli.json.plugins` is a *separate, valid* TUI-side list — keep it.)
- **Stray file:** `oh-my-opencode-slim.json.bak` is byte-identical to the live file and gitignored. Delete it.
- **`opencode-history-search`** latest is 1.5.1 (2026-07-19) — still not V2-shaped; leaving it commented is right.
- **`service.json`** holds the live service password; it is already gitignored and mode `600`. Good — keep it that way.
- **`cmux` denies:** keep until the #20819 release (see §1b).
- **AGENTS.md:** update the `Local patches` note to include any new patch (e.g. a Synthetic fix), or state
  that Synthetic is sourced from CodexBar; and correct the pty tool list (§1a).
- **`model-table.ts`** already reads the declared `:floor` models from `opencode.jsonc` — extend it for the
  validation in §3 rather than writing a second script.

---

## Suggested order of work

1. **Fix opencode-pty** (§1a) — it is silently broken and `AGENTS.md` mispromises it.
2. **Decide the quota path** (§2d) — CodexBar vs local Synthetic patch; wire the loser out.
3. **`/suggest-models` unification** (§3) — consolidation, low risk.
4. **Notification disambiguation** (§4) — start with option 1, upgrade to the plugin if needed.
5. **Cleanups** (§5).

---

## Outcome (2026-10-24)

Applied after the Plannotator review:

- **opencode-pty fixed.** `plugins/opencode-pty/index.ts` now registers the five tools via
  `ctx.tool.transform`. Verified live: `pty_spawn` → `pty_read` → `pty_kill` → `pty_list`, and the
  tools are back in the agent's catalog (`tsc --noEmit` clean).
- **RESOURCES.md created**; the external-tool links in `README.md` now point there. The CodexBar
  recommendation lives in `RESOURCES.md` (§Quota / usage tools).
- **Quota:** `@slkiser/opencode-quota` kept as-is; the Synthetic error is accepted, not patched.
- **Models unified.** `/suggest-models <preset>` added (`commands/suggest-models.md` +
  `model-table.ts --validate`: availability, single-provider check, apply hint). The custom
  `commands/models.md` was removed so the built-in `/models` is not shadowed; `/models-doc` kept.
  `SYNTHETIC-PRICE.md` folded into `oh-my-opencode-slim-models.md` as the cost-notes appendix.
- **Notifications:** the per-launch `OPENCODE_CLI_CONFIG_CONTENT` recipe is documented in
  `README.md` (§notifications).
- **Cleanups:** `oh-my-opencode-slim.json.bak` and `SYNTHETIC-PRICE.md` deleted; `attention.volume`
  lowered to 0.4.

Corrected during implementation: the review suggested moving `provider.opencode` to `providers`, but
`@slkiser/opencode-quota` itself writes the legacy `provider` key (`["provider", providerId]`) and
would rewrite it, so the key stays — only the comment was clarified.

Still open (waiting on upstream): the cmux deny policies (until the #20819 release) and the
opencode-pty wrapper (until a 0.4.1+ with PR #84). No self-identifying notification plugin written yet.
