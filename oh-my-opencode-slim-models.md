# oh-my-opencode-slim: model presets and rationale

Preset rationale for `~/.config/opencode/oh-my-opencode-slim.json`. The active
preset is `opencode-perform`, which extends the base `opencode-go` preset; the
`openrouter` and `openrouter-no-floor` presets are documented below as alternates.

Run `/suggest-models <preset>` (or `bun ~/.config/opencode/model-table.ts --validate <preset>`) for
the live table with current models.dev pricing, availability, and a single-provider check.
`/preset <name>` applies a preset to the session.

## Design brief

Match models to agents per provider. Preference: a **balance leaning cheap**
rather than performant. Cost concentrates where a cheap model actually costs
quality; volume lanes stay on the cheapest capable model.

## Agent characteristics

As of oh-my-opencode-slim 3.0.5 the `librarian` agent was merged into
`explorer`; `librarian` survives only as a config alias for `explorer`, so
codebase recon and external docs research are now a single lane.

| Agent | Job | Cost sensitivity | Needs |
| --- | --- | --- | --- |
| orchestrator | Plans, schedules background specialists, reconciles, verifies | High — drives every turn | Strong instruction-following + judgment; large context; ideally vision |
| oracle | Architecture, hard debugging, trade-offs, review (read-only) | Low — rare, high-value | Strongest reasoning |
| explorer | Codebase reconnaissance plus external docs / GitHub research (read-only) | High — high volume | Fast, cheap, large context; context7 + gh_grep MCPs |
| designer | UI/UX implementation and visual polish | Medium | UI judgment + frontend codegen; vision |
| fixer | Scoped implementation from a concrete plan | High — high volume | Reliable coding, cheap |
| observer | Reads images/screenshots/PDFs for a non-vision orchestrator | n/a | Vision; disabled by default and configured in no preset |

## The `opencode-go` preset

`opencode-go` is a **subscription**, not token-priced. Quota is granted as a
**separate monthly dollar limit per model**, and consumption is weighted by that
model's price (input / output / cache-read / cache-write). The 5h, weekly and
monthly windows are 20% / 50% / 100% of each model's monthly limit. So the
binding question is not "is this model cheap" but **which model's limit is
exhausted first** — and because agent context is re-sent every turn, the
**cache-read rate** dominates the burn, not the fresh-input rate.

The models.dev rates in the table are **reference only** — they are what these
models cost elsewhere, and they are exactly what the quota weighting uses, so
they are a faithful proxy for relative burn.

Quota windows, as reported by the Console usage API via `/quota_status`:

| Window | Reset | Notes |
| --- | --- | --- |
| 5h | rolling | 20% of each model's monthly limit; throttles first |
| Weekly | Monday 00:00 UTC | 50% of each model's monthly limit |
| Monthly | anchored to the subscription period | 100% of each model's monthly limit; not calendar-aligned |

Limits are ~2x higher on Go Plus ($40/mo) than Go ($10/mo); the relative
ordering below is identical on both.

| Agent | Model | Variant | Reference rate (per M) | Monthly limit (Go / Plus) | Why |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 (cache 0.003) | $80 / $160 | Highest-token lane. Cache read $0.003/M — 20x cheaper than MiniMax-M3's $0.06 — so the repeated-context burn collapses; 1M ctx, vision, `low|high|max` effort. |
| oracle | `opencode-go/qwen3.8-flash` | `xhigh` | 0.15 / 0.47 (cache 0.016) | $30 / $90 | Rare, read-only, hard reasoning. 13x cheaper in/out and 15x cheaper cache read than Qwen3.8-Max, with 2x the limit; keeps the `xhigh` effort scale. |
| explorer | `opencode-go/muse-spark-1.3-contributor` | `low` | 0.10 / 0.20 (cache 0.002) | $80 / $160 | Volume lane — codebase recon plus external docs research. Cheapest model in the catalog on all three rates (2x cheaper input, 3x cheaper output, 1.5x cheaper cache read than DeepSeek-V4.1-Flash). Only cheap-tier model exposing `minimal`, so the effort trim has more room than `low`. Read-only recon is the lane least exposed to Contributor-tier quality risk. **Contributes training data.** |
| designer | `opencode-go/claude-haiku-5-5` | `medium` | 0.10 / 0.50 (cache 0.01) | $60 / $180 | Multimodal UI/UX work. Replaces MiniMax-M3: 3x cheaper input, 2.4x cheaper output, **6x cheaper cache read** ($0.06 → $0.01) — the designer lane was previously the most expensive in the preset on the rate that actually governs burn. `medium` keeps effort above `low` for UI judgment; escalate to `high` if polish suffers. |
| fixer | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 (cache 0.003) | $80 / $160 | Scoped implementation from a concrete plan; same cheap volume profile as explorer. |

