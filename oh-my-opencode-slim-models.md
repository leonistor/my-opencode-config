# oh-my-opencode-slim: model presets and rationale

Preset rationale for `~/.config/opencode/oh-my-opencode-slim.json`. The active
preset is `openrouter-no-floor`; the `opencode-go`, `synthetic`, and `openrouter`
presets are documented below as alternates.

Run `/models` (or `bun ~/.config/opencode/model-table.ts --preset synthetic`)
for the live table with current models.dev pricing.

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

## The `synthetic` preset

Measured cost behaviour, and the reasoning behind the current picks, are in
[`SYNTHETIC-PRICE.md`](./SYNTHETIC-PRICE.md).

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `high` | 0.60 / 1.20 (cache 0.03) | Highest-token lane and the only one the quality brief defends paying up for. 524k ctx, vision-capable (so no Observer lane needed), cheapest cache read on the provider ($0.03/M), and a second model family if Z.ai regresses. `high` matches the `opencode-go` orchestrator; `xhigh`/`max` are available if judgment suffers. |
| oracle | `synthetic/hf:zai-org/GLM-5.3` | `high` | 1.40 / 4.40 (cache 0.26) | Read-only hard reasoning, and the third pass pays for it: the lane is the preset's designated architecture/debug judge, and Flash-tier reasoning was the weakest link. `GLM-5.3` bills $5.57 on the recorded mix versus $0.76 on `GLM-5.3-Flash` (+$4.81), but the lane is low-volume (169 msgs lifetime), so it is the cheapest quality upgrade available. 524k ctx, `low|high|max`. Revert to `GLM-5.3-Flash` if the review quality does not justify it; `Kimi-K3` is the most capable option at ~15x. |
| explorer | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `low` | 0.60 / 1.20 (cache 0.03) | High-volume scouting and external docs research; 524k ctx + vision; carries context7 + gh_grep MCPs. Reverted from `GLM-5.3-Flash @ low` in the fourth pass — **that combination is broken**: it either degenerates into an unbounded `— (stop) — end. — final.` reasoning loop until the provider aborts, or finishes with zero text. Cost +$1.35 on the lane's recorded mix ($2.69 versus $1.34). Restores a second model family: the preset is now 2 DeepSeek / 3 Z.ai lanes. See `SYNTHETIC-PRICE.md` §10. |
| designer | `synthetic/hf:zai-org/GLM-5.3-Flash` | `high` | 0.15 / 0.50 (cache 0.04) | Vision-capable UI/UX work. Replaces `Kimi-K3` (3.00 / 15.00 / cache 0.45), which was **34% of all synthetic spend from 5% of the messages**; the same recorded token volume costs $2.53 here instead of $34.35 (13.6x). Still 524k ctx, vision. Backed off `max` → `high` in the fifth pass for cost: the `max` step is estimated, not measured, and this lane emits only ~0.11M output. `low` is **not** usable — see the broken-pairing gotcha below. |
| fixer | `synthetic/hf:zai-org/GLM-5.3-Flash` | `high` | 0.15 / 0.50 (cache 0.04) | Scoped implementation from a concrete plan. $6.15 versus $8.05 on the lane's recorded DeepSeek mix (−24%). Backed off `max` → `high` in the fifth pass; `max` was the third pass's estimate (~$0.5 on the recorded mix) rather than a measurement. `low` is **not** usable — see the broken-pairing gotcha below. |

Observer is **left at its default (disabled)** and is configured in no preset:
the DeepSeek orchestrator is vision-capable, so images ride inline and a
separate reader would be wasted spend.

**Diversity note:** three lanes (`designer`, `fixer`, and the Z.ai oracle)
run Z.ai models and two (`orchestrator`, `explorer`) run DeepSeek — the
fourth pass moved `explorer` back to DeepSeek both to fix a broken
model/variant pairing and to restore a second family. The oracle no longer
shares the Flash model with the volume lanes, and the orchestrator (the lane
that plans, delegates, and verifies) stays on DeepSeek, so a Z.ai regression
degrades specialist output rather than the control loop. The concentration is
now on the *volume* lanes; if it proves too thin again, the cheapest next move
is a `Kimi`/`MiniMax` fixer.

### Why the oracle moved (and what it costs)

The oracle is the preset's designated hard-reasoning lane — architecture calls
and hard debugging — and running it on Flash tier was the weakest link. Synthetic
has no cheap equivalent of `opencode-go`'s `qwen3.8-flash` (0.15 / 0.47, cache
0.016), so the choice is between `GLM-5.3-Flash` and `GLM-5.3`. The recorded
oracle token mix is cache-heavy (12.7M cache read against 0.9M fresh input): at
`GLM-5.3`'s $0.26/M cache rate it bills $5.57, versus $0.76 on `GLM-5.3-Flash`.
The lane is low-volume (169 messages lifetime), so the +$4.81 is small in
absolute terms and is the single most targeted quality lever in the preset.

The remaining objections to the other models still hold:

- `Kimi-K3` (3.00 / 15.00) — dearer than `GLM-5.3` on every rate.
- `Qwen3.6-27B` (0.45 / 3.60, cache 0.45) — worse on output *and* cache read.
- `GLM-4.7-Flash` (0.10 / 0.50, cache 0.10) — cheaper input, but 2.5x the cache
  read, which loses on this lane's mix.

