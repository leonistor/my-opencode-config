# oh-my-opencode-slim: model presets and rationale

Preset rationale for `~/.config/opencode/oh-my-opencode-slim.json`. The active
preset is `openrouter-no-floor`; the `opencode-go`, `synthetic`, and `openrouter`
presets are documented below as alternates.

Run `/suggest-models <preset>` (or `bun ~/.config/opencode/model-table.ts --validate <preset>`) for
the live table with current models.dev pricing, availability, and a single-provider check.
`/preset <name>` applies a preset to the session.

The cost investigation that used to live in `SYNTHETIC-PRICE.md` is now the appendix at the end of
this file.

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

Measured cost behaviour, and the reasoning behind the current picks, are in the
[appendix](#appendix-synthetic-cost-notes-2026-10) at the end of this file.

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `high` | 0.60 / 1.20 (cache 0.03) | Highest-token lane and the only one the quality brief defends paying up for. 524k ctx, vision-capable (so no Observer lane needed), cheapest cache read on the provider ($0.03/M), and a second model family if Z.ai regresses. `high` matches the `opencode-go` orchestrator; `xhigh`/`max` are available if judgment suffers. |
| oracle | `synthetic/hf:zai-org/GLM-5.3` | `high` | 1.40 / 4.40 (cache 0.26) | Read-only hard reasoning, and the third pass pays for it: the lane is the preset's designated architecture/debug judge, and Flash-tier reasoning was the weakest link. `GLM-5.3` bills $5.57 on the recorded mix versus $0.76 on `GLM-5.3-Flash` (+$4.81), but the lane is low-volume (169 msgs lifetime), so it is the cheapest quality upgrade available. 524k ctx, `low|high|max`. Revert to `GLM-5.3-Flash` if the review quality does not justify it; `Kimi-K3` is the most capable option at ~15x. |
| explorer | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `low` | 0.60 / 1.20 (cache 0.03) | High-volume scouting and external docs research; 524k ctx + vision; carries context7 + gh_grep MCPs. Reverted from `GLM-5.3-Flash @ low` in the fourth pass — **that combination is broken**: it either degenerates into an unbounded `— (stop) — end. — final.` reasoning loop until the provider aborts, or finishes with zero text. Cost +$1.35 on the lane's recorded mix ($2.69 versus $1.34). Restores a second model family: the preset is now 2 DeepSeek / 3 Z.ai lanes. See the appendix §10. |
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
- `/suggest-models` — global OpenCode command wrapping the script (with `--validate`).

---

## Appendix: Synthetic cost notes (2026-10)

Historical investigation into why the `synthetic` preset felt expensive. Kept as a record; the
`synthetic` preset is currently inactive (see the note at the top of this file).

## Why the `synthetic` preset felt expensive

Investigation into the cost of the `synthetic` preset sessions (Oct 15–21 2026).
Conclusion up front: **the rates never changed and there was no price increase —
synthetic is simply priced higher than the other presets, and the preset was
pointing two lanes at expensive models.**

Sources: `~/.local/share/opencode/opencode.db` (`session_v2`, `session_message`),
the models.dev catalog (`kv:models-dev:catalog`, refreshed 2026-10-21 12:35, and
`~/.cache/opencode/models-dev.json`), and
`~/.cache/opencode/quota-provider-state/synthetic-*.json`.

### 1. No price increase

Every recorded per-message cost on the `synthetic` provider matches today's
models.dev price table **exactly** (0.00% delta) for all 10,222 synthetic
assistant messages from Sep 10 through Oct 21. If a rate had moved, messages
recorded before the move would disagree with the current table.

| day | msgs | recorded | at current rates | delta |
| --- | --- | --- | --- | --- |
| 10-17 | 99 | 0.49 | 0.49 | 0.00% |
| 10-18 | 284 | 1.41 | 1.41 | 0.00% |
| 10-19 | 1061 | 7.46 | 7.46 | 0.00% |
| 10-20 | 194 | 1.06 | 1.06 | 0.00% |
| 10-21 | 549 | 4.67 | 4.67 | 0.00% |

The live catalog differs from the cached one only by an added model
(`hf:deepseek-ai/DeepSeek-V4.1-Flash-1017`) — no `cost` block on any synthetic
model changed.

### 2. Synthetic's rates are higher than the alternatives

Synthetic's per-million rates against the same model on the other providers in
`oh-my-opencode-slim.json`:

| provider / model | input | output | cache read |
| --- | --- | --- | --- |
| `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | **0.60** | **1.20** | **0.03** |
| `opencode-go/deepseek-v4.1-flash` | 0.15 | 0.60 | 0.003 |
| `opencode/deepseek-v4.1-flash` | 0.30 | 1.20 | 0.006 |
| `openrouter/deepseek/deepseek-v4.1-flash:floor` (declared in `opencode.jsonc`) | 0.00405 | 0.72 | 0.0054 |

→ **4× input, 2× output and 10× cache read** versus `opencode-go`.

The same token mix billed on each provider — the single most expensive session in
the recent window (`build`, 2026-10-21 08:36, "Thorough project review and next
phases": 1.24M in / 228k out / 75.5M cache read):

| billed on | cost |
| --- | --- |
| `synthetic` (what was charged) | **$3.281** |
| `opencode-go` | $0.549 |
| `opencode` | $1.098 |
| `openrouter` `:floor` | $0.577 |

### 3. Cache reads are the actual driver

Synthetic lifetime spend of **$101.80** splits as:

| component | cost | share |
| --- | --- | --- |
| cache read | $63.36 | **62.2%** |
| fresh input | $26.48 | 26.0% |
| output (incl. reasoning) | $11.95 | 11.7% |
| cache write | $0.00 | 0.0% |

Agent context is re-sent every turn, so cache reads dominate by volume. At 10×
`opencode-go`'s cache-read rate, that volume is most of the bill. The `opencode-go`
preset was rebalanced on exactly this reasoning (`oh-my-opencode-slim-models.md`,
"The `opencode-go` preset"); the `synthetic` preset never got the equivalent pass
until §8.

### 4. Model and variant choices inflate it further

Spend by model on the synthetic provider:

| model | msgs | cost | share | in | out+reasoning | cache read |
| --- | --- | --- | --- | --- | --- | --- |
| `hf:deepseek-ai/DeepSeek-V4.1-Flash` | 5214 | $38.98 | 38% | 25.88M | 4.64M | 596.07M |
| `hf:moonshotai/Kimi-K3` | 512 | $34.35 | 34% | 2.32M | 0.30M | 50.84M |
| `hf:zai-org/GLM-5.3-Flash` | 4496 | $26.80 | 26% | 25.13M | 2.78M | 541.17M |
| `hf:zai-org/GLM-5.3` | 65 | $1.52 | 1% | 0.11M | 0.11M | 3.38M |
| everything else | 954 | $0.15 | 0% | — | — | — |

**Kimi-K3 is the outlier.** It is 34% of synthetic spend from 5% of the messages,
because it is the most expensive model in the preset by an order of magnitude
($3.00 / $15.00 / $0.45). On the Kimi-K3 token volume actually recorded:

| model | cost for the same tokens |
| --- | --- |
| `synthetic/hf:moonshotai/Kimi-K3` (what was charged) | $34.35 |
| `synthetic/hf:zai-org/GLM-5.3-Flash` | $2.53 |
| `opencode-go/claude-haiku-5-5` | $0.89 |

→ **13.6× cheaper** staying inside the synthetic provider, **38.6× cheaper** on the
model the `opencode-go` preset already uses for this lane.

That is the same conclusion the `opencode-go` preset reached in
`215de81 perf(preset): cut designer and explorer lanes onto cheaper models` — the
designer lane was "the most expensive in the preset on the rate that actually
governs burn". The synthetic preset was never given the same treatment.

**Variant.** The synthetic orchestrator ran at `xhigh` where the `opencode-go`
preset uses `high`. Output is only ~12% of synthetic spend, so this is a modest
lever, not the main one.

**Caveat on variants:** the recorded variant for the *primary* lane
(`build` / `orchestrator`) is `default`, not the configured effort — the plugin
applies variants reliably to subagents (`explorer` recorded `low`, `oracle`
recorded `high`) but the primary lane shows no variant. So the orchestrator
variant change is an alignment, not a measured saving.

### 5. The recent synthetic sessions

Sessions by start time (session-level cost):

```
10-18  build       synthetic deepseek-v4.1-flash   $2.14   (2 sessions)
10-19  orchestrator synthetic deepseek-v4.1-flash  $3.25   (2 sessions; largest $2.42)
10-19  oracle      synthetic GLM-5.3 @ high        $1.48
10-19  build       synthetic deepseek-v4.1-flash   $1.18
10-21  build       synthetic deepseek-v4.1-flash   $3.28
10-21  designer    synthetic Kimi-K3 @ high        $0.56
10-21  domain-review / explorer (6 sessions)       $0.81
```

Lifetime by provider: `synthetic` $101.89 · `opencode-go` $70.83 ·
`openrouter` $61.60 · `opencode` $17.26.

Note that the committed preset switched `synthetic → opencode-go` on Oct 20
09:03, but a running TUI still had the synthetic preset in memory, so the Oct 21
morning sessions were still billed to synthetic.

### 6. Caveat: the list price is a quota meter, not cash

Synthetic is a plan, not pay-as-you-go. The quota plugin's last read of the
provider state (2026-10-21 13:23) reported a **"Synthetic Weekly" window at
`$4/$48`** alongside a request-count window (`0/1000` per 5h).

That $4 does not reconcile with ~$13 of list-price spend across Oct 19–21, so
either the plan discounts, meters only part of the traffic, or the plugin's
window is not the window it claims to be. **The per-token figures in this
document are list-price meters** — faithful for comparing presets against each
other, but not necessarily what is drawn from the plan.

### 7. What changed in the first pass (2026-10-21)

`oh-my-opencode-slim.json`, `synthetic` preset:

| agent | before | after | why |
| --- | --- | --- | --- |
| orchestrator | `hf:deepseek-ai/DeepSeek-V4.1-Flash` @ `xhigh` | same @ `high` | align with the `opencode-go` orchestrator; trims reasoning/output spend |
| designer | `hf:moonshotai/Kimi-K3` @ `high` | `hf:zai-org/GLM-5.3-Flash` @ `high` | 13.6× cheaper on the recorded token mix; still 524k ctx, vision-capable, reasoning-capable, and a family independent of the DeepSeek lanes |
| oracle | `hf:zai-org/GLM-5.3` @ `high` | **unchanged** | no cheap in-provider equivalent of `opencode-go`'s `qwen3.8-flash`. Synthetic's other candidates are worse: `GLM-5.3-Flash` collides with the designer lane, `Kimi-K3` is dearer, `Qwen3.6-27B` has a punitive cache read ($0.45), and a fourth DeepSeek lane loses family diversity. Lifetime oracle spend was $1.52 (1.5%), so paying up on the one lane the preset designates for hard reasoning is defensible |
| explorer | `hf:deepseek-ai/DeepSeek-V4.1-Flash` @ `low` | **unchanged** | DeepSeek has the cheapest cache read on the provider ($0.03/M), which is the rate that governs this high-volume lane |
| fixer | `hf:deepseek-ai/DeepSeek-V4.1-Flash` @ `high` | **unchanged** | same reason |

Lanes that were deliberately *not* moved: the single-provider rule (each preset
draws from one provider so it burns one plan) means the `opencode-go` models that
would be the natural picks here — `claude-haiku-5-5` for designer,
`qwen3.8-flash` for oracle — are out of scope. They are listed below as the
cross-provider alternative if the single-provider rule is ever relaxed.

Superseded in part by §8: `oracle`, `explorer`, and `fixer` moved to
`GLM-5.3-Flash` in the second pass.

### 8. What changed in the second pass (2026-10-22)

After the first pass the preset was already near its floor: `Kimi-K3` was gone,
and the remaining candidates are `DeepSeek-V4.1-Flash` (0.60 / 1.20 / cache
0.03) and `GLM-5.3-Flash` (0.15 / 0.50 / cache 0.04). Comparing list prices
alone is misleading because they disagree on which term dominates. Ignoring
output, DeepSeek is cheaper only when cache reads exceed ~45x fresh input
(0.45i < 0.01c); with output included the crossover moves further in GLM-5.3-
Flash's favour (2.4x cheaper output). The measured mixes sit below that line.

Recorded synthetic tokens for the five preset lanes, priced on each lane's
before/after model:

| lane | fresh in (M) | out (M) | cache read (M) | before | after | delta |
| --- | --- | --- | --- | --- | --- | --- |
| orchestrator | 11.69 | 1.57 | 305.20 | $18.06 | $18.06 | — |
| oracle | 0.92 | 0.22 | 12.72 | $5.55 | $0.76 | **−$4.80** |
| explorer | 2.81 | 0.38 | 18.33 | $2.69 | $1.34 | **−$1.35** |
| designer | 0.69 | 0.11 | 20.07 | $0.96 | $0.96 | — |
| fixer | 5.23 | 1.08 | 120.60 | $8.05 | $6.15 | **−$1.90** |
| **total** | | | | **$35.31** | **$23.96** | **−$11.36 (−32%)** |

The applied change is the quality-balanced subset: `oracle`, `explorer`, and
`fixer` move to `GLM-5.3-Flash`, for **−$8.05 (−23%)** on this window. The
orchestrator stays on DeepSeek deliberately ($3.31 if moved): it is the lane
that plans, delegates, and verifies every turn, and it is the only remaining
non-Z.ai family, so a Z.ai regression degrades specialists rather than the
control loop. Designer was already on `GLM-5.3-Flash`.

Caveats:

- The oracle figure is the largest single saving but is flattered by Kimi-K3-era
  cache tokens in that lane's history. On post-switch oracle volume alone the
  saving is far smaller; treat it as upside.
- The real exposure is concentration: four lanes now share one model. The
  targeted revert is the oracle lane back to `GLM-5.3 @ high` (~+$4.80 on this
  window); a broader revert is `explorer` → `DeepSeek-V4.1-Flash @ low`
  (~+$1.35).
- Everything above is still list-price metering, not plan cash (see §6).

### 9. What changed in the third pass (2026-10-23)

The preset was already at the cost floor after the second pass, so this pass
spends a little to fix the two structural weak spots: one specialist family
across four lanes, and Flash-tier reasoning on the lane designated for hard
reasoning.

`oh-my-opencode-slim.json`, `synthetic` preset:

| agent | before | after | why |
| --- | --- | --- | --- |
| oracle | `hf:zai-org/GLM-5.3-Flash` @ `high` | `hf:zai-org/GLM-5.3` @ `high` | The architecture/debug judge was the weakest link. +$4.81 on the recorded oracle mix, but the lane is low-volume (169 msgs lifetime) so it is the cheapest quality upgrade available. Also breaks the four-lane Flash concentration. |
| designer | `GLM-5.3-Flash` @ `high` | `GLM-5.3-Flash` @ `max` | The lane emits only 0.11M output, so a full effort step is ~$0.03 on the recorded mix. |
| fixer | `GLM-5.3-Flash` @ `high` | `GLM-5.3-Flash` @ `max` | Largest lane and the coding lane; reasoning bills at GLM's $0.50/M output rate, so the step is ~$0.5 on the recorded mix. |
| orchestrator | `DeepSeek-V4.1-Flash` @ `high` | **unchanged** | Still the diversity anchor, vision-capable, cheapest cache read on the provider. `xhigh`/`max` remain the lever if judgment suffers. |
| explorer | `GLM-5.3-Flash` @ `low` | **unchanged** | Cheapest vision + 524k lane. |

Lane costs on the recorded five-lane token mixes (list prices, same method as
§8):

| lane | before | after | delta |
| --- | --- | --- | --- |
| orchestrator | $19.62 | $19.62 | — |
| oracle | $0.76 | $5.57 | **+$4.81** |
| explorer | $1.34 | $1.34 | — |
| designer | $0.96 | $0.99 | +$0.03 |
| fixer | $6.15 | $6.65 | +$0.50 |
| **total** | **$28.83** | **$34.17** | **+$5.34 (+19%)** |

Caveats:

- The oracle figure is the largest single increase and is inflated by Kimi-K3-era
  cache tokens in that lane's history (§8); on steady-state oracle volume the
  delta is smaller. The targeted revert is `GLM-5.3-Flash @ high` (−$4.81) or
  `DeepSeek-V4.1-Flash @ max` (+$0.44 on the recorded mix, for family diversity
  instead of Z.ai quality).
- The `max` effort steps are estimated, not measured: synthetic reports zero
  reasoning tokens for the Z.ai models, so the delta is modelled from GLM's
  output rate rather than read from the token ledger.
- Everything above is still list-price metering, not plan cash (see §6).

### 10. What changed in the fourth pass (2026-10-23)

A correctness fix, not a cost one. The synthetic `explorer` lane was failing
outright, which is why it appeared to ignore pings: it returned no content at
all rather than a wrong answer.

**Root cause:** `synthetic/hf:zai-org/GLM-5.3-Flash` at variant **`low`** is
broken. Two failure modes, same pairing:

- **Degenerate reasoning loop** — the model emits thousands of tokens of
  `— (stop) — end. — final. — emit. — done.` until the provider aborts
  (`finish: error`, `error.type: aborted`, "Step interrupted"). Worst observed:
  196,608 output tokens, 0 text, 7,239s.
- **Empty completion** — `finish: stop` after burning reasoning, with zero text.

**It is the variant, not the agent or the model.** Controlled probes, same
agent and prompt, differing only in model/variant:

| model @ variant | result |
| --- | --- |
| `GLM-5.3-Flash @ high` | replies |
| `GLM-5.3-Flash @ low` | **no response, empty text** |
| `DeepSeek-V4.1-Flash @ low` | replies |
| `GLM-4.7-Flash @ low` | replies |

Ledger corroboration — every synthetic subagent session on the exact pairing:

| model @ variant | sessions | failed/interrupted | empty output |
| --- | --- | --- | --- |
| `GLM-5.3-Flash @ low` | 8 | 6 | 4 |
| `GLM-5.3-Flash @ high/default/max/medium` | 25 | 0 | 0 |
| all other synthetic model/variant pairs | 100+ | 0 | 0 |

`librarian` (now an alias for `explorer`, so *not* independent evidence) failed
on the same pairing too. Agent-independence was established separately in the
fifth pass by probing `designer` and `fixer` on it. Failures begin at commit
`6e88a4a` (second pass), which moved `explorer` onto this model.

`oh-my-opencode-slim.json`, `synthetic` preset:

| lane | before | after |
| --- | --- | --- |
| explorer | `hf:zai-org/GLM-5.3-Flash` @ `low` | `hf:deepseek-ai/DeepSeek-V4.1-Flash` @ `low` |

Cost on the lane's recorded mix (fresh in 2.81M, out 0.38M, cache 18.33M,
list prices):

| lane | before | after | delta |
| --- | --- | --- | --- |
| explorer | $1.34 | $2.69 | **+$1.35** |

Notes:

- The $1.34 "before" figure was never actually earned — those tokens were the
  lane's DeepSeek-era history, re-priced onto GLM. The real before-state was
  near-zero useful output.
- DeepSeek's cache read is the provider's cheapest ($0.03/M versus GLM's
  $0.04/M), which is the rate that governs recon, so the gap narrows as
  sessions lengthen.
- Family split moves from 1 DeepSeek / 4 Z.ai to 2 / 3.
- `high` on the same Z.ai model would also work (~$1.34-class) if the diversity
  argument is outvoted; it is verified by probe but has no real-work history on
  this lane.

### 11. What changed in the fifth pass (2026-10-23)

A cost trim on the two Z.ai volume lanes, requested directly: take `designer`
and `fixer` down to a cheaper variant.

**`low` is not available at any price.** The only step below `max` on
`GLM-5.3-Flash` that works is `high`. The variant ladder is `low|high|max`, and
`low` is the broken pairing recorded in §10 — this pass verified that on the
two target agents specifically, since `librarian` is only an alias of `explorer`
and so was not independent evidence:

| probe (`GLM-5.3-Flash @ low`) | agent | result |
| --- | --- | --- |
| #1 | `designer` | degenerated into the reasoning loop, hit the 65,536 output cap, interrupted |
| #2 | `fixer` | completed with no response, empty text |

Both agents reply normally at `high`. Three distinct agents (`explorer`,
`designer`, `fixer`) now fail on `GLM-5.3-Flash @ low`, which confirms a
model/variant defect rather than anything agent-specific.

`oh-my-opencode-slim.json`, `synthetic` preset:

| lane | before | after |
| --- | --- | --- |
| designer | `GLM-5.3-Flash` @ `max` | `GLM-5.3-Flash` @ `high` |
| fixer | `GLM-5.3-Flash` @ `max` | `GLM-5.3-Flash` @ `high` |

Cost on the recorded five-lane mixes (list prices, same method as §8/§9):

| lane | before (`max`) | after (`high`) | delta |
| --- | --- | --- | --- |
| designer | $0.99 | $0.96 | −$0.03 |
| fixer | $6.65 | $6.15 | −$0.50 |
| **total** | **$7.64** | **$7.11** | **−$0.53** |

Notes:

- The saving is small because it reverses the *third* pass, which had raised
  these lanes from `high` to `max`. That raise was always an estimate: synthetic
  reports zero reasoning tokens for Z.ai models, so the `max` step was modelled
  from GLM's output rate, never measured (§9). This pass removes an unmeasured
  increase rather than exploiting a new one.
- The real reason to stop at `high` is that `low` is broken, not that `high` is
  a sweet spot. If GLM-5.3-Flash ever ships a working `low`, re-test it — that
  is the genuine trim.
- `fixer` is the larger of the two lanes (1.08M out on the recorded mix versus
  designer's 0.11M), so it carries nearly all of the delta.

**Generalisable lesson:** synthetic reports zero reasoning tokens for the Z.ai
models, so a degenerate reasoning loop is invisible in the cost ledger — it
surfaces as `tokens_output` only. Any lane on a cheap Z.ai variant is worth one
canary probe before trusting it.

### 12. Other levers, in order of effect

1. **Context re-reads.** 62% of spend is cache read. Fewer, larger turns;
   `/compact` before long sessions; keep the MCP/tool surface small. Helps on
   every provider, but 10× more on synthetic.
2. **Designer lane** — done in the first pass.
3. **Oracle / explorer / fixer lanes** — done in the second pass (§8).
4. **Oracle quality** — done in the third pass (§9).
5. **Explorer correctness** — done in the fourth pass (§10); broken pairing,
   not a cost decision.
6. **Designer / fixer effort** — trimmed `max` → `high` in the fifth pass (§11);
   the `low` step below it is a broken pairing, so `high` is the floor on
   `GLM-5.3-Flash`.
7. **Orchestrator variant** — aligned to `high`; `xhigh`/`max` is the next
   quality lever (~+$1 on the measured mix) and the cheapest place to spend
   output tokens on this provider.
8. **Orchestrator model** — the last significant cost lever. Moving it to
   `GLM-5.3-Flash @ high` saves ~$3.31 on the measured window but leaves the
   preset single-family and puts Flash-tier judgment on the planning loop.
9. **Cross-provider lanes** — if the single-provider rule is relaxed, point
   designer at `opencode-go/claude-haiku-5-5 @ medium` and oracle at
   `opencode-go/qwen3.8-flash @ xhigh` for another ~2.8× on top of the
   `GLM-5.3-Flash` designer pick.

### 13. Reproducing

```sh
# recorded cost per synthetic message vs current models.dev rates
python3 - <<'PY'
import sqlite3, json, collections
db = sqlite3.connect('/Users/leo/.local/share/opencode/opencode.db')
cat = json.loads(db.execute(
    "SELECT value FROM kv WHERE key='models-dev:catalog'").fetchone()[0])
body = cat['body']
body = json.loads(body) if isinstance(body, str) else body
rows = db.execute(
    "SELECT time_created, data FROM session_message WHERE type='assistant'").fetchall()
agg = collections.defaultdict(lambda: [0, 0.0, 0.0])
for ts, data in rows:
    d = json.loads(data); m = d.get('model') or {}
    if m.get('providerID') != 'synthetic':
        continue
    p = body.get('synthetic', {}).get('models', {}).get(m.get('id'))
    if not p or not p.get('cost'):
        continue
    c, t, cc = p['cost'], d.get('tokens') or {}, (d.get('tokens') or {}).get('cache') or {}
    exp = (t.get('input', 0) * c.get('input', 0)
           + (t.get('output', 0) + t.get('reasoning', 0)) * c.get('output', 0)
           + (cc.get('read', 0) or 0) * (c.get('cache_read') or 0)) / 1e6
    a = agg[ts // 86400000]
    a[0] += 1; a[1] += d.get('cost') or 0; a[2] += exp
for k in sorted(agg):
    n, rec, exp = agg[k]
    print(k, n, round(rec, 2), round(exp, 2))
PY
```

`bun ~/.config/opencode/model-table.ts --preset synthetic` prints the live table
for the current preset.