Observer is **not configured**: `opencode-go/deepseek-v4.1-flash` declares image
input, so images ride inline and a separate reader would waste quota.

### Why the earlier picks were too expensive

Recorded usage (one week) at reference rates:

| Lane | Old model | Est. $/week | Projected $/mo | Old limit | Verdict |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `minimax-m3` (cache 0.06) | ~10.9 | ~47 | $60 | tight — throttles before month end |
| designer | `kimi-k2.7-code` (cache 0.19) | ~20.6 | ~86 | $60 | over limit |

Cache reads were ~151M (orchestrator) and ~92M (designer) tokens against ~5M
and ~2.4M fresh input respectively — hence the cache-read rate, not the input
rate, drove the spend.

### Contributor models are permitted

Owner decision: models whose names end in `-contributor` may be used anywhere.
`muse-spark-1.3-contributor` trains on this account's traffic, which is an
accepted trade for its 0.002/M cache read. `gemini-4-argon-contributor` is
also available (4.00 / 20.00 — far too expensive to be worth the data trade)
and stays unused.

Muse is currently on **explorer only**. It is deliberately *not* on
orchestrator or fixer: Contributor-tier quality is unvetted for agentic work,
and those two lanes write the plans and the code. Revisit only if explorer
proves stable and a measured need appears.

### Alternates, if the balance needs re-tuning

- Family diversity (avoids three lanes on DeepSeek): orchestrator →
  `glm-5.3-flash @ high` (0.15 / 0.50, cache 0.03; $60/$180). ~$5.4/week, still
  well inside its limit.
- Protect oracle quality: `deepseek-v4-pro @ high` (0.66 / 1.98, cache 0.022;
  $15/$60) — 3x cheaper than Qwen3.8-Max and stronger than Qwen3.8-Flash, but
  keeps the small limit.
- Cheaper designer: `qwen3.8-flash @ medium` (~$1.9/week), or drop Claude
  Haiku to `low` if `medium` is still too rich.
- Cheapest volume floor: `muse-spark-1.3-contributor @ minimal` (0.10 / 0.20,
  cache 0.002) — now live on explorer; `mimo-v2.6-flash` (0.14 / 0.28, cache
  0.0028) is the non-Contributor alternative but declares **no variants**, so it
  loses the effort trim. The free unlimited models
  (`minimax-m3.1-flash-free`, `beam-free`, `longcat-2.5-preview-free`) are
  "limited time" and unvetted for agentic use.
- Output-rate floor for the coding lanes: `claude-haiku-5-5 @ high`
  (0.10 / 0.50, cache 0.01) is 20% cheaper on output than DeepSeek-V4.1-Flash
  at a worse cache rate; worth it only on a lane whose context is re-sent less.
- The other direction — *more* performance while staying on Go — is the
  `opencode-perform` preset documented below.

## The `opencode-perform` preset

Same provider and plan as `opencode-go` (one session, one Go allowance), but the
two lanes that decide results — **orchestrator** and **fixer** — move up a tier,
and the oracle gets the flagship model that the volume lanes cannot afford on
Go. The brief is **more performance, still inside the Go limits**: Go meters a
separate monthly dollar allowance per model, so the governing number is not the
preset's total but whether one model's allowance empties first.

