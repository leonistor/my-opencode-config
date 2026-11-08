# oh-my-opencode-slim: model presets and rationale

Preset rationale for `~/.config/opencode/oh-my-opencode-slim.json`. The active
preset is whatever the `preset` key in that file names (currently `nomoney`) — that
key is authoritative. `openrouter` (all-`:floor`) is the token-priced alternate with the
same balance, `opencode-perform` lifts the orchestrator one tier,
`openrouter-no-floor` is the catalogue-priced variant of the router preset,
`nomoney` is the cheap/mixed one — Go on the plan and designer lanes, OpenRouter
cash on the oracle plus `:floor` and a Mistral tail on the two workhorse lanes —
and `lowmoney` is `nomoney` with the plan lane moved off DeepSeek, so that no lane
bills a peak-doubled clock. `nomoney` and `lowmoney` are the only presets that
deliberately mix providers.

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
| pencil | Wireframes and component skeletons in OpenPencil, filled with real project text (custom agent, `agents.pencil`) | Medium — only while a UI is being shaped | Vision (it reads its own exported PNG) + the `open-pencil` MCP |
| observer | Reads images/screenshots/PDFs for a non-vision orchestrator | n/a | Vision; disabled by default and configured in no preset |

`pencil` names no model of its own: it sets `inheritModelFrom: "orchestrator"`, so it bills
whatever the active preset puts on the orchestrator and `/suggest-models` shows the resolved
model. That is deliberate — a per-preset pin would need four entries kept in sync, and the
agent's cost sits in its OpenPencil tool surface, not in model choice.

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

Quota windows, as reported by the Console usage API:

| Window | Reset | Notes |
| --- | --- | --- |
| 5h | rolling | 20% of each model's monthly limit; throttles first |
| Weekly | Monday 00:00 UTC | 50% of each model's monthly limit |
| Monthly | anchored to the subscription period | 100% of each model's monthly limit; not calendar-aligned |

Limits are ~2x–4x higher on Go Plus ($40/mo) than Go ($10/mo); the relative
ordering below is identical on both. **The account is on Go Plus since 2026-10-27.**
Go Teams is $20/member/month and stays $5 above Go on every model.

Per-model limits below come from the official table at
[`opencode.ai/docs/console/go`](https://opencode.ai/docs/console/go), read
2026-11-07 and listing Go / Go Plus / Go Teams side by side. Treat that table as
the authority: the Console-sourced figures this file carried before that date had
drifted on several models (DeepSeek V4.1 Flash, Claude Haiku 5.5, Muse Spark).

### The live meter does not reconcile with dollars (read this before trusting a projection)

On 2026-10-29, mid-plan (2 days after the upgrade, 3.5 days into the weekly window), the usage API
reported **5h 57%, weekly 63%, monthly 31%** — while the same month's opencode-go token volume
prices out at ~$32 (30-day actual) to ~$56 (last-7-day pace) at the reference rates below. Those
percentages cannot be dollar-weighted against the per-model limits in this file: no lane comes close
to 63% of its weekly allowance on any reading. Either the meter is token/credit-weighted, or the
percentages carried over from the Go plan at the upgrade.

Consequence: **treat the per-model dollar limits as a relative ordering, and the usage API as the
authoritative constraint.** Limits are documented per model now (official table above), but the API
exposes only the aggregate 5h / weekly / monthly percentages — it accepts no `?model=` filter, so one
lane's consumption cannot be read back — and `opencode models` does not distinguish an enabled model
from a catalogued one. The weekly window has been the binding one in practice.

| Agent | Model | Variant | Reference rate (per M) | Monthly limit (Go / Plus) | Why |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 (cache 0.003) | $100 / $200 | Highest-token lane. Cache read $0.003/M — 20x cheaper than MiniMax-M3's $0.06 — so the repeated-context burn collapses; 1M ctx, vision, `low|high|max` effort. Bills **2× in peak windows** (Mon–Fri 01:00–04:00 and 06:00–10:00 UTC), see Gotchas. |
| oracle | `opencode-go/deepseek-v4-pro` | `max` | 0.66 / 1.98 (cache 0.022) | $15 / $60 | Flagship reasoning on the cheapest lane. Measured oracle volume is ~2.8M fresh input and ~27.5M cache read a month, which prices at **~$1.7/mo — 3% of the Plus allowance**. It is the only lane that can afford this model: the same mix on the orchestrator is ~$146/mo, 2.4x the allowance. Replaced `qwen3.8-flash @ xhigh` (0.7/mo) for a strictly better reasoner at a trivial absolute cost. |
| explorer | `opencode-go/muse-spark-1.3-contributor` | `low` | 0.10 / 0.20 (cache 0.002) | $60 / $120 | Volume lane — codebase recon plus external docs research. Cheapest model in the catalog on all three rates (2x cheaper input, 3x cheaper output, 1.5x cheaper cache read than DeepSeek-V4.1-Flash). Only cheap-tier model exposing `minimal`, so the effort trim has more room than `low`. Read-only recon is the lane least exposed to Contributor-tier quality risk. **Contributes training data.** |
| designer | `opencode-go/claude-haiku-5-5` | `medium` | 0.10 / 0.50 (cache 0.01) — **tier above 100k ctx: 0.50 / 2.50 (cache 0.05, write 0.625)** | $15 / $60 | Multimodal UI/UX work. **The "6x cheaper cache read" claim only holds under 100k context**: designer sessions spend most of their life above it, where cache read is $0.05/M — the same as the MiniMax it replaced — and output is $2.50/M. OpenCode's recorded cost confirms the tier (implied ~0.045–0.05/M). Real cost is ~$6–11/mo, i.e. **10–18% of the $60 allowance**, on the smallest limit of the roster. `medium` keeps effort above `low`; escalate to `high` if polish suffers. |
| fixer | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 (cache 0.003) | $100 / $200 | Scoped implementation from a concrete plan; same cheap volume profile as explorer, and the same 2× peak windows. |

Observer is **not configured**: `opencode-go/deepseek-v4.1-flash` declares image
input, so images ride inline and a separate reader would waste quota.

### Why the earlier picks were too expensive

Recorded usage (one week) at reference rates:

| Lane | Old model | Est. $/week | Projected $/mo | Old limit (Go) | Verdict |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `minimax-m3` (cache 0.06) | ~10.9 | ~47 | $60 | tight — throttles before month end |
| designer | `kimi-k2.7-code` (cache 0.19) | ~20.6 | ~86 | $60 | over limit |

Limits are the **Go-plan** figures in force then; the account moved to Go Plus on
2026-10-27, where both models carry $180.

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

- Family diversity against the DeepSeek lanes: orchestrator →
  `mimo-v2.6-pro` (0.435 / 0.87, cache 0.003625; $60 on Plus — ~97% of it at the
  current pace) or `minimax-m3.1-flash @ high` (0.15 / 0.60, cache 0.015; $80 on
  Plus). `glm-5.3-flash` was removed from this list on 2026-11-01 — see "Why
  GLM-5.3-Flash was retired".
- Protect oracle quality: `deepseek-v4-pro @ high` (0.66 / 1.98, cache 0.022;
  $15/$60) — 3x cheaper than Qwen3.8-Max and stronger than Qwen3.8-Flash, but
  keeps the small limit.
- Cheaper designer: `mimo-v2.6-flash` (0.14 / 0.28, cache 0.0028; $120 on Plus —
  live in the `nomoney` preset) or `qwen3.8-flash @ medium` ($90 on Plus), or
  drop Claude Haiku to `low` if `medium` is still too rich.
- Cheapest volume floor: `muse-spark-1.3-contributor @ minimal` (0.10 / 0.20,
  cache 0.002; $120 on Plus) — now live on explorer; `mimo-v2.6-flash` (0.14 /
  0.28, cache 0.0028; $120 on Plus) is the non-Contributor alternative but
  declares **no variants**, so it loses the effort trim. The free unlimited models
  (`minimax-m3.1-flash-free`, `beam-free`, `longcat-2.5-preview-free`) are
  "limited time" and unvetted for agentic use.
- Output-rate floor for the coding lanes: `claude-haiku-5-5 @ high`
  (0.10 / 0.50, cache 0.01) is 20% cheaper on output than DeepSeek-V4.1-Flash
  at a worse cache rate; worth it only on a lane whose context is re-sent less,
  and its Plus allowance is just $60.
- The other direction — *more* performance while staying on Go — is the
  `opencode-perform` preset documented below.

## The `opencode-perform` preset

Same provider and plan as `opencode-go`, but **only the orchestrator moves up a
tier** — the lane that writes the plans and decides what runs. The fixer stays on
the Flash lane: it is scoped implementation from a concrete plan, the tier step
buys the least there, and putting it on `mimo-v2.6-pro` too would double the
exposure to that model's $60 allowance (the previous revision did exactly that,
~$93/mo combined).

