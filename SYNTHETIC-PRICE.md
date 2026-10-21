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
"The `opencode-go` preset"); the `synthetic` preset never got the equivalent pass.

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

## 7. What changed

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

## 8. Other levers, in order of effect

1. **Context re-reads.** 62% of spend is cache read. Fewer, larger turns;
   `/compact` before long sessions; keep the MCP/tool surface small. Helps on
   every provider, but 10× more on synthetic.
2. **Designer lane** — done above.
3. **Oracle lane** — revisit only if it stops being 1.5% of spend.
4. **Orchestrator variant** — done above, small and possibly inert.
5. **Cross-provider lanes** — if the single-provider rule is relaxed, point
   designer at `opencode-go/claude-haiku-5-5 @ medium` and oracle at
   `opencode-go/qwen3.8-flash @ xhigh` for another ~2.8× on top of the
   `GLM-5.3-Flash` designer pick.

## 9. Reproducing

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