| Agent | Model | Variant | In/Out (per M) | Go limit | Projected $/mo | Why |
| --- | --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/mimo-v2.6-pro` | — (no ladder) | 0.435 / 0.87 (cache 0.003625) | n/a — verify | ~$35 | Pro tier, 1M ctx, vision (image/audio/video) — so images still ride inline. Its cache read ($0.003625) is **1.2× the Flash lane it replaces ($0.003)**, and cache read is ~97% of this lane's token volume, so the whole tier step costs about a third of what `deepseek-v4-pro` would. No effort ladder is declared, so no `variant`. |
| oracle | `opencode-go/deepseek-v4-pro` | `max` | 0.66 / 1.98 (cache 0.022) | $15 | ~$0.9 | Flagship DeepSeek, and the *only* lane that can afford it: the oracle is rare (5 dispatches in the current window), so `max` effort costs ~$0.9/mo — 6% of the small $15 allowance. `high|max` are the only variants this model declares. |
| explorer | `opencode-go/muse-spark-1.3-contributor` | `low` | 0.10 / 0.20 (cache 0.002) | $80 | ~$0.8 | Inherited from `opencode-go` unchanged — this lane is a cost floor, not a quality lane. |
| designer | `opencode-go/claude-haiku-5-5` | `medium` | 0.10 / 0.50 (cache 0.01) | $60 | ~$3.7 | Inherited unchanged — 1M ctx, vision, and the cheapest cache rate of the vision-capable picks. |
| fixer | `opencode-go/mimo-v2.6-pro` | — (no ladder) | 0.435 / 0.87 (cache 0.003625) | n/a — verify | ~$7.3 | The same tier step as the orchestrator; the lane is scoped implementation from a concrete plan, so it wants the same reliability at the same cheap cache read. Text-only would be fine here, but there is no cheaper Pro-tier option. |

`extends: "opencode-go"` in `oh-my-opencode-slim.json` — the plugin resolves it
as parent-first with the child's overrides winning (`resolvePresetDefinition` →
`mergeAgentOverrides`, a deep merge), so an entry that sets only `model` (or
`model` + `variant`) keeps the parent's `skills` and `mcps`. `model-table.ts`
resolves the same chain.

### Why the flagship did not go on the volume lanes

The last-7-day recorded mixes (from `~/.local/share/opencode/opencode.db`,
`session_v2`, grouped by agent) priced at models.dev rates. The orchestrator lane
moved ~11.1M fresh input, 1.8M output and **493.7M cache read**; the fixer 2.5M /
0.5M / 38.3M. Month = ×4.33.

| Model | In/Out/cache-read | Orchestrator $/mo | Fixer $/mo | Oracle $/mo | Go limit |
| --- | --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` (today) | 0.15 / 0.60 / 0.003 | 18 | 4 | — | $80 |
| **`mimo-v2.6-pro`** | 0.435 / 0.87 / 0.003625 | **35** | **7** | 0.3 | verify |
| `mimo-v2.5-pro` | 0.435 / 0.87 / 0.003625 | 35 | 7 | 0.3 | verify (text-only) |
| `gpt-6-luna` | 0.10 / 0.50 / 0.01 | 30 | 4 | 0.3 | verify |
| `claude-haiku-5-5` | 0.10 / 0.50 / 0.01 | 30 | 4 | 0.3 | $60 |
| `minimax-m3.1-flash` | 0.15 / 0.60 / 0.015 | 44 | 6 | 0.4 | verify |
| `qwen3.8-flash` | 0.15 / 0.47 / 0.016 | 45 | 5 | 0.4 | **$30 — over** |
| `glm-5.3-flash` | 0.15 / 0.50 / 0.03 | 75 | 8 | 0.5 | **$60 — over** |
| `deepseek-v4-pro` | 0.66 / 1.98 / 0.022 | **94** | 15 | 0.9 | $15 — orchestrator 6× over |

Read the cache-read column, not the headline price: at a 45:1 cache-to-input
ratio the flagship's $0.022/M cache read is what actually empties an allowance.
`deepseek-v4-pro` on the orchestrator projects ~$94/mo against a $15 Go
allowance; `qwen3.8-flash` and `glm-5.3-flash` also exceed theirs, which is why
the oracle is the only lane the flagship visits. On **Go Plus** ($40/mo, ~2x the
limits) the same table puts `deepseek-v4-pro @ high` on the orchestrator and
`fixer` at ~$94 and ~$15 against $60 allowances — that is the documented upgrade
path if the plan ever moves up: orchestrator and fixer → `deepseek-v4-pro @ high`,
which is exactly the flagship preset this one is the affordable version of.