| Agent | Model | Variant | In/Out (per M) | Plus limit | Projected $/mo | Why |
| --- | --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/mimo-v2.6-pro` | — (no ladder) | 0.435 / 0.87 (cache 0.003625) | **$60** | ~$58 | Pro tier, 1M ctx, vision, `minimal|low|medium|high|xhigh` on the *spark* sibling but **no ladder here**, so no `variant`. Its cache read is 1.2× the Flash lane's, and cache read is ~97% of this lane's token volume — the whole tier step costs about a third of what `deepseek-v4-pro` would ($146/mo, 2.4× its allowance). **~97% of a $60 allowance at the current pace**: see the gate below. |
| oracle | `opencode-go/deepseek-v4-pro` | `max` | 0.66 / 1.98 (cache 0.022) | $60 | ~$1.7 | Inherited from `opencode-go`; no override needed. Rare, read-only reasoning — 3% of its allowance even at `max`. |
| explorer | `opencode-go/muse-spark-1.3-contributor` | `low` | 0.10 / 0.20 (cache 0.002) | $120 | ~$1.3 | Inherited — a cost floor, not a quality lane. |
| designer | `opencode-go/claude-haiku-5-5` | `medium` | tier >100k ctx: 0.50 / 2.50 (cache 0.05) | $60 | ~$6–11 | Inherited; see the tier warning in the `opencode-go` table. |
| fixer | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 (cache 0.003) | $200 | ~$15.6 | Inherited. The cheap volume lane is the right place for scoped implementation. |

Roster total at the measured pace: **~$51/mo** on the last 30 days' volume,
**~$88/mo** at the last week's pace — against **~$33 / ~$57** for `opencode-go`.
The premium is ~$20–32/mo and essentially all of it is one model's allowance.

`extends: "opencode-go"` in `oh-my-opencode-slim.json` — the plugin resolves it
as parent-first with the child's overrides winning (`resolvePresetDefinition` →
`mergeAgentOverrides`, a deep merge), so an entry that sets only `model` (or
`model` + `variant`) keeps the parent's `skills` and `mcps`. `model-table.ts`
resolves the same chain. With one override, the preset is one line; do not
restate the inherited lanes.

### Measured lanes, 2026-10-29

From `~/.local/share/opencode/opencode.db`, `session_message` (the V2 table; the
legacy `message` table stops on 2026-10-10), grouped by agent and priced at
models.dev rates. Volumes per **month**, with the last 7 days ×4.33 in the last
column to show the current burn rate:

| Lane | fresh in | output | cache read | 7-day pace |
| --- | --- | --- | --- | --- |
| orchestrator | 55.8M | 4.0M | 1,648M | 94.7M / 6.1M / **3,226M** |
| fixer | 27.8M | 2.3M | 585M | 60.2M / 4.2M / 1,328M |
| designer | 7.1M | 1.5M | 374M (+4.3M write) | 6.5M / 3.6M / 673M |
| explorer | 8.7M | 0.8M | 63M | 9.7M / 1.0M / 65M |
| oracle | 2.8M | 0.4M | 27.5M | 1.3M / 0.2M / 17M |

Two things follow. The lane is **accelerating**: the last week is ~1.5–1.7× the
30-day average on the top three lanes, so projections from the week are the
conservative reading. And **cache read is still the whole game** at a ~30:1
cache-to-input ratio.

### Why the flagship did not go on the volume lanes

Orchestrator candidates on the 7-day pace (monthly):

| Model | In/Out/cache-read | Orchestrator $/mo | Fixer $/mo | Plus limit |
| --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | 0.15 / 0.60 / 0.003 | **27.5** | **15.6** | $200 |
| **`mimo-v2.6-pro`** | 0.435 / 0.87 / 0.003625 | **58.2** | 34.7 | $60 — 97% |
| `claude-haiku-5-5` (>100k) | 0.50 / 2.50 / 0.05 | 224 | 107 | $60 — 3.7× over |
| `gpt-6-luna` | 0.10 / 0.50 / 0.01 | 44.8 | 21.7 | $60 — 75% (tiers at 272k, same limit) |
| `minimax-m3.1-flash` | 0.15 / 0.60 / 0.015 | 66 | 33 | $80 — 83% |
| `qwen3.8-flash` | 0.15 / 0.47 / 0.016 | 68.7 | 32.7 | $90 — 76% |
| `glm-5.3-flash` | 0.15 / 0.50 / 0.03 | 114 | 51 | $180 — 63% (retired for reliability, 2026-11-01) |
| `deepseek-v4-pro` | 0.66 / 1.98 / 0.022 | **145.6** | 62 | $60 — 2.4× over |

Read the cache-read column, not the headline price. `claude-haiku-5-5` is the
trap: below 100k context it *is* the cheapest vision model, but every long agent
lane pays the 5× tier, which makes it the **most** expensive non-flagship option
on the orchestrator and worse than the Flash lane on the fixer. It stays on the
designer only because that lane's volume is small.

**Rejected for the orchestrator lane, on the same mix, monthly:** `glm-5.3`
(text-only, ~$658), `qwen3.8-max` (~$677), `kimi-k3.1-pro` (~$602), `kimi-k3`
(~$903), `grok-4.7` (~$1,212, 500k ctx), `step-5-preview` (~$283), `minimax-m3`
(no variant ladder, ~$152), `hy4-preview` (text-only, ~$149), `qwen3.7-plus`
(~$117), `space-bunny` (~$115), `deepseek-v4-pro` (text-only *and* 2.4× its
allowance). Everything above `mimo-v2.6-pro` costs 2–20× more for the same lane,
and only `longcat-2.0` (~$55) lands in the same bracket — text-only, with no
effort ladder.

### The limit check this preset is gated on — and the verdict

`mimo-v2.6-pro`'s Go Plus allowance is **$60/month** ($15 on Go; official table,
read 2026-11-07), and the orchestrator projects **~$58/mo** at the current pace
(~$34/mo on the 30-day average). Because the 5h and weekly windows are 20% and
50% of that allowance, the current pace exhausts them within days even though the
monthly window would only just fill. On the 30-day average the lane sits at ~57%
and survives.

So the answer to the gate the previous revision left open is **not "verify and
proceed"**: at the current pace `opencode-perform` as written is a burst preset,
not a daily driver. The documented fallback applies — run the orchestrator on
`deepseek-v4.1-flash @ max` ($200 allowance, ~$35/mo at the current pace) instead
of taking a tier step onto a $60 allowance. `perform` then means *more effort on a
known allowance*.

Canary the lane before trusting it either way: `mimo-v2.6-pro` declares no effort
ladder, so a degenerate loop shows up as unexpected output tokens — the
`GLM-5.3-Flash @ low` failure mode, not a cost line item. One short dispatch;
check for non-empty text.

Note the general caveat: recorded dollars are a *relative* meter, not plan cash,
and on 2026-10-29 they did not reconcile with the meter at all (5h 57% / weekly
63% / monthly 31% while the month's Go volume prices at ~$32–56). See "the live
meter does not reconcile with dollars" above. Size presets by the price vector,
then watch the usage API.

## Why GLM-5.3-Flash was retired (2026-11-01)

`z-ai/glm-5.3-flash` carried `openrouter`'s explorer and fixer lanes and
`openrouter-no-floor`'s orchestrator, designer and fixer. It was removed for
reliability, not price:

1. **The highest-volume lane was the documented broken pair.** `openrouter` →
   explorer ran `glm-5.3-flash:floor @ low` — the exact combination recorded
   under Gotchas (variants): an unbounded `— (stop) — end. — final.` loop, or empty output.
   Measured on `synthetic`, GLM-5.3-Flash `@low` shows 58% errored steps, 21%
   `finish: length` and a 531s median per step. `@high` is healthy; `@low` is not.
2. **`:floor` put it on the fp4 pool.** The model has 40 eligible endpoints and
   the two cheapest (Relace, OpenInference, 0.0103–0.0108/M input) are fp4. The
   fixer lane's recorded failures are that pool: `Upstream error from
   OpenInference: HTTP 429` plus four `Upstream idle timeout exceeded` inside 40
   minutes on 2026-10-25/26. Median step on the floor lane is **9.0s** versus
   **3.6s** on the plain route.
3. **Its price edge vanished.** The 2026-10-22 check recorded 0.0052 / 0.1985;
   live OpenRouter now lists **0.0103 / 0.1702** (cache = input), models.dev
   says 0.0163 / 0.1402 / 0.0163, and 30 days of recorded fixer spend implies
   ~0.0155/M cache — roughly 1.5–3x DeepSeek's floor rate. The old "cheapest
   1M-context model with vision" claim no longer holds.
4. **The replacement is the best-evidenced model in this repo.**
   `deepseek/deepseek-v4.1-flash` recorded **2 errored steps out of 4,968** on
   Go (0.04%) and 0.8% on the OpenRouter floor lane, with 1M context, vision,
   and a `none|low|high|max` ladder whose `@low` is explicitly known to work.

The swap costs about **−$4/mo** in real billing on the active preset (~−$26/mo
against the declared floor rates). Every lane involved is a $2–27/mo line, so
reliability decided it, not the price vector.

## The `nomoney` preset

The **cheap-over-performant** preset, and the only one that **deliberately mixes
providers**: the plan and designer lanes ride the Go subscription on its cheapest
credible models, while the oracle and the two high-volume execution lanes run on
OpenRouter cash — a cross-family reasoner on the oracle, `:floor` routing plus a
**Mistral** tail on the workhorse lanes.

| Agent | Model | Variant | In/Out/cache (per M) | Bills | Why |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/deepseek-v4.1-flash` | `high` | 0.15 / 0.60 / 0.003 | Go ($200) | The plan lane: highest token volume, and cache read is ~97% of it. $0.003/M cache, 1M ctx, vision, proven ladder. `low` is the one-word lever if you want it cheaper still. |
| oracle | `openrouter/z-ai/glm-5.3` | `high` | 0.0699 / 1.40 / 0.0689 | OpenRouter cash | Z.ai's flagship reasoner on the rare, read-only lane: 1M ctx, a `high` ladder already proven in the `openrouter` preset, and a *different family* from the DeepSeek orchestrator. On the measured oracle mix it costs ~$2.65/mo against $3.15–3.21 for either deepseek-v4-pro lane, and it frees the $60 V4 Pro Go allowance. Was `opencode-go/deepseek-v4-pro`. `high`, never `low` — GLM `@low` is the setting that degenerated on GLM-5.3-Flash. |
| explorer | `openrouter/deepseek/deepseek-v4.1-flash:floor` → plain → `mistral/mistral-small-2603` | `low` / `low` / `none` | 0.004 / 0.72 / 0.005 · 0.051 / 0.567 / 0.018 · 0.15 / 0.60 / 0.015 | OpenRouter cash | High-volume recon moved off the subscription. Floor input is ~1/37th the Go rate; at the 25:1 cache-to-input ratio the $0.0054 cache rate still decides, and it is the cheapest lane that also carries a working `@low`. |
| designer | `opencode-go/mimo-v2.6-flash` | — (no ladder) | 0.14 / 0.28 / **0.0028** | Go ($120) | Cheapest vision lane in the catalogue: 1.05M ctx, image/audio/video input, and the **lowest cache-read rate of any model here** (Claude Haiku's tiered 0.05 is 18× it). No effort ladder, so it cannot degenerate the way `GLM-5.3-Flash @ low` did. Measured designer burn is ~$2.5/mo — ~2% of its allowance. |
| fixer | `openrouter/deepseek/deepseek-v4.1-flash:floor` → plain → `mistral/mistral-small-2603` | `high` / `high` / `high` | as explorer | OpenRouter cash | Scoped implementation on the same proven profile, at per-token cash instead of Go quota. |

`pencil` inherits the orchestrator (`inheritModelFrom`), so it bills the Go
DeepSeek lane — nothing to pin.

### Failover chains

Same pattern as `openrouter`'s: floor primary → same model on the plain route
(identical capability, real price known) → **a different provider** with a
different family.

| lane | chain |
| --- | --- |
| explorer | `deepseek/deepseek-v4.1-flash:floor` `low` → `deepseek/deepseek-v4.1-flash` `low` → `mistral/mistral-small-2603` `none` |
| fixer | `deepseek/deepseek-v4.1-flash:floor` `high` → `deepseek/deepseek-v4.1-flash` `high` → `mistral/mistral-small-2603` `high` |

The oracle is a **single plain model** (`z-ai/glm-5.3`), not a chain: it is not
`:floor`, so there is nothing to hand-declare, and a rare read-only lane does not
justify the chain machinery the volume lanes need. Add
`→ mistral/mistral-large-4-0` if a provider-level outage on the oracle is worth
covering.

The third entry is what the all-OpenRouter preset cannot do: it covers a spent
OpenRouter allowance or a dead key, not just a transient upstream error. Mistral
Small 4 is also a *different family*, so it survives a model-level regression —
the failure mode that actually retired GLM-5.3-Flash. Its ladder is `none|high`
(no `low`/`medium`), hence `none` on the recon lane and `high` on the fixer.

### Projected cost

At the recorded 30-day lane mix (7-day pace in parentheses), reference rates:

| Lane | Go quota, $/mo | Cash (OpenRouter), $/mo |
| --- | --- | --- |
| orchestrator | $15.7 ($27.5) | — |
| oracle | — | $2.65 ($1.54) |
| designer | $2.5 ($3.8) | — |
| explorer | — | $0.95 ($1.1) |
| fixer | — | $4.9 ($10.4) |
| **total** | **~$18 ($31)**, spread over two models | **~$8.5 ($13)** |

The oracle's cash line is GLM-5.3 at the live catalogue rate (0.0699 / 1.40 /
cache 0.0689) on the measured 2.8M in / 0.4M out / 27.5M cache mix — $2.65/mo,
or $1.54 at the 7-day pace. GLM has **no real cache discount** (cache read ≈
input rate), so the figure holds only while the oracle's cache-to-input ratio
stays near 10:1; a much longer-session oracle would drift toward the input rate.
That is the cost of the cross-family pick: `deepseek-v4-pro` prices at 0.535 /
1.071 / cache 0.0446 now (≈$3.15/mo on the same mix), so GLM is ~17% cheaper and
still a different family.

