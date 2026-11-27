# oh-my-opencode-slim: model presets and rationale

Presets for `~/.config/opencode/oh-my-opencode-slim.json`. The active preset is
whatever its `preset` key names — that key is authoritative (currently
`opencode-go`, since 2026-11-26; `openrouter` was active 11-22 → 11-26). Three
presets exist:

- **`opencode-go`** — the subscription lane set and the daily driver since
  2026-11-26. Everything on the Go subscription, balance leaning cheap.
- **`openrouter`** — the all-cash alternative, active 2026-11-22 → 11-26. The
  deepseek lanes are the plain catalogue entry with a model-level
  `provider.order` pin to cheap-cache hosts (since 2026-11-26; the `:floor` was
  retired that day, and the default router was retired as the routing mechanism
  the same day after it billed 1.3–2.7× catalogue). Only the designer's minimax
  floor is left, and the oracle runs Inkling 2 Small.
- **`nomoney`** — Go-quota relief. The plan and designer lanes stay on Go's
  cheapest credible models; the oracle and both volume lanes run on OpenRouter
  cash (plain routing plus Mistral tails). The only preset that deliberately
  mixes providers.

Live prices move — this file records structure and reasoning, not current
rates. Run `/suggest-models <preset>` (or
`bun ~/.config/opencode/model-table.ts --validate <preset>`) for the live table
with models.dev pricing, availability, and a single-provider check. `/preset
<name>` applies a preset to the session. Why retired models were retired lives
in the decision log at the bottom.

## Design brief

Match models to agents per provider. Preference: a **balance leaning cheap**
rather than performant. Cost concentrates where a cheap model actually costs
quality; volume lanes stay on the cheapest capable model.

## Agent characteristics

As of oh-my-opencode-slim 3.0.5 the `librarian` agent was merged into
`explorer`; `librarian` survives only as a config alias.

| Agent | Job | Cost sensitivity | Needs |
| --- | --- | --- | --- |
| orchestrator | Plans, schedules background specialists, reconciles, verifies | High — drives every turn | Strong instruction-following + judgment; large context; ideally vision |
| oracle | Architecture, hard debugging, trade-offs, review (read-only) | Low — rare, high-value | Strongest reasoning |
| explorer | Codebase recon plus external docs / GitHub research (read-only) | High — high volume | Fast, cheap, large context; context7 + gh_grep MCPs |
| designer | UI/UX implementation and visual polish | Medium | UI judgment + frontend codegen; vision |
| fixer | Scoped implementation from a concrete plan | High — high volume | Reliable coding, cheap |
| pencil | Wireframes in OpenPencil (custom agent, `agents.pencil`) | Medium — only while a UI is being shaped | Vision (reads its own exported PNG) + the `open-pencil` MCP. `inheritModelFrom: "orchestrator"`, so it bills the plan lane — no per-preset pin to keep in sync |
| observer | Reads images for a non-vision orchestrator | n/a | Vision; unconfigured in every preset — each orchestrator pick declares image input |

## Measured usage — last 30 days (2026-11-13)

From `~/.local/share/opencode/opencode.db`, `session_message` (the V2 table),
Oct 14 – Nov 13. Cache read dominates every lane at a ~30:1 cache-to-input
ratio — compare cache-read rates, not headline prices.

| Lane | msgs | fresh in | output | cache read | ≈ cost |
| --- | --- | --- | --- | --- | --- |
| orchestrator — ds-v4.1-flash @ high (Go) | 6,489 | 28.8M | 2.4M | 1,177M | ~$9.3/mo + ~$2 peak, of $200 |
| fixer — ds-v4.1-flash @ high (Go) | 2,101 | 4.3M | 0.6M | 129M | ~$1.4/mo of $200 |

Both DeepSeek lanes moved to `max` on 2026-11-17, after this measurement. The
variant does not change the rates; it changes how many reasoning tokens the
lane emits, so expect the output column and the peak multiplier to grow by a
few dollars — not the cache-read term, which is what these rows are for.
| designer — claude-haiku-5-5 @ medium (Go) | 1,261 | — | 0.8M | 203M + 5.5M write | ~$12–15/mo of $60 (see below) |
| explorer — muse-spark-1.3-contributor @ low (Go) | 412 | 2.9M | 0.2M | 11M | ~$0.35/mo of $120 |
| oracle — ds-v4-pro @ max (Go) | 78 | 0.4M | 0.02M | 4.1M | ~$0.42/mo of $60 |
| nomoney OpenRouter lanes (its active week, 11-07…11) | 1,103 | 5.2M | 0.4M | 94M | ≈$1.10 cash for the week |

- **Designer is the highest allowance-stress lane.** The figure is the
  >100k-context tier bound (Haiku reprices above 100k — cache read 0.05,
  output 2.50, cache write 0.625 per M as of 2026-11-07); one heavy day
  (2026-11-12, 237 msgs) ran ≈$3. This corrects the $6–11 this file carried
  before 2026-11-13. Kept on Haiku by owner decision — quality-first; the
  cheap alternative is a documented lever below. The same volume on
  `mimo-v2.6-flash` would price at ≈$1–2/mo.