**Rejected for the orchestrator lane, on the same mix, monthly:** `glm-5.3`
(text-only, ~$658), `qwen3.8-max` (~$677), `kimi-k3.1-pro` (~$602), `kimi-k3`
(~$903), `grok-4.7` (~$1,212, 500k ctx), `step-5-preview` (~$283), `minimax-m3`
(no variant ladder, ~$152), `hy4-preview` (text-only, ~$149), `qwen3.7-plus`
(no variant ladder, ~$117), `deepseek-v4-pro` (text-only *and* ~$94 against a $15
allowance). Everything above `mimo-v2.6-pro`'s $35 costs 2–35× more for the same
lane, and only `longcat-2.0` (~$37) lands in the same bracket — at the cost of
vision, an effort ladder and a second model family.

### The limit check this preset is gated on

`mimo-v2.6-pro`'s Go allowance is **not documented anywhere in this repo** —
the per-model limits in the tables above come from the Console, and the usage API
(`GET https://opencode.ai/zen/go/v1/usage`) reports only the aggregate 5h /
weekly / monthly percentages. Before trusting the preset:

1. Read `mimo-v2.6-pro`'s monthly allowance in the Console, and confirm both
   picks are *enabled* there — the Go Console governs model enablement as well
   as the allowance, and `opencode models` does not distinguish a model that is
   enabled from one that is merely in the catalog. The orchestrator
   lane projects ~$35/mo and the fixer ~$7/mo **on the same model, so they share
   one allowance** (~$43/mo combined).
2. If that allowance is under ~$45/mo, move `fixer` off it in the same edit —
   `opencode-go/glm-5.3-flash @ high` (known $60 allowance, ~$8/mo, vision, and
   the model the `openrouter-no-floor` preset already runs on its fixer lane)
   leaves the orchestrator alone on ~$35/mo.
3. Canary the lane before trusting it. `mimo-v2.6-pro` declares no effort
   ladder, so a degenerate loop would show up as unexpected output tokens — the
   `GLM-5.3-Flash @ low` failure mode, not a cost line item. One short dispatch
   per changed lane; check for non-empty text.

Note the general caveat: recorded dollars are a *relative
meter*, not plan cash — the current monthly window records $13.08 of opencode-go
spend while the Console reports 42% of the allowance used. The preset is sized by
the price vector (cache read 1.2× the lane it replaces) rather than by an exact
dollar promise.

## The `openrouter` preset (all `:floor`)