The Go lanes' monthly limits (Go Plus column of the official table,
`opencode.ai/docs/console/go`) are MiMo-V2.6-Flash **$120** and DeepSeek V4.1
Flash **$200**; DeepSeek V4 Pro's **$60** is no longer touched by this preset.
Note DeepSeek V4.1 Flash bills **2× during
peak windows** (Mon–Fri 01:00–04:00 and 06:00–10:00 UTC — 03:00–06:00 and
08:00–12:00 in Romania on EET; 04:00–07:00 and 09:00–13:00 on EEST), so the
orchestrator's allowance burn roughly doubles for a European working morning; the
limit itself is unchanged. This is what `lowmoney` exists to avoid.

**This is not cheaper in dollars than `opencode-go`.** The subscription is
already paid, so a Go lane costs $0 at the margin while an OpenRouter lane bills
real money. What `nomoney` buys is **~half the Go quota burn** — ~$35/mo of
allowance becomes ~$18/mo at the recorded 30-day mix (roughly $57 → $31 at the
current pace), and the burn moves from four models onto two — for ~$8.5–13/mo of
cash. That buys headroom on the weekly window and a workhorse lane that keeps
running when the OpenRouter allowance runs out. If the Go weekly window never
bothers you, `opencode-go` remains the cash-cheapest preset; `nomoney` is the one
that stops a long week from becoming a throttle.