- **About half the month's recorded volume ran outside preset governance**:
  host `plan`/`build` agents (opencode-zen and manual picks), the
  since-dropped `synthetic` provider era (~0.9B cache-read), and the retired
  GLM-5.3-Flash era (60% of the fixer's month). Preset tuning moves the Go
  allowance, not the whole bill.

## Measured cash spend — week of 2026-11-22 (2026-11-26)

Read from the same table plus `GET /api/v1/key` on the OpenRouter key, which
agree within a dollar (`usage_weekly` $21.03 against $21.9 in the DB). This is
the first week that bills real money on every lane, so it replaces the
subscription-era projections above rather than adding to them. **Decided
2026-11-26, owner pick B, then revised the same day:** the deepseek `:floor`
lanes and their hand declaration were retired (the measurement below convicted
the mechanism), the plain catalogue entry replaced them, and *the default
router was measured and rejected too* — three cold orchestrator canaries billed
2.68× / 1.39× / 1.29× catalogue. The lanes now carry a model-level
`provider.order` pin to cheap-cache hosts: pick B's model half, a deterministic
routing half. See § Floor lanes and the decision log.

| Day | msgs | fresh in | out+reasoning | cache read | cash |
| --- | --- | --- | --- | --- | --- |
| 11-22 | 1,975 | 9.6M | 1.4M | 390M | $0.56 |
| 11-23 | 2,048 | 17.6M | 2.1M | 400M | $8.18 |
| 11-24 | 1,664 | 19.1M | 1.9M | 294M | $6.20 |
| 11-25 | 532 | 5.2M | 0.3M | 86M | $1.86 |
| 11-26 (partial) | 36 | 0.3M | 0.02M | 2M | $0.08 |

Per lane over 11-19…11-26: orchestrator $12.7 (2,961 msgs, 634M cache read),
oracle `glm-5.3` $2.27 (165), fixer $1.83 (512), designer `minimax-m3.1-flash`
$1.67 (363, but **287k cache read per message** — the longest-lived context in
the fleet), explorer $1.09 (429). The account held $17 of credit at 2026-11-26.

- **The preset's own projection is off by an order of magnitude.** The rows
  above assume every lane bills at the rates declared in `opencode.jsonc`.
  Measured as `billed / catalogue` per message — the metric `lane-rates.ts`
  reports since the least-squares fit was retired — the ds floor lane's median
  was **2.89× catalogue on 11-23** and **1.78× on 11-24**, i.e. `wafer/us`'s
  published vector (0.051 / 0.567 / 0.018), not the declared
  0.0498 / 0.1992 / 0.000996. A `:floor` suffix sorts by *prompt* price, so
  under load it parks the lane on Wafer, whose cache-read rate is 18× the
  number in the config. That, not message volume, is where 11-23…11-24's $14.4
  went.
- **The 2026-11-24 `provider.order` pin moved the lane and barely moved the
  bill.** Post-pin (11-25) the fitted vector was **0.2639 / 0.511 / 0.0040**
  (least squares, the tool of that week — see Tooling for its replacement):
  cache read
  down 3.6×, fresh input up 5× — `baidu/fp8` is first in the order and Baidu
  priced prompt at 0.300/M (6× the cheapest endpoint) with 0.006 cache read, so
  the pin traded a cheap term for an expensive one. Per-message cost went
  $0.0040 → $0.0035. All three vectors verified live with `usage.include: true`:
  CoreWeave 0.13/0.59/0.0020, Wafer 0.051/0.567/0.018, Baidu 0.30/1.20/0.006.
  The pin's *mechanism* was right; its list was wrong.
- **The default router was measured next, and it is not the cheap option
  either.** Three fresh orchestrator canaries on the plain ID with the `ignore`
  list active (25k-token first turn, tools) billed **2.68× / 1.39× / 1.29×
  catalogue**, solving to Together/us (0.375/1.5/0.0075), Cohere
  (0.195/0.66/0.003) and Alibaba (0.18/0.72/0.0036). OpenRouter keeps a
  conversation on the provider it picked while its cache is warm, so the first
  endpoint prices the whole session. A fixed `provider.order` of
  river/coreweave/deepinfra-flex/relace/streamlake/novita answered River on
  3/3 raw probes at 0.12–0.15 prompt with 0.002–0.0034 cache read. On the same
  4-day traffic (4,368 messages, 42.8M in, 4.46M out, 791M cache) that is
  **$9.18 against $16.52 billed**; catalogue pricing would have been $11.19,
  Together/us $28.69.
- **What the measured shape says to pin.** At the lane's own 9.7k fresh in /
  162k cache read / 0.55k out per message, a single-endpoint cost is
  `0.0097·in + 0.162·cache + 0.00055·out` per M: `river` 0.12/0.48/0.0024
  → $0.0018, `deepinfra/fp8/flex` 0.112/0.336/0.0034 → $0.0018, `coreweave/fp8`
  0.13/0.59/0.0020 → $0.0019, `wafer/us` → $0.0037, `baidu/fp8` → $0.0045.
  Fresh input is no longer the rounding error it was when cache read was
  $0.001, so a cheap-prompt/expensive-cache host is now the wrong default.
- **The designer floor was paying twice for a number in this file.** Its 365
  rows fit the old declaration to three decimals (0.135/0.54/0.0135 — Wafer
  nvfp4), yet `:floor` on 2026-11-26 probes to **Inferact vLLM at
  0.075/0.30/0.0075**, half that. The reason is the hand-declared
  `limit.output: 512000`: OpenRouter drops any endpoint whose max output cannot
  satisfy the requested `max_tokens`, the host sends `max_tokens` = that limit,
  and Inferact caps at 131072 — so the floor silently fell to the
  *second*-cheapest host on every turn. Probed at the boundary: `max_tokens`
  131072 → Inferact, 131073 → Wafer. Fixed by declaring `output: 131072`
  (the lane's worst-ever message generated 27,820 tokens, so nothing that has
  ever happened gets truncated) and re-declaring its cost at Inferact's rates.
  Same week, same traffic: **$0.93 instead of $1.67**.
- **The subscription lanes are live, and `auth.json` is a decoy.** Zen and Go
  credentials resolve from the DB `credential` table (the active row is the
  `OpenCode Go` integration, re-keyed 06:36 on 2026-11-26); `auth.json` is a
  legacy file untouched since 11-07 that still holds an expired key. A probe
  that read the file and called the endpoint reported `api_key_expired` for a
  lane that works — check `opencode auth list` or the table, not the file. Live
  `GET /zen/go/v1/usage` just after the re-key: rolling 0%, weekly 0%,
  **monthly 98%**, resetting today 06:11.
- **`variant` is recorded as `default` on almost every orchestrator turn.**
  Subagent lanes carry theirs (`fixer high|max`, `explorer low`, `designer
  medium`, `oracle high|max`); the orchestrator carried `high` on 148 of 3,100
  turns. Reasoning tokens per turn differ (706 at `default`, 1,202 at `high`),
  so this is a real effort difference and not just missing metadata. The
  `oh-my-opencode-slim.session-preset.v1/read` RPC that returns HTTP 400 at
  session start is the likely cause; unproven.

## The `opencode-go` preset

`opencode-go` is a **subscription**, not token-priced. Quota is a separate
monthly dollar limit **per model**, weighted by that model's rates. The 5h /
weekly / monthly windows are 20% / 50% / 100% of each model's monthly limit,
and because agent context is re-sent every turn, the **cache-read rate**
dominates the burn. Limits are ~2–4× higher on Go Plus ($40/mo, this account
since 2026-10-27) than Go ($10/mo); the official table at
`opencode.ai/docs/console/go` is the authority. The usage API
(`GET https://opencode.ai/zen/go/v1/usage`) returns only aggregate
5h/weekly/monthly percentages and ignores `?model=` — treat per-model limits
as a relative ordering and the API as the binding constraint; the two have
been known not to reconcile.

| Agent | Model | Variant | Why |
| --- | --- | --- | --- |
| orchestrator | `opencode-go/deepseek-v4.1-flash` | `max` | Highest-token lane; cheapest cache read of any non-Contributor model ($0.003/M as of 2026-11-13), 1M ctx, vision, proven `none\|low\|high\|max` ladder. Bills 2× in Go peak windows (see Gotchas). `max` since 2026-11-17 — same rates, more reasoning on the lane that drives every turn. |
| oracle | `opencode-go/deepseek-v4-pro` | `max` | Flagship reasoning on the cheapest lane. Measured volume is tiny — ~$0.42/mo, nowhere near its allowance. |
| explorer | `opencode-go/muse-spark-1.3-contributor` | `low` | Volume lane. Cheapest model in the catalogue on all three rates; the only cheap-tier model exposing `minimal`. **Contributes training data** — owner-accepted trade. Contributor tier stays off the lanes that write plans and code. |
| designer | `opencode-go/minimax-m3.1-flash` | `medium` | Multimodal UI work. Flat rates (0.15/0.60/0.015), full `low\|medium\|high\|xhigh\|max` ladder, **no context tier**, 1M ctx, $80 allowance — measured 4.1% of the allowance at the designer's own mix. Replaced `claude-haiku-5-5 @ medium` on 2026-11-26; see § Measured Go allowance for why. Haiku stays the polish-critical option if minimax's UI judgment disappoints. |
| fixer | `opencode-go/deepseek-v4.1-flash` | `max` | Scoped implementation from a concrete plan; same cheap volume profile as the orchestrator, same peak windows. `max` since 2026-11-17 — the lane measured ~$1.4/mo, so the extra reasoning is nearly free against its $200 allowance. |

Observer is unconfigured: `deepseek-v4.1-flash` declares image input, so
images ride inline and a separate reader would waste quota.

### Measured Go allowance — billing period 2026-10-26 → 11-26

Priced from `session_message` at Go's own token rates (`GET
/inference/go/v1/models`: per-model prices, context-tier overrides, and the 2×
peak multiplier on the two DeepSeek models). **% allow** is spend ÷ that
model's Go Plus monthly limit, which is how the shared allowance is actually
consumed — a $400-limit model and a $60-limit model do not cost the same per
dollar.

| agent | model | msgs | spend | $/msg | limit | % allow | turns >100k |
| --- | --- | --- | --- | --- | --- | --- | --- |
| designer | `claude-haiku-5-5` @medium | 1,072 | $9.69 | $0.0090 | $60 | **16.1%** | 699 (65%) |
| orchestrator | `deepseek-v4.1-flash` | 10,143 | $22.10 | $0.0022 | $200 | **11.1%** | 7,990 |
| build (host) | `glm-5.3` | 906 | $42.36 | $0.0468 | $400 | 10.6% | 579 |
| fixer (manual) | `kimi-k3.1-pro` | 229 | $7.81 | $0.0341 | $120 | 6.5% | 197 |
| orchestrator (retired) | `gpt-6-luna` @medium | 424 | $3.25 | $0.0077 | $60 | 5.4% | 283 |
| fixer (manual) | `mimo-v2.6-pro` | 466 | $2.48 | $0.0053 | $60 | 4.1% | 287 |
| oracle | `deepseek-v4-pro` @max | 257 | $2.41 | $0.0094 | $60 | 4.0% | 85 |
| fixer | `deepseek-v4.1-flash` | 3,908 | $5.12 | $0.0013 | $200 | 2.6% | 1,588 |
| explorer | `muse-spark-1.3-contributor` @low | 478 | $0.55 | $0.0012 | $120 | 0.5% | 26 |

Reconstructed total: **$108.12 raw, 69.6% of the allowance**. The live meter
read **98%** just before the 06:11 reset, so the reconstruction under-counts by
roughly a third — the same API-vs-table non-reconciliation noted above. Read
the **shares** as reliable and the absolute headroom as smaller than 70%
suggests.

Two findings from the table:

- **The designer was the most expensive lane in the fleet, and the tier was the
  reason.** Flat-rate Haiku at the same volume prices at $2.35 (3.9%);
  65% of its turns crossed 100k, where Go quintuples it to 0.50 / 2.50 / 0.05,
  and the lane became $9.69 (16.1%). Designer cache read averages 154k per
  turn, so the tier was the normal case, not a cliff. This is the whole case
  for the 2026-11-26 swap.
- **The preset is not where the remaining fat is.** Preset-owned lanes sum to
  ~36%; manual picks on host agents (`glm-5.3` on build/plan/pencil,
  `kimi-k3.1-pro` and `mimo-v2.6-pro` on fixer) are **~22%** — more than the
  entire orchestrator lane. `glm-5.3` costs $0.0468/message, 21× the
  orchestrator's, almost all of it cache read at 0.26/M.

No model swap buys more performance on this preset. Repriced at the measured
orchestrator mix (4.6k in / 0.64k out / 189k cache per turn, 10,143 turns):
`muse-spark-1.3` 0.59×, `gpt-6-luna` and `claude-haiku-5-5` 1.63×,
`mimo-v2.6-pro` 1.98×, `longcat-2.5` 2.00×, `minimax-m3.1-flash` 2.38×,
`qwen3.8-flash` 2.44×, `glm-5.3-flash` 4.07×, `deepseek-v4-pro` 5.15× (143% of
its own limit), `glm-5.3` 35.5×. The cheap end of that list is weaker than
`deepseek-v4.1-flash`; the strong end is unaffordable. Context, by contrast, is
cheap: at ds-flash rates cache read is only ~34% of the per-message cost, so
189k → 500k per turn is ~8.3 → 13.1 allowance points for the same turn count.
That is what the 2026-11-26 `compaction.buffer` 70% → 50% change buys.

### Levers

- **Cheaper:** orchestrator `@ high` is the previous default and a proven
  trim; `@ low` is proven-safe too (`deepseek-v4.1-flash @ low` is fine — it
  is GLM that degenerates there). Drop to `high` when the weekly window bites.
- **More performance: there is none in a model swap.** `deepseek-v4.1-flash`
  is already the best capability-per-allowance model for a 1M-context
  high-volume lane; every stronger Go model costs 1.6×–35× more allowance per
  turn at the measured mix, and the only genuine step up (`deepseek-v4-pro`)
  would burn 143% of its own $60 limit on the orchestrator's volume alone
  (§ Measured Go allowance). The lane's `max` is also **not** set by this
  preset — see Gotchas (variants).
- **Designer cost — taken 2026-11-26.** The lane moved to
  `minimax-m3.1-flash @ medium`. It was 16.1% of the whole monthly allowance,
  not because Haiku's headline rates are high but because 65% of its turns ran
  past the 100k context tier where Go quintuples it. Cheaper still:
  `mimo-v2.6-flash` (no ladder, lowest cache-read in the catalogue, $120
  allowance — the `nomoney` designer pick) at 0.7%; `qwen3.8-flash` at 3.7% is
  toggle-only.
- **Explorer cost:** `muse-spark @ minimal` trims further.
- **Family diversity on the plan lane:** `minimax-m3.1-flash @ high` (flat
  rates, no peak row, no context tier, full ladder — the lane `lowmoney` ran
  before its retirement) or `mimo-v2.6-pro` (no ladder, $60 allowance). Both
  are diversity picks, not upgrades: on the measured mix the orchestrator's
  1,177M cache-read/mo costs $3.5 at `ds-v4.1-flash`'s $0.003 but ≈$17.7 at
  minimax's $0.015 (models.dev, 2026-11-17). Cache read decides this lane.

## The `nomoney` preset

Go-quota relief: the plan and designer lanes ride the Go subscription on its
cheapest credible models; the oracle and the two high-volume lanes run on
OpenRouter cash. When the Go weekly window starts to bite, this preset moves
roughly half the allowance burn off the subscription for single-digit cash.

| Agent | Model | Variant | Bills | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `opencode-go/deepseek-v4.1-flash` | `high` | Go ($200) | The plan lane: highest token volume, ~97% cache read, the cheapest Go cache rate. |
| oracle | `openrouter/z-ai/glm-5.3` | `high` | OpenRouter cash | Cross-family reasoner, 1M ctx, `high` proven — never `low` (GLM `@low` is the degenerate pair; see Gotchas). ~$3.85/mo on the measured mix at the 2026-11-13 rates; cheaper at the 2026-11-22 rates (0.07/1.40/0.069). GLM has no real cache discount, so a longer-session oracle drifts toward the input rate. Frees the Go V4 Pro allowance. |
| explorer | `deepseek/deepseek-v4.1-flash` → `mistral/mistral-small-2603` | `low` / `none` | OpenRouter cash | Plain catalogue routing; the model carries a working `@low`, and its cache-read rate ($0.001/M, 2026-11-22) is the cheapest term on the lane. Stayed plain when the `openrouter` lanes restored `:floor` the same day — the rates are equal either way. |
| designer | `opencode-go/mimo-v2.6-flash` | — (no ladder) | Go ($120) | Cheapest vision lane in the catalogue and the lowest cache-read rate of any model here. No ladder, so it cannot degenerate the way GLM `@low` did. The measured designer mix prices at ≈$1–2/mo on it. |
| fixer | `deepseek/deepseek-v4.1-flash` → `mistral/mistral-small-2603` | `high` / `high` | OpenRouter cash | Scoped implementation on the same proven profile, at per-token cash. |

### Failover chains

Plain primary → **a different provider and
family**. The second entry covers a spent OpenRouter allowance or a dead key —
what an all-OpenRouter chain cannot — and survives a model-level regression
(the failure mode that retired GLM-5.3-Flash). Mistral Small 4's ladder is
`none|high`, hence `none` on the recon lane. The oracle is a single plain
model: a rare read-only lane does not justify chain machinery; add
`mistral/mistral-large-4-0` if covering a provider-level outage there ever
matters. The Mistral tails have never fired in 60 days of records — that is
insurance, not dead weight.

### Cost and the flat-preset rule

At the recorded mix: ~$18/mo of Go allowance (orchestrator + designer) plus
~$9–14/mo of OpenRouter cash across the mix-to-pace range. **Not cheaper in
dollars than `opencode-go`** — the subscription is sunk, so a Go lane costs
$0 at the margin. What it buys is ~half the Go quota burn spread over two
models, and workhorse lanes that keep running when the Go weekly window
throttles. If the Go weekly window never bothers you, `opencode-go` remains
the cash-cheapest preset.

Flat, not `extends: "opencode-go"`, for two mechanical reasons (the plugin's
agent factory, `src/agents/index.ts`): an agent-level `variant` always beats
a chain entry's and survives a deep merge — `opencode-go` pins
`designer.variant: "medium"`, which the no-ladder `mimo-v2.6-flash` would
reject. And the provider mix *is* the content: five explicit lanes keep it
visible, exactly as `openrouter` is written.

## The `openrouter` preset (all-cash, active 2026-11-22 → 11-26)

The subscription-independent daily driver: every lane on OpenRouter cash. The
deepseek lanes are the plain catalogue entry with a **model-level
`provider.order` pin** to cheap-cache hosts since 2026-11-26 — pick B's model
half (no `:floor`, no hand cost table, no ladder rebuild) with a deterministic
routing half, because the default router billed 1.3–2.7× catalogue on three
cold canaries (§ Measured cash spend). Only the designer's minimax lane still
carries a `:floor`. Three lanes share `deepseek-v4.1-flash` deliberately — the
only family with a measured ~0% error rate and a working effort ladder at this
price; every chain ends on a cross-family model.

| Agent | Model | Variant | Why |
| --- | --- | --- | --- |
| orchestrator | `deepseek/deepseek-v4.1-flash` | `high` | Highest-token lane; 1M ctx, vision. Plain ID plus the order pin (river → coreweave → deepinfra-flex → relace → streamlake → novita); the provider `ignore` list stays as the fallback net. The first turn is 25k tokens before any cache read, so the prompt price of the first endpoint sets the session's bill. |
| oracle | `thinkingmachines/inkling-2-small` | `high` | Cross-family reasoner, new primary 2026-11-26 (owner pick A). AA Index 30.6 against GLM 5.3's 31.7 — same class, different house — HLE-Diamond 28.7 vs GLM-5.3-Flash's 18.2, ARC-AGI-2 81.7 (best open-weight measured), and the hallucination rate fell 61% → 27% because it declines what it is unsure of, which is the right failure mode for a read-only review lane. 0.30/1.00/0.030 at catalogue; pinned to `primeintellect/flex` 0.075/0.25/0.015 (fp4 and deepinfra fallbacks) because default routing billed it at 1.00× and the first canary after the pin billed the cheap tier at 0.25× catalogue. Weak spot: long terminal sessions (Terminal-Bench 4.0 13.1%). Ladder is minimal…max, so `high` is valid and `none` is not. |
| explorer | `deepseek/deepseek-v4.1-flash` | `low` | Proven `@low` trim; same order pin; cross-family tail on mimo. |
| designer | `minimax/minimax-m3.1-flash:floor` | `medium` | Full ladder; the last floor lane, kept one more week. `:floor` reaches Inferact vLLM at 0.075/0.30/0.0075 as long as `limit.output` stays at 131072; models.dev now reports the plain entry at the same vector and limit, so the floor can be replaced by a partial override once the ratio check has a week of data. |
| fixer | `deepseek/deepseek-v4.1-flash` | `high` | The lane where a broken step costs most; same proven profile and order pin as the orchestrator. |

### Failover chains

| lane | chain |
| --- | --- |
| orchestrator | ds-v4.1-flash `high` → glm-5.3 `high` |
| oracle | inkling-2-small `high` → glm-5.3 `high` |
| explorer | ds-v4.1-flash `low` → mimo-v2.6-flash |
| designer | minimax-m3.1-flash `:floor` `medium` → mimo-v2.6-flash |
| fixer | ds-v4.1-flash `high` → mimo-v2.6-flash |

The tails moved off `qwen3.8-flash` on 2026-11-26: 94 messages produced one
fatal `provider.invalid-output` (Alibaba streamed `finish_reason: tool_calls`
with an empty delta) and its cache-read rate is 0.016 — Wafer-class, the thing
the lane is trying to avoid. GLM is the orchestrator's tail because it answered
203 messages with no errors; mimo is the cheap tail on the two lanes where a
fallback is more likely to be exercised.

Entries advance on transient errors (429/403/401/410, 5xx/524, queue-full,
spent allowance, empty response), not on quality. All entries share the
`openrouter` provider ID, so a dead key or spent allowance skips the rest —
only `nomoney`'s Mistral tails cover that. The cross-family tail is the
reliability net; ds-v4.1-flash is cheap enough (catalogue 0.14/0.42/0.0042) that
the fallback's only job is staying up, not saving money. On the oracle the tail
is the *other* cross-family reasoner, so a bad Inkling week still answers in a
different house style than the volume lanes.

### The counter-argument, kept on the record

The new oracle head was asked to audit this change before it was committed
(`@oracle`, 2026-11-26, 5 messages, no errors). Its strongest point, which is
fair and partly answered by § The counter below rather than dismissed:

- **What it argues was lost:** deleting the pin removed the only mechanism that
  made this lane's dominant cost term *visible*, replacing it with an opaque
  router, on the strength of one pre-pin week and one post-pin day — and a
  re-park on a Wafer-class host is silent until the invoice. It also notes the
  change bundles two unmeasured bets (routing and the Inkling swap), so a
  regression has two suspects.
- **Answer here:** the tripwire it asked for now exists in usable form —
  `lane-rates.ts` reports median and p90 of `billed / catalogue` per lane, which
  separates a Wafer week (2.5–2.9) from a pinned one (1.09) — and the `ignore`
  list is the fallback guard. But it was right about the bundling: the routing
  change and the Inkling swap shipped in the *same* commit (`84f0b52`), so a
  regression had two suspects. Split them next time.
- **Where it is right and the file should stay honest:** 11-23 was not the
  router misbehaving, it was the router doing exactly what `:floor` asked, and
  a *cost-only* override is the wrong dial for a cache-read-dominated lane. If
  the median billed/catalogue climbs back above ~1.5 with the pins in place,
  the correct move is not a prompt-price floor: it is the **cache-read-aware
  order pin** the lanes now carry — the third option, which is what the 11-24
  pin almost was.

### Floor lanes, retired, restored, retired again (2026-11-22 → 2026-11-26)

`:floor` was first retired on 2026-11-22 because the price gap had collapsed,
restored by the owner the same day, and retired a second time on 2026-11-26 on
the deepseek lanes after one measured week showed the mechanism, not its
constant, was the cost (§ Measured cash spend). The minimax designer lane keeps
its floor and its declaration is the one thing left to keep in sync.

- **What it actually bought:** nothing measurable. `:floor` sorts by prompt
  price, so a lane whose cost is 99% cache read landed on Wafer (cache 0.018/M,
  18× the declared 0.000996) whenever the cheap host throttled — $14.4 over two
  days. The 11-24 `provider.order` pin then reached $0.0035/msg against the
  default router's own band, at the price of a hand declaration per lane.
- **What the plain ID costs with only the deny list: it depends on the turn.**
  The 63 orchestrator messages of 2026-11-22 — run plain, before that `ignore`
  list existed — billed Wafer's vector exactly (2.47× catalogue at the median).
  The deny list removes Wafer, so "plain ID plus the deny list" is cheaper than
  plain alone; but it does not bound the prompt term. The first probe set on
  11-26 answered River/Cohere/Parasail/InferenceNet, which looked like an $8–11
  week; **that projection did not survive a cold canary** (next bullet).
- **The default router failed its own canary.** Three fresh orchestrator turns
  on the plain entry with the `ignore` list and no order pin billed
  **2.68× / 1.39× / 1.29× catalogue**, solving to Together/us (0.375/1.5/0.0075),
  Cohere (0.195/0.66/0.003) and Alibaba (0.18/0.72/0.0036). A 25k-token first
  turn with tools is exactly the shape this lane sends, and OpenRouter holds a
  conversation on the first provider while its cache is warm — so the bad pick
  is not a one-turn tax, it is the session's rate. The earlier probe set missed
  it because those probes were small requests. Conclusion: the deny list alone
  is not a guard, it is a filter; the lane needs an order pin.
- **What B costs now:** nothing in model upkeep — the plain catalogue entry
  carries the cost, limit and ladder — and the routing lives in a model-level
  `body.provider.order`. On the 11-23…26 traffic (4,368 messages, 42.8M in,
  4.46M out, 791M cache) river's vector is **$9.18 against $16.52 billed**;
  catalogue $11.19, Together/us $28.69. A raw request with that order answered
  River 3/3.
- **What it removes:** the two hand declarations' `cost` tables and the ladder
  rebuild in `capabilities` (a declared model gets no variants from models.dev,
  which is why they were needed). One compatibility alias remains for the old
  pins (next section).
- **The legacy alias, and why it exists.** 127 sessions in `session_v2` still
  hold `deepseek/deepseek-v4.1-flash:floor`; deleting the ID outright made every
  one of them fail with `ModelUnavailable` on resume — including the session
  that made the change. `opencode.jsonc` keeps an alias under that key whose
  `modelID` is the plain ID, with the catalogue cost/limit and a rebuilt ladder,
  so those sessions resume on the new routing. Remove it when they age out.
- **The one floor worth keeping, and how fragile it is:** minimax reaches
  Inferact only because `limit.output` is exactly its 131072 max output, so the
  endpoint survives OpenRouter's `max_tokens` check. Equal-or-better is the
  boundary today; if OpenRouter ever requires strict headroom, the lane drops
  back to Wafer at 2× with no error and no log line. `bun lane-rates.ts --lane
  minimax` is the detector. Both hosts are nvfp4-quantised, so a switch between
  them is not a quality change either way.
- **Scope:** `opencode-go` has no OpenRouter lanes; `nomoney`'s ds lanes and the
  `opencode-mem` capture lane stayed plain and are unchanged.
- **24 h after the pins (2026-11-27 08:00, scheduled re-measure).** Endpoint
  attribution from per-message cost, since the 07:42 edit: **ds plain 15/18
  River** (1 Alibaba, 1 Cohere, 1 unmatched), **legacy alias 17/17 River**,
  **designer 2/2 Inferact** (the 17,016-token row predicts $0.001322 at
  0.075/0.30 and bills $0.001322), **oracle zero turns since the pin** — its
  106 rows all predate it, and they are exactly what the pin targets (mean
  $0.00304/msg at 1.00× catalogue, Together-class, against GLM's $0.0138),
  while three raw
  requests carrying the declared order answer `PrimeIntellect` on the flex tier
  at 0.075/0.25 (0.25× catalogue). `lane-rates.ts` agrees: no lane warns.
  Read the small counts: 18 + 17 + 2 + 0 turns against 281 on the host
  `build`/`plan` agents and 115 on the Go subscription, so the pinned lanes
  have been nearly idle — this confirms the routing, it does not yet price it
  on real load. The oracle pin is the one still to exercise.

## Gotchas (pricing)

- **Go's peak windows are a second multiplier.** `deepseek-v4.1-flash` and
  `deepseek-v4-pro` bill **2×** Mon–Fri 01:00–04:00 and 06:00–10:00 UTC
  (03:00–06:00 and 08:00–12:00 in Romania, EET). The limit is unchanged; the
  same tokens consume it twice as fast. Measured share of orchestrator volume
  inside the windows: ~20–28% — about **+$3/mo on a $200 allowance**. Every
  projection in this file uses off-peak rates; treat them as a floor. These
  two are the only models with a peak row; everything else is flat.
- **A per-endpoint token rate limit throttles before any usage window.** GPT
  6 Luna's Go endpoint answered dense minutes with `429 "Token rate limit
  exceeded"` with barely any allowance burned — it surfaces as stalled turns
  (retry backoff), not a cost line. Check
  `grep -c "Token rate limit" ~/.local/share/opencode/log/oh-my-opencode-slim.*.log`.
  Big single sessions amplify it (587k context re-sent every turn; 2.3M
  tokens in one minute). This throttle, not price, retired the model.
- **Per-model limits are the authority; the usage API is an aggregate.** See
  the opencode-go section. Size lanes by the price vector; watch the
  aggregate.
- **Context tiers are a hidden 5× multiplier.** `claude-haiku-5-5` (100k),
  `gpt-6-luna` / `gpt-5.6-luna` (272k), `qwen3.7-plus` (256k), `minimax-m3`
  (512k), `grok-4.7` (200k) reprice above a threshold, and agent lanes pass
  100k almost immediately. Compare the tier rate, not the headline. Measured
  cost of getting this wrong: the Go designer lane on Haiku was 16.1% of the
  whole monthly allowance for 1,072 messages, 4.1× its own flat-rate price,
  because 65% of its turns sat above 100k (§ Measured Go allowance).

## Gotchas (variants)

- **A preset cannot set the primary agent's effort.** The plugin's session
  binding declares `affects: "future-children-only"` — a preset applies to the
  session's *team* (oracle, explorer, designer, fixer, pencil), never to the
  orchestrator. The orchestrator's model and variant come from the session's
  selected model, i.e. the TUI picker or the top-level `model` key. Evidence in
  the records: `fixer` shows `high` and `max` and its reasoning moves with them
  (280 → 487 tokens per turn), while `orchestrator` on the same model shows only
  `default` and `high`, reasoning flat at ~350/turn, and **no step at the
  2026-11-17 switch to `max`**. So the `max` in the preset's orchestrator row is
  aspirational. To get it, pick the variant in the picker, or set
  `"model": { "providerID": "opencode-go", "model": "deepseek-v4.1-flash",
  "variant": "max" }` at the top of `opencode.jsonc` — but note that is a
  *session default*, so it also applies while another preset is active, and a
  variant the selected model does not declare is rejected by the host.
- **A valid `variant` is not a working `variant`.** `GLM-5.3-Flash @ low`
  satisfies the schema but degenerates into an unbounded reasoning loop or
  empty output — verified on three distinct agents, so it is a property of
  the model/variant pair, not of any agent. The same model at `high` is fine;
  `deepseek-v4.1-flash @ low` is fine. Canary any new cheap variant before
  trusting a lane to it.
- **Ladders** (set `variant` only from these): DeepSeek-V4.1-Flash
  `none|low|high|max`; MiniMax-M3.1-Flash `low|medium|high|xhigh|max`;
  GLM-5.3 / GLM-5.3-Flash / Kimi-K3 `low|high|max`; MiniMax-M3 /
  Nemotron-3-Super `low|medium|high`; Inkling 2 Small
  `minimal|low|medium|high|max` (no `none`), Inkling 2 Mini and Inkling add
  `none`. **Toggle-only — set no `variant`:**
  `qwen3.8-flash`, `mimo-v2.6-flash`, `mimo-v2.6-pro`. The host rejects a
  variant the model does not declare.
- **An agent-level `variant` beats a chain entry's, and survives `extends`.**
  The factory stamps the chain head's inline variant first, then applies the
  override (`src/agents/index.ts`). A lane that moves to a no-ladder model
  cannot inherit a parent preset's variant — a deep merge has nothing to
  delete it with. That is why `nomoney` and `openrouter` are flat presets.

## Tooling

- `~/.config/opencode/model-table.ts` — bun script; reads the preset, resolves
  `extends` chains, pulls live prices from models.dev (cached 24h in
  `~/.cache/opencode/models-dev.json`), falls back to `opencode.jsonc`
  declarations for `:floor` (only the designer's minimax floor since
  2026-11-26). Options:
  `--preset`, `--all`, `--refresh`, `--json`, `--validate`, positional agent
  filters. Prints chain heads; the chains live in the JSON.
- `/suggest-models` — wraps the script with `--validate` (availability +
  single-provider check; `nomoney`'s mixed-provider warning is expected).
- `~/.config/opencode/lane-rates.ts` — the other half: what the lanes
  **actually paid**. Per assistant message it computes
  `billed / (in·cat.in + out·cat.out + cache·cat.cache)` against the catalogue
  the host itself resolved (`~/.cache/opencode/models-dev.json`, with `:floor`
  keys falling back to the plain model), then reports the **median and p90** of
  that ratio per agent+model+variant, plus $/message and cache share. Warns at
  median > 1.5× catalogue (routed above its own vector), p90 > 3× (the tail
  turns are on a pricier host) and p90 > $0.008/message. A lane near 1.0 is on
  its catalogue vector; a cheap order pin sits under it; Wafer weeks sample
  2.5–2.9. Options `--days`, `--since`, `--lane`, `--json`.
  This replaced a three-term least-squares fit on 2026-11-26: cache read is
  ~88% of tokens and moves with input, so the fit was ill-conditioned and
  returned impossible coefficients (output −0.142 $/M on the floor lane) while
  warning on every honest lane whose own cache rate exceeded the threshold.
  Run it after a routing or preset change, not only when a bill surprises.
- `/models-doc` — answers from this file.

## Decision log

Dated, oldest first. Full detail for pre-2026-11-13 entries lives in git
history (`git log -- oh-my-opencode-slim-models.md`).

- **2026-10-22 — rebalanced for Go Plus on measured usage.** Retired
  `minimax-m3` (orchestrator, cache read $0.06/M) and `kimi-k2.7-code`
  (designer, cache read $0.19/M): cache read, not input, drove ~$47/~$86/mo
  against $60 allowances. The cache-read rate became the primary pick
  criterion.
- **2026-11-01 — GLM-5.3-Flash retired everywhere.** `@low` degenerates
  (unbounded loop or empty output, verified on three agents); `:floor` landed
  it on fp4 endpoints (the only upstream failures on the preset: 429s, idle
  timeouts); and its price edge vanished. Replaced by `deepseek-v4.1-flash` —
  measured 2 errored steps out of 4,968 on Go. The swap cost ≈ −$4/mo.
- **2026-11-07 — Go allowance figures re-read** from the official table;
  several Console-sourced numbers had drifted (DeepSeek V4.1 Flash, Claude
  Haiku 5.5, Muse Spark). The OpenRouter V4 Pro snapshot was corrected (it
  had been ~3× too high).
- **2026-11-09 — `lowmoney` preset created:** `nomoney` with the plan lane
  moved off DeepSeek's peak clock, on `gpt-6-luna @ medium`.
- **2026-11-10 — GPT 6 Luna retired from the plan lane; `lowmoney` idled.**
  30× per-endpoint `429 Token rate limit` in one working morning with ≈$1.40
  of the $12 5h window burned; 29% of requests above the 272k context tier;
  a $75–80/mo pace against a $60 limit. The plan lane moved to
  `minimax-m3.1-flash @ high`, the preset went dormant, and `nomoney`
  returned as the daily driver. The measured peak multiplier on DeepSeek
  (+$3/mo) had undercut the preset's reason to exist.
- **2026-11-12 — preset switched `nomoney` → `opencode-go`** (commit
  `ceba251`).
- **2026-11-13 — consolidation: 6 → 3 presets.** Owner decisions recorded in
  the Plannotator Inbox thread `omo-slim presets consolidation`. Retired:
  `opencode-perform` (burst-only by its own gate verdict — mimo-v2.6-pro ran
  ~97% of its $60 allowance at the measured pace; the lever is
  `deepseek-v4.1-flash @ max` on a $200 lane); `lowmoney` (dormant since
  11-10; its content equalled `nomoney` plus a lever `nomoney` already
  documents); `openrouter-no-floor` (zero use in 60 days; its ~$27/mo
  projection was ~2× stale — the 2026-11-13 catalogue reprice put it near
  $50/mo). The `openrouter` oracle moved `glm-5.3:floor` → plain `glm-5.3`
  (cheaper on all three rates). `:floor` declarations cut 10 → 2. The
  designer's measured cost was corrected to ~$12–15/mo; the default stayed
  `claude-haiku-5-5 @ medium` by owner decision. models.dev moves recorded
  the same day: `glm-5.3` output 1.40 → 3.60; plain `ds-v4.1-flash` input
  0.045 → 0.30; `ds-v4-pro` cache-read 0.0446 → 0.25.
- **2026-11-17 — `opencode-go` plan and fixer lanes moved `high` → `max`.**
  Owner decision after a budget review of the live table. Same model, same
  three rates; the variant only buys reasoning tokens, so the measured ≈6% of
  the $200 lane (≈$9.3 + ≈$2 peak) is the headroom this spends. `pencil`
  inherits the orchestrator's model and variant, so it moves too — its volume
  is a rounding error. Rejected the alternatives on arithmetic, not taste:
  `deepseek-v4-pro` as the plan lane prices at ≈$50–62/mo of its $60 allowance
  including the peak multiplier; `minimax-m3.1-flash` (cache read 0.015) and
  `glm-5.3` (0.26) multiply the term that is ~97% of the lane's cost, $3.5 →
  $17.7 → $306 per month. Session-level escalation to `deepseek-v4-pro` stays
  the route for a genuinely hard turn. Command: `/preset opencode-go` applies
  it to a running session.
- **2026-11-22 — `:floor` retired from every lane; active preset → `openrouter`.**
  The floor price gap collapsed: ds-v4.1-flash's cheapest endpoint (Baidu, fp8,
  0.0498/0.1992/cache 0.001) equals the plain catalogue entry, and the minimax
  floor lost its edge — its cheapest endpoints (StreamLake/Wafer, 0.135/0.54)
  now price the same as the plain entry, and Tenstorrent (the lane's reason
  to exist) no longer serves the model. Both `:floor` declarations were
  removed from `opencode.jsonc`; `opencode-mem` capture moved to plain
  `minimax-m3.1-flash`; the `openrouter` preset's ds/minimax lanes and
  `nomoney`'s ds lanes went plain, keeping the cross-family tails. The active
  preset switched `opencode-go` → `openrouter` (all-cash). Verified against
  live endpoints and the 2026-10-28 "How we rebuilt provider routing"
  announcement, which kept `:floor` as the price-only override — still true
  today, just no longer worth a hand-declared lane. `/preset openrouter`
  applies it to a running session.
- **2026-11-22 — `:floor` restored on the `openrouter` lanes (owner reversal).**
  Same day as the retirement above. A live check confirmed the variant still
  routes: `deepseek/deepseek-v4.1-flash:floor` served from Baidu,
  `minimax/minimax-m3.1-flash:floor` from StreamLake. Both declarations went
  back into `opencode.jsonc` at the cheapest-endpoint rates
  (0.0498/0.1992/0.001 and 0.135/0.54/0.0135 — equal to plain today), and the
  orchestrator/explorer/fixer (ds) and designer (minimax) primaries use them
  again. The price argument for retiring them stands; the choice is to pin the
  cheapest endpoint instead of trusting the default cost/speed/reliability
  router. `nomoney`'s ds lanes and the `opencode-mem` capture lane stayed
  plain. Validated with
  `bun model-table.ts --preset openrouter --validate`: every model available,
  one provider.
- **2026-11-26 — `:floor` retired a second time on the deepseek lanes (owner
  pick B), after one measured week.** The 11-23/24 bill ($14.4 on 3,712
  messages) billed Wafer's vector (2.89× catalogue at the median), not the
  declared one: `:floor` sorts by
  prompt price and a cache-read-dominated lane pays for the *second* host's
  cache rate. The 11-24 `provider.order` pin fixed the cache term (0.0040) and
  broke the input term (0.2639), landing at $0.0035/msg against $0.0040 before.
  Both mechanisms are gone: orchestrator/explorer/fixer use the plain
  `deepseek/deepseek-v4.1-flash` (catalogue 0.14/0.42/0.0042) on the default
  router, the `opencode.jsonc` floor declaration and its `capabilities` ladder
  rebuild are deleted, and the provider-level `ignore` list stays as the only
  endpoint guard. The minimax designer floor stays — with one fix, next entry.
  **Revised the same day:** the default router was then measured on this lane's
  own request shape and billed 1.3–2.7× catalogue, so the routing half was
  replaced by a model-level `provider.order` pin — see the two entries below.
- **2026-11-26 — the change broke the session that made it; the safe order is
  now a rule.** At 04:41 the orchestrator declaration was deleted while
  session `ses_de9e881f…` was pinned to it: `provider.no-route: Model
  unavailable: openrouter/deepseek/deepseek-v4.1-flash:floor`, fallback to
  `qwen3.8-flash`, and at 05:06 the fallback died on Alibaba
  (`provider.invalid-output` — `finish_reason: tool_calls` with an empty
  delta). The plugin's "restore original model" then put back the missing ID
  and the session ended. 127 sessions in `session_v2` still hold that pin and
  fail on resume without the alias below. Rule: publish → audit
  `session_v2.model` for the ID → cut over → canary a *fresh* session on the
  changed lane → remove the old ID in a separate commit. Never edit the
  registry from a session pinned to the ID being removed.
- **2026-11-26 — the default router failed its canary; the ds lanes carry a
  cheap-cache `order` pin (second pass on pick B).** Three fresh orchestrator
  turns on the plain entry (25k-token first turn, tools) billed **2.68× /
  1.39× / 1.29× catalogue** — Together/us (0.375/1.5), Cohere (0.195/0.66),
  Alibaba (0.18/0.72). OpenRouter keeps a conversation on the first provider
  while its cache is warm, so the first pick prices the session. The lane now
  carries `body.provider.order` = river → coreweave/fp8 → deepinfra/fp8/flex →
  relace/fp4 → streamlake/fp8 → novita/fp8 (raw probe: River 3/3); the
  provider `ignore` list stays as the fallback net. Same 11-23…26 traffic:
  **$9.18 at river's vector against $16.52 billed**. The model half of B is
  untouched: no declaration, no cost table, no ladder rebuild. **Verified after
  the edit:** first turns billed River at an implied 0.120 prompt — orchestrator
  0.86× catalogue, explorer 0.86×, fixer 0.86×, alias 0.86×; the designer canary
  stayed on Inferact at 1.00×; the oracle canary landed on
  `primeintellect/flex` at **0.25×** catalogue.
- **2026-11-26 — qwen3.8-flash dropped from every tail; legacy `:floor` alias
  added.** qwen answered 94 messages with one fatal invalid-output (the crash
  above) and its cache rate is 0.016, Wafer-class. The orchestrator's tail is
  now `glm-5.3 @ high` (203 messages, 0 errors); designer and fixer use
  `mimo-v2.6-flash`. A compatibility alias under
  `deepseek/deepseek-v4.1-flash:floor` (modelID = plain ID, catalogue
  cost/limit, rebuilt ladder) keeps the 127 old pins resolvable; remove it when
  they age out.
- **2026-11-26 — designer floor kept, its `limit.output` cut 512000 → 131072,
  and its cost re-declared at 0.075/0.30/0.0075.** The declaration was the
  expensive part, not the routing: OpenRouter filters out endpoints whose max
  output cannot satisfy the requested `max_tokens`, the host asks for
  `limit.output`, and Inferact vLLM caps at 131072 — so every designer turn ran
  on Wafer at exactly twice Inferact's rates while the file still said the floor
  "only pins" hosts that price the same as plain. Boundary probed both ways
  (131072 → Inferact, 131073 → Wafer). The lane's largest generated message in
  the window is 27,820 tokens, so the new cap is 4.7× headroom and truncates
  nothing observed. ~$0.7/wk back, and for now the only lane where a floor is
  worth its upkeep — review in a week, once `lane-rates.ts` has a baseline.
  models.dev now reports the plain entry at the same 0.075/0.30/0.0075 vector
  and the same 131072 output limit, so the floor can become a partial
  `body.provider.order` override like the deepseek lanes instead of a
  declaration. **Verified after the edit:** a live `@designer` canary
  (17,016 fresh in, 153 out) billed **$0.0013221 — Inferact's vector to four
  decimals** (0.075/0.30 predicts $0.001322; Wafer's predicts $0.002380, 80%
  off). The answers were normal UI judgment, so the cheaper endpoint is not a
  quality downgrade.
- **2026-11-26 — oracle primary is `thinkingmachines/inkling-2-small @ high`
  (owner pick A), GLM-5.3 kept as the chain tail.** A cross-family second
  opinion at GLM's class (AA 30.6 vs 31.7) and a lower measured cost on this
  lane's own mix: the oracle billed $2.27 for 165 messages on GLM (0.75M fresh
  in, 8.2M cache read — $0.0138/msg, nearly double GLM's catalogue prices, so
  the same endpoint-sorting problem), where Inkling at its catalogue vector and
  0.030 cache read projects ≈$0.006/msg. Watch two things on the first reviews:
  whether it reads code as well as GLM in this harness (its Terminal-Bench
  weakness is long terminal sessions, not read-only review), and whether it
  over-declines — the 27% hallucination rate is bought by refusing ~47% of what
  it is unsure of, which is right for an oracle but would show up as thin
  findings. `nomoney` keeps GLM-5.3 as its oracle. **Pinned 2026-11-26:** the
  first 105 messages billed 1.00× catalogue (a 0.30/1.00/0.030 host), so the
  lane carries `body.provider.order` = primeintellect/flex → primeintellect/fp4
  → deepinfra/fp4; the cheap tier is 0.075/0.25/0.015. **Verified after the
  edit:** the first canary billed primeintellect/flex exactly, 0.25× catalogue.