Same balance as `opencode-go`, but every model uses OpenRouter's
[`:floor` variant](https://openrouter.ai/docs/guides/routing/model-variants/floor)
— price-sorted routing plus flex-tier eligibility, the cheapest provider for the
model. Prices below are the declared `:floor` rates (`:floor` models are **not**
in models.dev, so they are declared in `opencode.jsonc`; OpenCode cannot see a
`:floor` model otherwise).

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `openrouter/deepseek/deepseek-v4.1-flash:floor` | `high` | 0.004 / 0.72 (cache 0.005) | Highest-token lane; 1M ctx, vision, ~1/37th the input cost of the `opencode-go` orchestrator at floor routing. |
| oracle | `openrouter/z-ai/glm-5.3:floor` | `high` | 0.11 / 6.00 | Rare read-only reasoning lane; floor makes GLM-5.3's input cheap enough to afford. |
| explorer | `openrouter/z-ai/glm-5.3-flash:floor` | `low` | 0.15 / 0.50 | High-volume scouting and external docs research; 1M ctx, vision; carries context7 + gh_grep MCPs. |
| designer | `openrouter/minimax/minimax-m3:floor` | `medium` | 0.30 / 1.20 | Mid-cheap designer grade. |
| fixer | `openrouter/z-ai/glm-5.3-flash:floor` | `high` | 0.15 / 0.50 | Scoped implementation; the lane where cheap is safest. |

Observer stays disabled and unconfigured — the orchestrator model is
vision-capable.

### Failover chains

Every openrouter lane is an ordered model chain (entry 1 is primary). Fallback
entries may be plain catalogue IDs — they need no `opencode.jsonc` declaration,
only `:floor` does:

| lane | chain |
| --- | --- |
| orchestrator | `deepseek-v4.1-flash:floor` `high` → `deepseek-v4.1-flash` `high` → `qwen3.8-flash` |
| oracle | `glm-5.3:floor` `high` → `glm-5.3` `high` → `qwen3.8-flash` |
| explorer | `glm-5.3-flash:floor` `low` → `glm-5.3-flash` `low` → `mimo-v2.6-flash` |
| designer | `minimax-m3:floor` `medium` → `minimax-m3` → `qwen3.8-flash` |
| fixer | `glm-5.3-flash:floor` `high` → `glm-5.3-flash` `high` → `deepseek-v4.1-flash` `high` |

The pattern is floor primary → same model plain (identical capability, real price
known) → cheap cross-family model for a model-wide failure. Behaviour comes from
the plugin's foreground-fallback hook: entries advance on transient errors
(429/403/401/410, 5xx/524, queue-full, spent allowance, empty response), not on
quality. Retry budget is top-level `fallback.maxRetries` (default 3) and is shared
across the chain; `fallback.continuationPolicy` defaults to `retry-primary`.

Caveats:

- All entries share the `openrouter` provider ID, so a dead key or spent
  OpenRouter allowance skips the remaining entries. Only a cross-provider entry
  would cover that, and it would break the single-provider rule.
- Set `variant` only where the model declares effort levels. `qwen3.8-flash`,
  `mimo-v2.6-flash`, and `minimax-m3` expose toggle/budget reasoning, so their
  chain entries carry no variant.
- Plain fallback prices (live OpenRouter, per M): DeepSeek 0.30 / 1.20
  (cache 0.006) · GLM-5.3-Flash 0.0052 / 0.1985 (cache 0.0052) · GLM-5.3 0.70 /
  2.20 (cache 0.13) · Qwen3.8-Flash 0.15 / 0.47 (cache 0.016) · MiMo-V2.6-Flash
  0.14 / 0.28 (cache 0.0028). They bill only when a fallback actually runs.
- `model-table.ts` prints the primary only; the chain lives in the JSON.

### OpenRouter gotchas

- **`:floor` must be hand-declared.** It is a routing variant, not a catalogue
  model: it is absent from models.dev *and* from `GET /api/v1/models/{id}`
  (which 404s), yet `POST /chat/completions` with `:floor` works. Declare each
  one under `providers.openrouter.models` in `opencode.jsonc` with `modelID`,
  `name`, `capabilities`, `limit`, and `cost`. A floor model with no declaration
  is invisible to `/suggest-models`.
- Declared models expose `low|medium|high` variants; reasoning `effort` is
  accepted by the floor endpoints at every level.
- The declared `cost` values drive OpenCode's own cost accounting — keep them in
  sync with the real floor price when it changes. A 2026-10-22 check of
  `GET /api/v1/models/{id}/endpoints` found `z-ai/glm-5.3-flash` cheapest at
  0.0052 / 0.1985 (cache 0.0052), far below the declared `:floor` rate, while
  `deepseek/deepseek-v4.1-flash` input is declared below the cheapest standard
  endpoint (0.07). Floor can undercut standard endpoints via its flex tier, but
  a floor declaration *above* the cheapest eligible endpoint means local cost
  accounting is overstating spend — re-check both before trusting preset cost
  comparisons.
- `:floor` picks the cheapest *eligible* provider, so throughput/latency varies
  by request; it is a cost lever, not a quality lever.

## The `openrouter-no-floor` preset

Same provider and pricing as `openrouter`, but every model is a plain catalogue
ID — nothing to hand-declare in `opencode.jsonc`, and prices come from models.dev
instead of the local declarations. The brief is **cheap over performance**, with
large context on the orchestrator and a vision-capable designer.

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `openrouter/z-ai/glm-5.3-flash` | `high` | 0.0052 / 0.1985 (cache 0.0052) | Cheapest model in the catalogue with 1M context *and* vision, and it wins on every recorded lane mix: 29x cheaper input than DeepSeek V4.1 Flash. No context-tier pricing. |
| oracle | `openrouter/deepseek/deepseek-v4-pro` | `high` | 0.4427 / 0.8853 (cache 0.0369) | Flagship MoE for the rare reasoning lane — cheaper than the old `GLM-5.3` pick (0.70 / 2.20 / cache 0.13) while staying a tier above Flash. 1M ctx. |
| explorer | `openrouter/deepseek/deepseek-v4-flash-0731` | `low` | 0.0444 / 0.1333 (cache 0.0014) | Cheapest cache read of any 1M model ($0.0014/M) — the rate that governs recon. A coin flip with GLM-5.3-Flash on today's mix; wins as sessions lengthen. Text-only is fine, the orchestrator reads images. |
| designer | `openrouter/z-ai/glm-5.3-flash` | `high` | 0.0052 / 0.1985 (cache 0.0052) | Vision + 1M ctx at the lowest rate in the catalogue. Image input is the hard requirement here. |
| fixer | `openrouter/z-ai/glm-5.3-flash` | `high` | 0.0052 / 0.1985 (cache 0.0052) | At the 17:1 cache-to-input ratio these lanes run at, GLM is ~2.4x cheaper than `deepseek-v4.1-flash-1017`; DeepSeek only wins past ~590M cache tokens per 6M input. |

Projected on the recorded OpenRouter volumes: **$2.83** versus **$9.83** at the
`openrouter` preset's declared floor rates, and **$4.11** at live
cheapest-endpoint rates (≈31% below the real current cost). All five lanes get
1,049k context; orchestrator, designer, and fixer are vision-capable.

**Excluded despite low headline prices:**

- `qwen/qwen3.7-flash` (0.03 / 0.13) tiers to 0.10 / 0.40 above 32k context and
  0.20 / 0.80 above 256k — agent sessions pass 32k immediately.
- `anthropic/claude-haiku-5.5` (0.10 / 0.50) tiers to 0.50 / 2.50 past 100k.
- `openai/gpt-6-luna` tiers at 272k; `openrouter/free` is 200k ctx with an
  unvetted free router behind it.

**Concentration:** three lanes share `GLM-5.3-Flash`, so a Z.ai regression hits
most of the preset. Cheapest diversification: designer → `xiaomi/mimo-v2.6-flash`
(1.05M, vision, 0.14 / 0.28 / cache 0.0028) or explorer → `z-ai/glm-5.3-flash`
(removes the second family but is marginally cheaper today). If orchestration
judgment suffers, orchestrator → `deepseek-v4.1-flash-1017` (+$0.89 on the
recorded mix). If fixer quality suffers, `deepseek-v4.1-flash-1017 @ high`
(+$1.06). No fallback chains are configured in this preset — add a second entry
per lane if you want cross-family failover.

## Gotchas (variants)

- `variant` must exist for the model:
  - DeepSeek-V4.1-Flash: `none|low|high|xhigh|max`
  - GLM-5.3 / GLM-5.3-Flash / Kimi-K3: `low|high|max`
  - MiniMax-M3 / Nemotron-3-Super / gpt-oss-120b: `low|medium|high`
  - Qwen3.6-27B: `none|low|medium|high`; GLM-4.7-Flash: none listed
- **A valid `variant` is not a working `variant`.** `GLM-5.3-Flash @ low`
  satisfies the schema but produces no content — it degenerates into an
  unbounded `— (stop) — end. — final.` reasoning loop (aborted by the provider
  after burning the full 65,536 output cap) or finishes empty. Verified on
  **three distinct agents** (`explorer`, `designer`, `fixer`), so this is a
  property of the model/variant pair, not of any agent: the same model at `high`
  is fine, and `DeepSeek-V4.1-Flash @ low` is fine. It is invisible in cost
  reports because these models report zero reasoning tokens — the loop shows up
  as `tokens_output`. Canary a cheap Z.ai variant before trusting a lane to it.

## Tooling

- `~/.config/opencode/model-table.ts` — bun script; reads the preset, resolves
  `extends` chains, pulls live prices from models.dev (cached 24h in
  `~/.cache/opencode/models-dev.json`), and falls back to the models declared in
  `opencode.jsonc` for anything models.dev does not know (OpenRouter `:floor`).
  Options: `--preset <name>`, `--all`, `--refresh`, `--json`, and positional
  agent filters.
- `/suggest-models` — global OpenCode command wrapping the script (with `--validate`).