Mistral bills only when a chain actually fails over, so the cash column is a
ceiling, not a forecast.

### Why it is a flat preset, not `extends: "opencode-go"`

Two mechanical reasons, both in the plugin's agent factory:

1. **An explicit agent-level `variant` always wins over a chain entry's variant**
   (oh-my-opencode-slim's `src/agents/index.ts`: the chain head's inline variant is
   stamped first, then `if (override.variant) agent.config.variant = override.variant`).
   `opencode-go` pins `designer.variant = "medium"`; a deep merge cannot delete it,
   and `mimo-v2.6-flash` declares no ladder, so the inherited value would be
   rejected by the host.
2. The mix *is* the content here. Five explicit lanes keep the provider and the
   variant visible per lane, exactly as `openrouter` is written.

### Levers

- **Cheaper orchestrator:** `deepseek-v4.1-flash @ low` — proven-safe trim.
- **Oracle quality:** `qwen/qwen3.8-max-0902` (2.00 / 6.00 / cache 0.25, ~$14.9/mo
  cash) if GLM-5.3 disappoints on architecture work; or the Go lane
  `opencode-go/deepseek-v4-pro @ high` if you would rather spend $3.2 of the $60
  allowance than $2.65 of cash. `minimax/minimax-m3.1-flash @ max` (~$0.54/mo) is
  the budget extreme — it is the designer's flash tier, so expect a real reasoning
  drop on the lane that exists for hard problems.
