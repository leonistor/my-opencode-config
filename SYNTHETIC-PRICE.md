# Why the `synthetic` preset felt expensive

Investigation into the cost of the `synthetic` preset sessions (Oct 15–21 2026).
Conclusion up front: **the rates never changed and there was no price increase —
synthetic is simply priced higher than the other presets, and the preset was
pointing two lanes at expensive models.**

Sources: `~/.local/share/opencode/opencode.db` (`session_v2`, `session_message`),
the models.dev catalog (`kv:models-dev:catalog`, refreshed 2026-10-21 12:35, and
`~/.cache/opencode/models-dev.json`), and
`~/.cache/opencode/quota-provider-state/synthetic-*.json`.

## 1. No price increase

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

## 2. Synthetic's rates are higher than the alternatives

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

## 3. Cache reads are the actual driver

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

## 4. Model and variant choices inflate it further

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

## 5. The recent synthetic sessions

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

## 6. Caveat: the list price is a quota meter, not cash

Synthetic is a plan, not pay-as-you-go. The quota plugin's last read of the
provider state (2026-10-21 13:23) reported a **"Synthetic Weekly" window at
`$4/$48`** alongside a request-count window (`0/1000` per 5h).

That $4 does not reconcile with ~$13 of list-price spend across Oct 19–21, so
either the plan discounts, meters only part of the traffic, or the plugin's
window is not the window it claims to be. **The per-token figures in this
document are list-price meters** — faithful for comparing presets against each
other, but not necessarily what is drawn from the plan.

## 7. What changed in the first pass (2026-10-21)

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

## 8. What changed in the second pass (2026-10-22)

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

## 9. What changed in the third pass (2026-10-23)

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

## 10. What changed in the fourth pass (2026-10-23)

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

## 11. What changed in the fifth pass (2026-10-23)

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

## 12. Other levers, in order of effect

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

## 13. Reproducing

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
