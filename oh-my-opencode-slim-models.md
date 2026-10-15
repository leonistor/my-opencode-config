# oh-my-opencode-slim: model presets and rationale

Reference for the `synthetic` preset (and the `opencode-go` preset) in
`~/.config/opencode/oh-my-opencode-slim.json`.

Run `/models` (or `bun ~/.config/opencode/model-table.ts --preset synthetic`)
for the live table with current models.dev pricing.

## Design brief

Match models to agents per provider. Preference: a **balance leaning cheap**
rather than performant. Cost concentrates where a cheap model actually costs
quality; volume lanes stay on the cheapest capable model.

## Agent characteristics

| Agent | Job | Cost sensitivity | Needs |
| --- | --- | --- | --- |
| orchestrator | Plans, schedules background specialists, reconciles, verifies | High — drives every turn | Strong instruction-following + judgment; large context; ideally vision |
| oracle | Architecture, hard debugging, trade-offs, review (read-only) | Low — rare, high-value | Strongest reasoning |
| explorer | Codebase reconnaissance (read-only) | High — high volume | Fast, cheap, large context |
| librarian | External docs / GitHub research | High — high volume | Fast, cheap; context7 + gh_grep MCPs |
| designer | UI/UX implementation and visual polish | Medium | UI judgment + frontend codegen; vision |
| fixer | Scoped implementation from a concrete plan | High — high volume | Reliable coding, cheap |
| observer | Reads images/screenshots/PDFs for a non-vision orchestrator | n/a | Vision; disabled by default |

## The `synthetic` preset

| Agent | Model | Variant | In/Out (per M) | Why |
| --- | --- | --- | --- | --- |
| orchestrator | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `xhigh` | 0.60 / 1.20 (cache 0.03) | Highest-token lane. 524k ctx, vision-capable (so no Observer lane needed), cheapest model Synthetic recommends for the "large text" tier, near-Fable capability. |
| oracle | `synthetic/hf:zai-org/GLM-5.3` | `high` | 1.40 / 4.40 | The one lane worth paying up for: rare, read-only, hard reasoning. Well below Kimi-K3 ($3/$15); gives diversity from the orchestrator model. |
| explorer | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `low` | 0.60 / 1.20 (cache 0.03) | High-volume scouting; 524k ctx + vision, and the catalog's cheapest cache read ($0.03/M) — the rate that actually governs cost on repeated context. Upgraded from GLM-5.3-Flash for reasoning/instruction-following. |
| librarian | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `low` | 0.60 / 1.20 (cache 0.03) | Same profile; keeps context7 + gh_grep MCPs. |
| designer | `synthetic/hf:moonshotai/Kimi-K3` | `high` | 3.00 / 15.00 | Vision-capable UI/UX work; the one lane where judgment is worth paying for. Stepped up from MiniMax-M3, which Synthetic retired. |
| fixer | `synthetic/hf:deepseek-ai/DeepSeek-V4.1-Flash` | `high` | 0.60 / 1.20 (cache 0.03) | Scoped implementation from a concrete plan. Quality upgrade from GLM-5.3-Flash; `xhigh` is available if more reasoning effort is worth the output spend. |

Observer is **left at its default (disabled)**: the DeepSeek orchestrator is
vision-capable, so images ride inline and a separate reader would be wasted
spend.

**Diversity note:** `DeepSeek-V4.1-Flash` now fills four lanes (orchestrator,
explorer, librarian, fixer). That is deliberate — the quality brief outweighed
per-lane diversity — but it means a DeepSeek outage or a capability regression
hits most of the preset at once. `Kimi-K3` (designer) and `GLM-5.3` (oracle)
are the only independent families left.

### Alternates, if the balance needs re-tuning

- Cost floor for the volume lanes: explorer/librarian/fixer →
  `openai/gpt-oss-120b @ low|medium|high` ($0.10/$0.10, but 131k ctx and no
  vision).
- Cheaper 524k + vision + reasoning: revert to `GLM-5.3-Flash` ($0.15/$0.50) —
  still the cheapest model in the catalog with that profile; use `low` for
  explorer/librarian, `high` for fixer.
- Fixer, different family: `Kimi-K2.7-Code @ high` (code specialist; 262k ctx,
  but no cache discount at $0.95/M) or `MiniMax-M3 @ high` (524k + vision; cache
  read $0.60/M is punitive at volume).
- More performant: oracle → `Kimi-K3 @ high`; orchestrator → `GLM-5.3 @ high`.
- Explorer/librarian floor: `GLM-4.7-Flash` ($0.10/$0.50, 196k ctx, no reasoning
  variants) — the cheapest non-vision option.

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
| explorer | `openrouter/z-ai/glm-5.3-flash:floor` | `low` | 0.15 / 0.50 | High-volume scouting; 1M ctx, vision. |
| librarian | `openrouter/z-ai/glm-5.3-flash:floor` | `low` | 0.15 / 0.50 | Same; keeps context7 + gh_grep MCPs. |
| designer | `openrouter/minimax/minimax-m3:floor` | `medium` | 0.30 / 1.20 | Mid-cheap designer grade; matches the Synthetic choice. |
| fixer | `openrouter/z-ai/glm-5.3-flash:floor` | `high` | 0.15 / 0.50 | Scoped implementation; the lane where cheap is safest. |

Observer stays disabled — the orchestrator model is vision-capable.

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
  sync with the real floor price when it changes.
- `:floor` picks the cheapest *eligible* provider, so throughput/latency varies
  by request; it is a cost lever, not a quality lever.

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

## Tooling

- `~/.config/opencode/model-table.ts` — bun script; reads the preset, resolves
  `extends` chains, pulls live prices from models.dev (cached 24h in
  `~/.cache/opencode/models-dev.json`), and falls back to the models declared in
  `opencode.jsonc` for anything models.dev does not know (OpenRouter `:floor`).
  Options: `--preset <name>`, `--all`, `--refresh`, `--json`, and positional
  agent filters.
- `/models` — global OpenCode command wrapping the script.
