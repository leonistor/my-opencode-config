# Cookbook — agentic recipes

Recipes for tools and workflows Leo runs across projects. Each one is written to
be copied into a project, not remembered: setup that is easy to get wrong, the
loop that actually works, the verification that proves it, and the failure modes
that have already cost time.

## Recipes

| Recipe | Problem it solves | Kind |
| --- | --- | --- |
| [agentation-vite](agentation-vite.md) | In-page annotation that reaches the agent, per session | Setup + per-session enable |
| [openpencil-design](openpencil-design.md) | Wireframes and full design from one editor, without the wrong tool surface | Setup + decision layer |
| [openspec-roadmap-sync](openspec-roadmap-sync.md) | A roadmap/status view that follows the change state instead of drifting | Procedure (generated artefact) |
| [adversarial-docs-review](adversarial-docs-review.md) | Docs that claim more than the code does, found and fixed with evidence | Procedure (review pass) |

## How a recipe is written

Every recipe has the same anatomy, so one can be read in two minutes:

1. **Use when / do not use** — the trigger and the cheaper alternative.
2. **One-time setup** — install, config, where the files land. Exact names and
   paths, never "configure it as usual".
3. **Per session or per run** — what is switched on and off, and how, so nothing
   is enabled globally that only one task needs.
4. **The loop** — the steps that repeatedly worked, with the commands.
5. **Verification** — the evidence that proves it worked (an exported image, a
   green gate, a generated file that matches its source), not "it looked fine".
6. **Failure modes** — what has already broken, and the check that catches it.
7. **Project knobs** — the two or three things a new project must change.

A recipe states facts that were verified, and says when something is a choice.
Where an upstream document is the reference (an API, a CLI), the recipe links to
it instead of copying it: one source of truth per fact.

## How recipes are found

`AGENTS.md` carries the index pointer and one rule — when a task matches a
recipe, read it first. A recipe is not a skill: nothing auto-injects it, and it
holds no procedure an agent must run unprompted. If a recipe turns out to be that
kind (a pass the agent should recognise mid-work), it gets a thin global skill
that points here rather than a second copy of the text.