- **Designer quality:** `qwen3.8-flash @ medium` (1M ctx, vision, $90 allowance on
  Plus) or `claude-haiku-5-5 @ medium` if UI judgment suffers. Both are Go lanes,
  so neither adds cash; both have *smaller* allowances than MiMo-V2.6-Flash's
  $120.
- **Variant headroom:** `mimo-v2.6-flash` declares no effort ladder at all, so
  there is nothing to trim; the lane is already at its floor.
- **Tail swap:** `mistral/deepseek-v4-1-flash-1017` (0.30 / 1.20, cache 0.007,
  1M ctx, text-only) if the 262k ceiling of Mistral Small 4 is a problem. It is
  the same family as the primary, so it loses the model-level diversification but
  keeps the host-level one.

**Rejected:** the free Go models (`minimax-m3.1-flash-free`, `beam-free`,
`longcat-2.5-preview-free`, `step-5-preview-free`) are "limited time" and
unvetted for agentic work; `qwen/qwen3-coder-30b-a3b-instruct:floor` (0.07 / 0.28)
declares no cache rate, which prices at ~$41/mo on the fixer mix alone;
`ministral-8b-2512` is the cheapest output rate here but an 8B tier with no
reasoning ladder, too weak to be the fixer's last resort.

**Side effect:** `nomoney` is the first preset with **no Contributor model** —
explorer no longer runs `muse-spark-1.3-contributor`, so none of this preset's
traffic is used for training.

## The `lowmoney` preset

`nomoney` with **the plan lane moved off DeepSeek**. Everything else is
byte-identical: oracle `glm-5.3 @ high` on OpenRouter cash, the same `:floor` →
plain → Mistral chains on explorer and fixer, the same `mimo-v2.6-flash` designer.
The one change is that the orchestrator — and therefore `pencil`, which inherits
it — runs `opencode-go/mimo-v2.6-flash`, a model with **no peak row** in the
official Go table.

