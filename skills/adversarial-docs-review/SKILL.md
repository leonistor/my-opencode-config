---
name: adversarial-docs-review
description: Review a project's documentation against its code and find claims that are false, stale, or missing. Use when docs may have drifted — after a rename or restructure, before onboarding, when a README contradicts a gate or a measured count, or quarterly as maintenance. Also use when the user says "docs review", "adversarial review", or "check the docs tell the truth".
license: MIT
---

# Adversarial documentation review

Read the recipe first: `~/.config/opencode/cookbook/adversarial-docs-review.md`.
It carries the lane design, the note format, and the failure modes. Do not
re-derive the method; take it from there and fill in the project's inputs.

## What this is

A blind comprehension measurement plus parallel claim audits — not one agent
reading everything:

- **Lane A** — a different model family, docs only, answering a fixed question
  set with `file:line` citations and "not answered by the documentation" allowed.
- **Lanes B and C** — claim audits on disjoint file scopes, every claim
  `TRUE` / `STALE` / `FALSE` + evidence.
- **Lane D** — docstrings of modules touched by a rename commit:
  `VOCAB` / `ACCURATE-DEFECT` / `MISSING`.
- **The owner** — reads the docs as a person.

## Collect before starting

1. Entry set (files a newcomer reads, in order) and contract set (files that make
   behavioural promises).
2. Deny list for lane A: every directory that leaks the answer (`src/`, `tests/`,
   `openspec/`, config dirs).
3. Question set: 6–8 fact questions plus 2–3 adversarial ones ("find every
   remaining mention of X; cite a line or answer `none`").
4. Source-of-truth precedence and, if the project has one, the vocabulary table
   (canonical → retired terms).
5. Gate commands, so counts in prose are measured rather than believed.

## Non-negotiables

- The author writes their answers **before** seeing lane A's output.
- Lane A never sees code, tests, specs, or the author's answers.
- Agreement proves nothing; disagreement is the signal.
- Every finding carries a verdict and a `file:line`. Unproven → `UNVERIFIED`.
- Confirmed = two lanes or a direct code read; single-lane stays a candidate.
- Run the inverse residue grep (retired terms across docs **and** specs), and
  re-run it after archiving a change that renamed anything.
- One dated note, `docs/research/docs-review-YYYY-MM-DD.md`, fixed section order,
  line numbers as found before corrections.
- The review itself opens no OpenSpec change; the fix pass lands in the same
  commit as the note, on the owner's call.