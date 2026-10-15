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
| explorer | `synthetic/hf:zai-org/GLM-5.3-Flash` | `low` | 0.15 / 0.50 | High-volume scouting; cheapest model with reasoning + 524k ctx + vision. |
| librarian | `synthetic/hf:zai-org/GLM-5.3-Flash` | `low` | 0.15 / 0.50 | Same profile; keeps context7 + gh_grep MCPs. |
| designer | `synthetic/hf:MiniMaxAI/MiniMax-M3` | `medium` | 0.60 / 1.20 | Mid-cheap; plugin lists it as designer-grade. Buys UI/UX judgment without reaching for Kimi. |
| fixer | `synthetic/hf:zai-org/GLM-5.3-Flash` | `high` | 0.15 / 0.50 | Scoped implementation from a concrete plan — the lane where a cheap model is safest. |

Observer is **left at its default (disabled)**: the DeepSeek orchestrator is
vision-capable, so images ride inline and a separate reader would be wasted
spend.

### Alternates, if the balance needs re-tuning

- Cheaper overall: orchestrator → `GLM-5.3-Flash @ high` (biggest saving,
  biggest risk — it is the instruction-follower).
- More performant: oracle → `Kimi-K3 @ high`; orchestrator → `GLM-5.3 @ high`.
- Designer step-up: `Kimi-K2.7-Code @ high`.
- Explorer/librarian floor: `openai/gpt-oss-120b @ low` (128k ctx) or
  `GLM-4.7-Flash` (192k, no reasoning variants).

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
  `~/.cache/opencode/models-dev.json`). Options: `--preset <name>`, `--all`,
  `--refresh`, `--json`, and positional agent filters.
- `/models` — global OpenCode command wrapping the script.