| Agent | Model | Variant | In/Out/cache (per M) | Bills | Why |
| --- | --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/mimo-v2.6-flash` | — (no ladder) | 0.14 / 0.28 / **0.0028** | Go ($120) | The same model already on the designer lane. Cache read is 7% **below** DeepSeek's off-peak rate and 53% below its peak rate, and there is no 2× window to plan around. 1.05M ctx, vision/audio/video. No effort ladder, so no `variant` — and no `@low`-style degeneration to route around. |
| oracle | `openrouter/z-ai/glm-5.3` | `high` | 0.0699 / 1.40 / 0.0689 | OpenRouter cash | Inherited unchanged. |
| explorer | `deepseek-v4.1-flash:floor` → plain → `mistral-small-2603` | `low` / `low` / `none` | as `nomoney` | OpenRouter cash | Inherited unchanged. |
| designer | `opencode-go/mimo-v2.6-flash` | — | 0.14 / 0.28 / 0.0028 | Go ($120) | Inherited unchanged — and now the same model as the orchestrator. |
| fixer | `deepseek-v4.1-flash:floor` → plain → `mistral-small-2603` | `high` / `high` / `high` | as `nomoney` | OpenRouter cash | Inherited unchanged. |

### What peak actually costs, measured

The claim that this preset is worth having rests on a number, so here it is. From
`~/.local/share/opencode/opencode.db` (`session_message`, the V2 table), last 30
days, agent `orchestrator` across all providers: **41.5M fresh input, 3.43M
output, 1,679M cache read** — and **19.6% / 28.0% / 25.4%** of those three
respectively fell inside the Mon–Fri 01:00–04:00 and 06:00–10:00 UTC windows.

| Orchestrator model | $/mo at that mix | Note |
| --- | --- | --- |
| `deepseek-v4.1-flash`, off-peak rate | 13.33 | 6.23 in · 2.06 out · 5.04 cache |
| `deepseek-v4.1-flash`, with the 2× peak share | **16.41** | 7.45 in · 2.64 out · 6.32 cache — the multiplier is **+$3.08/mo**, 23% of the lane and 1.5% of its $200 allowance |
| `mimo-v2.6-flash` | **11.47** | 5.81 in · 0.96 out · 4.70 cache — −30% vs peak DeepSeek, −14% vs off-peak |

Read that honestly: **the multiplier is small in dollars.** It matters because the
5h window is 20% of a monthly limit and the burn doubles inside it during a
European working morning — not because $3/mo is a budget problem. If the 5h window
never bites, `nomoney` is already fine and this preset is optional.

### Why it is flat, not `extends: "nomoney"`

Mechanically impossible for this swap, for the reason documented under Gotchas: an
agent-level `variant` survives a deep merge, and `nomoney` pins
`orchestrator.variant: "high"`. `mimo-v2.6-flash` declares
`reasoning_options: []`, so the inherited `high` would reach a model with no
ladder and the host would reject it. `nomoney` is flat for the same class of
reason (its designer). That is also why the escape hatch below is not a one-line
override on `lowmoney` — it is a swap of the orchestrator entry plus a `variant`.

### Headroom

Orchestrator ($11.47) + designer (~$2.5) now share **one** $120 allowance —
~12% of it at the recorded mix, so the concentration is comfortable and the 5h
window (20% of $120) is far above a normal morning. The $200 DeepSeek allowance
goes untouched, and the preset still carries **no Contributor model**.

### Levers

- **Escape hatch if planning quality suffers** (the one real risk — a flash model
  with no effort knob on the lane that writes plans):
  `openrouter/deepseek/deepseek-v4.1-flash-1017 @ high` — the same model, a pinned
  snapshot, cash at DeepSeek's off-peak rates ($13.32/mo at the mix above) and **no
  Go peak clock**. Cheapest same-model variant is
  `openrouter/deepseek/deepseek-v4.1-flash:floor @ high` ($11.71/mo), at the cost
  of the fp4 floor pool that retired GLM-5.3-Flash.
- **Effort knob:** there is none on this lane. If `mimo-v2.6-flash` plans too
  thinly, the answer is a different model (above), not a higher `variant`.
- **Canary first.** No effort ladder means a degenerate loop shows up as empty
  output or runaway reasoning tokens, not as a cost line — the GLM-5.3-Flash
  `@low` failure shape. Run one short orchestrator dispatch after switching.
- `pencil` inherits the orchestrator, so it bills MiMo with no separate entry and
  keeps vision, which its wireframe work needs.

**Rejected for this lane:** `muse-spark-1.3-contributor` ($8.19/mo — the cheapest
by a margin, but it trains on traffic and Contributor tier is kept off the lanes
that write plans); `particle-ai/particle-1` ($8.83/mo cash, 1M ctx, vision, full
ladder — released 2026-10-28, closed weights, no reliability record, so it is a
canary candidate rather than a pick); `mimo-v2.6-pro` ($27.12/mo — a 3× input rate
on a $60 allowance, ~45% of it); `minimax-m3.1-flash` ($33.47/mo — 5× the cache
rate on a lane that is 97% cache read); `longcat-2.0` ($26.64/mo and **text-only**,
which would break inline images with no observer configured); `qwen3.8-flash`
($34.70/mo); the free Go and `opencode/*-free` tiers (200k context or "limited
time", too small for this lane's sessions).

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
| explorer | `openrouter/deepseek/deepseek-v4.1-flash:floor` | `low` | 0.004 / 0.72 (cache 0.005) | High-volume scouting and external docs research; 1M ctx, vision, carries context7 + gh_grep MCPs, and its `@low` is a proven-safe effort trim (unlike GLM's). |
| designer | `openrouter/minimax/minimax-m3.1-flash:floor` | `medium` | 0.05 / 0.20 (cache 0.005) | Mid-cheap designer grade. The M3.1 successor is cheaper than M3 on all three rates and carries a `low→max` ladder; floor lands on Tenstorrent (fp8, 1M ctx). |
| fixer | `openrouter/deepseek/deepseek-v4.1-flash:floor` | `high` | 0.004 / 0.72 (cache 0.005) | Scoped implementation; same proven cheap volume profile as explorer, now on the lane where a broken step costs the most. |

Observer stays disabled and unconfigured — the orchestrator model is
vision-capable.

Three lanes share DeepSeek V4.1 Flash. That concentration is deliberate: it is
the only family with both a measured 0% error rate and a working effort ladder
at this price, and every lane's chain ends on a cross-family model (see below).
The oracle remains on Z.ai because GLM-5.3 `@high` is a reasoning model, not the
Flash variant that failed.

### Failover chains

Every openrouter lane is an ordered model chain (entry 1 is primary). Fallback
entries may be plain catalogue IDs — they need no `opencode.jsonc` declaration,
only `:floor` does:

| lane | chain |
| --- | --- |
| orchestrator | `deepseek-v4.1-flash:floor` `high` → `deepseek-v4.1-flash` `high` → `qwen3.8-flash` |
| oracle | `glm-5.3:floor` `high` → `glm-5.3` `high` → `qwen3.8-flash` |
| explorer | `deepseek-v4.1-flash:floor` `low` → `deepseek-v4.1-flash` `low` → `mimo-v2.6-flash` |
| designer | `minimax-m3.1-flash:floor` `medium` → `minimax-m3.1-flash` `medium` → `qwen3.8-flash` |
| fixer | `deepseek-v4.1-flash:floor` `high` → `deepseek-v4.1-flash` `high` → `qwen3.8-flash` |

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
- Set `variant` only where the model declares effort levels. `qwen3.8-flash` and
  `mimo-v2.6-flash` expose toggle/budget reasoning, so their chain entries carry
  no variant (`minimax-m3`, the previous designer pick, did the same);
  `minimax-m3.1-flash` declares `low|medium|high|xhigh|max` and so does carry
  `medium`.
- Plain fallback prices (snapshot 2026-11-01, per M): DeepSeek V4.1 Flash 0.045
  / 0.50 (cache 0.006) · GLM-5.3 0.0699 / 1.40 (cache 0.0689) ·
  MiniMax-M3.1-Flash 0.15 / 0.60 (cache 0.015) · Qwen3.8-Flash 0.15 / 0.47
  (cache 0.016) · MiMo-V2.6-Flash 0.14 / 0.28 (cache 0.0028). They bill only
  when a fallback actually runs. These move — re-read models.dev before trusting
  a comparison older than a few weeks; GLM-5.3-Flash went from 0.0052 / 0.1985
  to 0.0103 / 0.1702 in six weeks.
- `model-table.ts` prints the primary only; the chain lives in the JSON.

### OpenRouter gotchas

- **`:floor` must be hand-declared.** It is a routing variant, not a catalogue
  model: it is absent from models.dev *and* from `GET /api/v1/models/{id}`
  (which 404s), yet `POST /chat/completions` with `:floor` works. Declare each
  one under `providers.openrouter.models` in `opencode.jsonc` with `modelID`,
  `name`, `capabilities`, `limit`, and `cost`. A floor model with no declaration
  is invisible to `/suggest-models`.
- Declared models expose the effort ladder of the model behind them; it is not
  universal. `deepseek-v4.1-flash` goes `none|low|high|max`,
  `minimax-m3.1-flash` `low|medium|high|xhigh|max`, `glm-5.3-flash`
  `low|high|max`, `qwen3.8-flash` and `mimo-v2.6-flash` are toggle-only. The
  host rejects a variant the model does not declare.
- The declared `cost` values drive OpenCode's own cost accounting — keep them in
  sync with the real floor price when it changes. A 2026-11-01 check of
  `GET /api/v1/models/{id}/endpoints` found `minimax-m3.1-flash` cheapest at
  0.05 / 0.20 (cache 0.005) on Tenstorrent (fp8, 1M ctx) — where it is declared —
  while `deepseek/deepseek-v4.1-flash` is declared at 0.004 / 0.72 against a
  cheapest standard endpoint of 0.0085 / 0.5451 (cache 0.006): floor can
  undercut standard endpoints via its flex tier, so a declaration slightly below
  them is expected. `glm-5.3-flash` is the opposite case — declared at
  0.15 / 0.50 / 0.03 against a live 0.0103 / 0.1702, which overstated every
  recorded GLM lane ~1.5x. Re-check both before trusting preset cost
  comparisons.
- `:floor` picks the cheapest *eligible* provider, so throughput/latency varies
  by request; it is a cost lever, not a quality lever, and "cheapest eligible"
  often means the most aggressive quantization from the smallest provider. The
  retired GLM-5.3-Flash lane is the proof: 40 endpoints, the two cheapest fp4,
  and the only upstream failures on the whole preset — `HTTP 429` and four idle
  timeouts in 40 minutes. A flaky floor lane is a routing problem first, a model
  problem second: if a replacement still fails, drop that lane to its plain ID.

## The `openrouter-no-floor` preset

Same provider and pricing as `openrouter`, but every model is a plain catalogue
ID — nothing to hand-declare in `opencode.jsonc`, and prices come from models.dev
instead of the local declarations. The brief is **cheap over performance**, with
large context on the orchestrator and a vision-capable designer.

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `openrouter/deepseek/deepseek-v4.1-flash` | `high` | 0.045 / 0.50 (cache 0.006) | Highest-token lane; 1M ctx, vision, `none|low|high|max`, and the family with the measured 0% error rate. Was `glm-5.3-flash` until 2026-11-01. |
| oracle | `openrouter/deepseek/deepseek-v4-pro` | `high` | 0.535 / 1.071 (cache 0.0446) | Flagship MoE for the rare reasoning lane — a tier above Flash while staying text-cheap on a lane that runs 27M cache tokens a month. 1M ctx. Price corrected 2026-11-07 against `GET /api/v1/models`: the 1.60 / 3.20 / cache 0.135 this table carried was a stale snapshot, ~3x too high. |
| explorer | `openrouter/deepseek/deepseek-v4.1-flash` | `low` | 0.045 / 0.50 (cache 0.006) | Cheapest recon on the per-token mix ($1.17/mo against $2.73 for the previous `v4-flash-0731` pick) and it gains vision. Text-only was never a requirement — the orchestrator reads images. |
| designer | `openrouter/xiaomi/mimo-v2.6-flash` | — (toggle-only) | 0.14 / 0.28 (cache 0.0028) | Vision + 1.05M ctx at the **lowest cache rate in the catalogue** ($0.0028/M), and the one cross-family lane left in the preset. No effort ladder, so no `variant` — that is also why it cannot degenerate the way GLM `@low` did. |
| fixer | `openrouter/deepseek/deepseek-v4.1-flash` | `high` | 0.045 / 0.50 (cache 0.006) | Scoped implementation on the same proven profile as the orchestrator. At the ~25:1 cache-to-input ratio this lane runs at, cache rate decides the bill: 0.006 beats MiMo's output rate edge. |

Projected on the 30-day lane mix used throughout this file: **~$27/mo**
(orchestrator 14.40 · oracle 3.15 · explorer 1.17 · designer 2.46 · fixer 5.91).
The oracle line was $9.47 while this table carried the stale V4 Pro snapshot;
the live rate brings the preset down ~$6/mo with no change to the roster.
The previous revision's $2.83 figure is not comparable: it used a smaller
recorded volume set and a GLM-5.3-Flash price that has since doubled. All five
lanes get 1,049k+ context; orchestrator, designer, and fixer are vision-capable.

**Excluded despite low headline prices:**

- `qwen/qwen3.7-flash` (0.03 / 0.13) tiers to 0.10 / 0.40 above 32k context and
  0.20 / 0.80 above 256k — agent sessions pass 32k immediately.
- `anthropic/claude-haiku-5.5` (0.10 / 0.50) tiers to 0.50 / 2.50 past 100k.
- `openai/gpt-6-luna` tiers at 272k; `openrouter/free` is 200k ctx with an
  unvetted free router behind it.

**Concentration:** four of the five lanes are DeepSeek (`v4.1-flash` ×3,
`v4-pro` ×1); only the designer runs a second family. That is the cost of the
2026-11-01 retirement — the replacement for GLM is the model with the measured
reliability record, not the most diverse one. The mitigation is that this preset
carries **no fallback chains**, so add one per lane if you want cross-family
failover; the documented pattern is floor → plain same model → cheap
cross-family (the `openrouter` preset's chains are the template). If
orchestration judgment suffers, orchestrator → `deepseek-v4.1-flash-1017`
(pinned snapshot, +$1.3/mo on this mix). If fixer quality suffers, the same
switch costs +$1.6/mo there. Designer has no DeepSeek fallback by design: vision
is a hard requirement on that lane.

## Gotchas (pricing)

- **Go's peak windows are a second multiplier.** `deepseek-v4.1-flash` and
  `deepseek-v4-pro` bill **2× during peak windows** — Mon–Fri 01:00–04:00 and
  06:00–10:00 UTC, i.e. 03:00–06:00 and 08:00–12:00 in Romania on EET
  (04:00–07:00 and 09:00–13:00 on EEST). The monthly limit
  does not change; the same tokens consume it twice as fast, so a European
  working morning is the expensive half of the day. Every dollar projection in
  this file uses the off-peak (reference) rate, so treat them as a floor. These
  two models are the **only** ones with a peak row in the official table —
  everything else, MiMo included, is flat, which is the lever `lowmoney` pulls.
- **Per-model limits are the authority; the usage API is an aggregate.** The
  official table (`opencode.ai/docs/console/go`) lists the monthly limit for each
  model on each plan; `GET https://opencode.ai/zen/go/v1/usage` returns only
  rolling / weekly / monthly percentages and ignores `?model=`. You cannot read a
  single lane's consumption back, so size lanes by the price vector and watch the
  aggregate.

## Gotchas (variants)

- **Context tiers are a hidden 5× multiplier.** `claude-haiku-5-5` (100k),
  `gpt-6-luna` / `gpt-5.6-luna` (272k), `qwen3.7-plus` (256k), `minimax-m3`
  (512k) and `grok-4.7` (200k) reprice above a context threshold. An agent lane
  passes 100k almost immediately, so the **tier** rate is the one to compare,
  not the models.dev headline. Haiku's cache read goes 0.01 → 0.05 and its
  output 0.50 → 2.50, which is why it is a designer-only pick here.
- `variant` must exist for the model:
  - DeepSeek-V4.1-Flash: `none|low|high|max`
  - MiniMax-M3.1-Flash: `low|medium|high|xhigh|max`;
    MiniMax-M3 / Nemotron-3-Super / gpt-oss-120b: `low|medium|high`
  - GLM-5.3 / GLM-5.3-Flash / Kimi-K3: `low|high|max`
  - Qwen3.6-27B: `none|low|medium|high`; GLM-4.7-Flash: none listed
  - Qwen3.8-Flash and MiMo-V2.6-Flash are toggle-only — set no `variant`
- **A valid `variant` is not a working `variant`.** `GLM-5.3-Flash @ low`
  satisfies the schema but produces no content — it degenerates into an
  unbounded `— (stop) — end. — final.` reasoning loop (aborted by the provider
  after burning the full 65,536 output cap) or finishes empty. Verified on
  **three distinct agents** (`explorer`, `designer`, `fixer`), so this is a
  property of the model/variant pair, not of any agent: the same model at `high`
  is fine, and `DeepSeek-V4.1-Flash @ low` is fine. It is invisible in cost
  reports because these models report zero reasoning tokens — the loop shows up
  as `tokens_output`. This is the failure that got GLM-5.3-Flash retired (see
  above). Canary any new cheap variant before trusting a lane to it.
- **An agent-level `variant` beats a chain entry's, and survives `extends`.**
  The factory stamps the chain head's inline variant first, then applies
  `if (override.variant)` (`src/agents/index.ts`). So a lane that moves to a
  model with no effort ladder cannot inherit a variant from its parent preset —
  a deep merge has nothing to delete it with. That is why `nomoney` is a flat
  preset instead of `extends: "opencode-go"`: the parent's `designer.variant:
  "medium"` would land on `mimo-v2.6-flash`, which declares no ladder.

## Tooling

- `~/.config/opencode/model-table.ts` — bun script; reads the preset, resolves
  `extends` chains, pulls live prices from models.dev (cached 24h in
  `~/.cache/opencode/models-dev.json`), and falls back to the models declared in
  `opencode.jsonc` for anything models.dev does not know (OpenRouter `:floor`).
  Options: `--preset <name>`, `--all`, `--refresh`, `--json`, and positional
  agent filters.
- `/suggest-models` — global OpenCode command wrapping the script (with `--validate`).