If the oracle does not justify the premium, the two reverts are
`GLM-5.3-Flash @ high` (−$4.81, back to Flash-tier reasoning) or
`DeepSeek-V4.1-Flash @ max` (+$0.44 on the recorded mix — restores a second
family on the judgment lanes and uses the provider's cheapest cache rate, but
puts both the control loop and the hard-reasoning lane on DeepSeek).

### Alternates, if the balance needs re-tuning

- Restore a non-Z.ai voice cheaply: `fixer` → `Kimi-K2.7-Code @ high` (code
  specialist; 262k ctx, no cache discount at $0.95/M). `explorer` already runs
  DeepSeek since the fourth pass.
- **Avoid `GLM-5.3-Flash @ low` entirely** (and check any other cheap variant
  pairing before trusting it): it fails on both this lane and `librarian`, and
  it is a property of the model/variant pair, not of the agent. `high` on the
  same model is fine if Z.ai is wanted here.
- Trim oracle cost: `GLM-5.3-Flash @ high` (0.15 / 0.50, cache 0.04) — −$4.81 on
  the recorded mix, back to Flash-tier reasoning; or `DeepSeek-V4.1-Flash @ max`
  (+$0.44) to buy a second family instead of Z.ai quality. `Kimi-K3 @ high`
  remains the most capable option at ~15x the cost.
- Volume-lane effort: `designer`/`fixer` are at `high` since the fifth pass,
  recovering the third pass's estimated `max` step (~$0.5 on the recorded mix).
  `high` is the floor here — `low` is a broken pairing, not a cheaper option.
  `explorer` is at `low`, which works on DeepSeek.
- More performant orchestrator effort: `DeepSeek-V4.1-Flash @ xhigh` or `max`
  (0.60 / 1.20, cache 0.03) — the control-loop judgment lane, and the cheapest
  place to spend output tokens on this provider; ~+$1 on the recorded mix.
- Cost floor for the volume lanes: `openai/gpt-oss-120b @ low|medium|high`
  ($0.10/$0.10, but 131k ctx, no vision, and a $0.10/M cache read that punishes
  repeated context).
- Explorer floor: `GLM-4.7-Flash` ($0.10/$0.50, cache 0.10, 196k ctx) — the
  cheapest non-vision option, and worse than GLM-5.3-Flash on cache-heavy recon.
- More performant orchestrator: `GLM-5.3 @ high` (1.40 / 4.40, cache 0.26) —
  loses the second family and is ~5.7x dearer on the orchestrator mix.

## The `openrouter` preset (all `:floor`)

Same balance as `synthetic`, but every model uses OpenRouter's
[`:floor` variant](https://openrouter.ai/docs/guides/routing/model-variants/floor)
— price-sorted routing plus flex-tier eligibility, the cheapest provider for the
model. Prices below are the declared `:floor` rates (`:floor` models are **not**
in models.dev, so they are declared in `opencode.jsonc`; OpenCode cannot see a
`:floor` model otherwise).

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `openrouter/deepseek/deepseek-v4.1-flash:floor` | `high` | 0.004 / 0.72 (cache 0.005) | Highest-token lane; 1M ctx, vision, ~1/150th the input cost of the Synthetic orchestrator at floor routing. |
| oracle | `openrouter/z-ai/glm-5.3:floor` | `high` | 0.11 / 6.00 | Rare read-only reasoning lane; floor makes GLM-5.3's input cheap enough to afford. |
| explorer | `openrouter/z-ai/glm-5.3-flash:floor` | `low` | 0.15 / 0.50 | High-volume scouting and external docs research; 1M ctx, vision; carries context7 + gh_grep MCPs. |
| designer | `openrouter/minimax/minimax-m3:floor` | `medium` | 0.30 / 1.20 | Mid-cheap designer grade; matches the Synthetic choice. |
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
  is invisible to `/models`.
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

## The `openrouter-no-floor` preset (active)

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

## Gotchas (Synthetic)
- Use **`hf:` model IDs**, not `syn:` aliases. OpenCode resolves Synthetic via
  models.dev, which only lists the `hf:` names; `synthetic/syn:small:text` is not
  resolvable unless added to `providers.synthetic.models` in `opencode.jsonc`.
- Pinning `hf:` names risks a 404 if Synthetic rotates a model out. The `syn:`
  aliases auto-route, but need the extra provider entry above.
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
  reports because synthetic returns zero reasoning tokens for Z.ai models — the
  loop shows up as `tokens_output`. Canary a cheap Z.ai variant before trusting
  a lane to it.

## Tooling

- `~/.config/opencode/model-table.ts` — bun script; reads the preset, resolves
  `extends` chains, pulls live prices from models.dev (cached 24h in
  `~/.cache/opencode/models-dev.json`), and falls back to the models declared in
  `opencode.jsonc` for anything models.dev does not know (OpenRouter `:floor`).
  Options: `--preset <name>`, `--all`, `--refresh`, `--json`, and positional
  agent filters.
- `/models` — global OpenCode command wrapping the script.