- **2026-11-26 — the new oracle head was canaried before committing.** A live
  `@oracle` dispatch on the Inkling chain ran 5 messages on
  `thinkingmachines/inkling-2-small @ high`, no errors, $0.0121 total
  ($0.0024/msg against the GLM week's $0.0138 — small samples, different
  context sizes, so read it as "not more expensive"), and returned a usable
  review that cited the right sections of this file and argued against the
  change it was asked to audit. The `variant: high` resolves against models.dev's
  Inkling ladder.
- **2026-11-26 — Go designer moved `claude-haiku-5-5 @ medium` →
  `minimax-m3.1-flash @ medium`, and `compaction.buffer` 70% → 50%.** A
  per-model allowance reconstruction of the 2026-10-26 → 11-26 billing period
  put the designer at **16.1% of the whole monthly allowance for 1,072
  messages** — the most expensive lane in the fleet, ahead of the orchestrator
  (11.1% for 10,143) — because 65% of its turns ran past Haiku's 100k tier
  where Go quintuples it. Flat-rate Haiku at the same volume prices at 3.9%, so
  the tier was 4.1× of the lane's cost and the model was never the problem.
  Minimax at the designer's own measured mix is 4.1% of an $80 limit, keeps a
  full ladder and has no context tier, and it is already the `openrouter`
  preset's designer model. It is a small quality step down from Haiku on
  polish-critical passes — the lane was on Haiku by owner decision — so keep
  Haiku as the escalation if minimax's UI judgment disappoints. The freed ~12
  allowance points pay for the larger working set: `buffer` 50% compacts a 1M
  model at ~500k instead of ~300k, which costs ~5 points on the orchestrator
  lane and ~14% on the OpenRouter cash orchestrator lane. Verified: JSON parses,
  `model-table.ts --preset opencode-go --validate` reports every model
  available and the preset on one provider. Not verified: a designer canary on
  a real UI task (do that before trusting it), and the 5h/weekly window
  behaviour at the bigger buffer.
- **2026-11-26 — recorded, not fixed: the preset cannot set the orchestrator's
  effort.** The session binding is `future-children-only`, so the `max` in this
  file's orchestrator row never reaches the request; the records show
  `orchestrator` only ever at `default`/`high` with reasoning flat at ~350
  tokens/turn, against `fixer`'s clear 280 → 487 between `high` and `max`. The
  workaround is a session-level `model` variant in `opencode.jsonc` or the
  picker, and it was deliberately not applied: a session default would also
  govern sessions running another preset, and a model that does not declare
  `max` would have the turn rejected. See Gotchas (variants).
- **2026-11-26 — global default preset switched `openrouter` →
  `opencode-go`** (owner). The subscription is sunk, so a Go lane costs $0 at
  the margin, and the two changes above (designer off the Haiku context tier,
  wider working set) bring the preset's own burn down at the same time. The
  `openrouter` preset stays as the all-cash fallback for when the Go 5h/weekly
  windows throttle. The orchestrator's effort is *not* part of this — see the
  entry above; it comes from the session's selected model, so a new session
  still needs the variant picked.
