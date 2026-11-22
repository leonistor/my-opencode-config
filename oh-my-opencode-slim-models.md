# oh-my-opencode-slim: model presets and rationale

Presets for `~/.config/opencode/oh-my-opencode-slim.json`. The active preset is
whatever its `preset` key names — that key is authoritative (currently
`openrouter`, since 2026-11-22). Three presets exist:

- **`openrouter`** — the daily driver since 2026-11-22. All-cash; the
  ds/minimax primaries use `:floor` (retired and restored on 2026-11-22).
- **`opencode-go`** — the subscription lane set. Everything on the Go
  subscription, balance leaning cheap.
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
| designer | `opencode-go/claude-haiku-5-5` | `medium` | Multimodal UI work; measured burn ~20–25% of its $60 allowance (see above). Escalate to `high` if polish suffers; the cheap lever is below. |
| fixer | `opencode-go/deepseek-v4.1-flash` | `max` | Scoped implementation from a concrete plan; same cheap volume profile as the orchestrator, same peak windows. `max` since 2026-11-17 — the lane measured ~$1.4/mo, so the extra reasoning is nearly free against its $200 allowance. |

Observer is unconfigured: `deepseek-v4.1-flash` declares image input, so
images ride inline and a separate reader would waste quota.

### Levers

- **Cheaper:** orchestrator `@ high` is the previous default and a proven
  trim; `@ low` is proven-safe too (`deepseek-v4.1-flash @ low` is fine — it
  is GLM that degenerates there). Drop to `high` when the weekly window bites.
- **More performance:** already at `max` since 2026-11-17. The next step would
  have to be a different model, and none is affordable on this lane (below).
- **Designer cost:** swap to `mimo-v2.6-flash` (no ladder, lowest cache-read
  in the catalogue, $120 allowance — the `nomoney` designer pick): roughly an
  order of magnitude cheaper at the measured volume; keep Haiku for
  polish-critical passes. `qwen3.8-flash @ medium` is a middle option on a
  smaller ($90) allowance.
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

## The `openrouter` preset (all-cash, active since 2026-11-22)

The subscription-independent daily driver: every lane on OpenRouter cash. The
ds/minimax primaries use `:floor` (retired and restored on 2026-11-22; see
below). Three lanes share `deepseek-v4.1-flash` deliberately — the only family
with a measured ~0% error rate and a working effort ladder at this price; every
chain ends on a cross-family model.

| Agent | Model | Variant | Why |
| --- | --- | --- | --- |
| orchestrator | `deepseek/deepseek-v4.1-flash:floor` | `high` | Highest-token lane; 1M ctx, vision. `:floor` pins the cheapest endpoint (Baidu fp8, 0.0498/0.1992/cache 0.001 — equal to plain today). |
| oracle | `z-ai/glm-5.3` | `high` | Cross-family reasoner. Switched from `glm-5.3:floor` to the plain ID on 2026-11-13 — the floor variant was no longer cheaper on any rate (0.11/6.00/0.109 declared vs 0.084/3.60/0.079 live); 2026-11-22 rates are 0.07/1.40/0.069. |
| explorer | `deepseek/deepseek-v4.1-flash:floor` | `low` | Proven `@low` trim on the pinned-cheapest endpoint; cross-family tail on mimo. |
| designer | `minimax/minimax-m3.1-flash:floor` | `medium` | Full ladder; the cheapest endpoints (StreamLake/Wafer, 0.135/0.54/cache 0.0135) price the same as plain, so `:floor` only pins them. |
| fixer | `deepseek/deepseek-v4.1-flash:floor` | `high` | The lane where a broken step costs most; same proven profile as the orchestrator. |

### Failover chains

| lane | chain |
| --- | --- |
| orchestrator | ds-v4.1-flash `:floor` `high` → qwen3.8-flash |
| oracle | glm-5.3 `high` → qwen3.8-flash |
| explorer | ds-v4.1-flash `:floor` `low` → mimo-v2.6-flash |
| designer | minimax-m3.1-flash `:floor` `medium` → qwen3.8-flash |
| fixer | ds-v4.1-flash `:floor` `high` → qwen3.8-flash |

Entries advance on transient errors (429/403/401/410, 5xx/524, queue-full,
spent allowance, empty response), not on quality. All entries share the
`openrouter` provider ID, so a dead key or spent allowance skips the rest —
only `nomoney`'s Mistral tails cover that. The cross-family tail is the
reliability net; on the 2026-11-22 catalogue, ds-v4.1-flash is cheap enough
(0.0498/0.1992/0.001, floor or plain) that the fallback's only job is staying
up, not saving money.

### Floor lanes, retired and restored (2026-11-22)

`:floor` was first retired on 2026-11-22 because the price gap had collapsed:
the cheapest ds endpoint (Baidu, fp8) priced at 0.0498/0.1992/cache 0.001 —
identical to plain — and minimax's cheapest (StreamLake/Wafer) at 0.135/0.54,
identical to plain, with Tenstorrent gone. The owner reversed that the same day
and the floors are back on the `openrouter` lanes.

- **Why keep them at equal price:** `:floor` pins the cheapest eligible
  endpoint. The 2026-10-28 default router balances cost, speed and reliability,
  so a hot turn can be served by a pricier endpoint; floor stays the explicit
  price-only override. Confirmed live on 2026-11-22: `:floor` requests served
  from Baidu (ds) and StreamLake (minimax) — the rates declared in
  `opencode.jsonc`.
- **What it costs to keep:** a hand declaration in `opencode.jsonc` whose
  `cost` must track the moving floor, since `:floor` is a routing variant
  absent from models.dev and `GET /api/v1/models/{id}`. Floor also admits flex
  service-tier endpoints into the pool, billed at the flex rate when one serves
  the request.
- **Scope:** `opencode-go` has no OpenRouter lanes; `nomoney`'s ds lanes and the
  `opencode-mem` capture lane stayed plain.

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
  100k almost immediately. Compare the tier rate, not the headline. Haiku
  stays a designer-only pick for exactly this reason.

## Gotchas (variants)

- **A valid `variant` is not a working `variant`.** `GLM-5.3-Flash @ low`
  satisfies the schema but degenerates into an unbounded reasoning loop or
  empty output — verified on three distinct agents, so it is a property of
  the model/variant pair, not of any agent. The same model at `high` is fine;
  `deepseek-v4.1-flash @ low` is fine. Canary any new cheap variant before
  trusting a lane to it.
- **Ladders** (set `variant` only from these): DeepSeek-V4.1-Flash
  `none|low|high|max`; MiniMax-M3.1-Flash `low|medium|high|xhigh|max`;
  GLM-5.3 / GLM-5.3-Flash / Kimi-K3 `low|high|max`; MiniMax-M3 /
  Nemotron-3-Super `low|medium|high`. **Toggle-only — set no `variant`:**
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
  declarations for `:floor` (the two restored on 2026-11-22). Options:
  `--preset`, `--all`, `--refresh`, `--json`, `--validate`, positional agent
  filters. Prints chain heads; the chains live in the JSON.
- `/suggest-models` — wraps the script with `--validate` (availability +
  single-provider check; `nomoney`'s mixed-provider warning is expected).
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
