# Recipe: adversarial documentation review

**Use when** docs may claim more than the code does: before an onboarding, after a
rename or restructure, when a gate log and the README disagree, or once a quarter
as maintenance. **Do not use** for one file — read it. This instrument costs a
half day and pays off on entry docs plus contracts, not on prose nobody acts on.

Worked examples to copy the shape from (do not copy the findings):
`argus-forge/docs/research/docs-review-2026-11-22.md` and the rerun
`docs-review-2026-11-24.md`; the port to another repo is described in
`servers/openspec/changes/archive/2026-11-23-stacks-contract/design.md` (decision
D-5) and `servers/docs/research/stacks-sweep-review.md`.

## The instrument

A review is **a blind comprehension measurement plus parallel claim audits**, not
one agent reading everything. The lanes:

| Lane | Who | Job |
| --- | --- | --- |
| **A — blind Q&A** | a **different model family**, docs only | answer a fixed question set using only the entry docs; cite `file:line`; mark confidence; list contradictions; "not answered by the documentation" is a valid answer |
| **B — claim audit, entry docs** | authoring agent | every factual claim in README / AGENTS / docs index / runbooks → `TRUE` / `STALE` / `FALSE` + evidence |
| **C — claim audit, contracts** | authoring agent, **parallel with B, disjoint scopes** | the same for contracts, schemas, generated `STATUS.md` / `ROADMAP.md` numbers |
| **D — docstrings** (only after a rename/restructure commit) | authoring agent | the modules the commit touched → `VOCAB` / `ACCURATE-DEFECT` / `MISSING`; allowed spec-path references listed explicitly |
| **read** | the owner | read the docs as a person: density, ordering, entry path |

Rules that make it a measurement rather than an opinion:

- **The author answers the same question set first**, before seeing lane A's
  output. Otherwise the author reads the docs through the blind lane's eyes.
- **Lane A never sees code, tests, specs or the author's answers.** Either
  destroys the measurement.
- **Agreement proves nothing; disagreement is the signal.** Two readers of the
  same wrong sentence agree. A lane-A item that only repeats the docs is noise.
- **Ground truth is code, generated artefacts and measured commands** — never the
  docs against themselves. A count in a doc is verified by running the thing that
  produces it (`pytest --collect-only`, `openspec validate --strict`, CLI `--help`).
- **Verdict + evidence for every claim**, no narrative. `file:line` or it did not
  happen. Anything unproven is written `UNVERIFIED` — a summary from a subagent is
  not evidence; read the artefact it produced.
- **Confirmed = two lanes or a direct code read.** A single-lane finding stays a
  candidate until read, and the note says so in those words.

## Inputs a project must supply

1. **The entry set** — which files a newcomer is expected to read, in order.
2. **The contract set** — the files that make promises about behaviour (schemas,
   API docs, generated status/roadmap, reference pages).
3. **The deny list for lane A** — every directory that would leak the answer
   (`src/`, `tests/`, `openspec/`, config dirs).
4. **A question set**: 6–8 fact questions (install, primary flow, the gate, one
   procedural path, schema, configuration, one known seam) plus 2–3 adversarial
   ones ("find every remaining mention of X; cite a line or answer `none`").
5. **The source-of-truth precedence order** and the project's **vocabulary table**
   (canonical term → retired terms), if it has one.
6. **The gate commands**, so counts in prose can be measured.

## Running it

1. Freeze the tree read-only and record the baseline: branch, commit, and the
   output of every measured command.
2. Author writes their answers to the question set. Timestamp and set aside.
3. Lane A runs in a separate session with a different model family, docs only.
4. Lanes B and C run in parallel on disjoint files. Each returns a table, not
   prose.
5. Lane D when the trigger is a rename: the commit is the input; the verdicts are
   about prose the rename edited but did not re-read.
6. **Inverse completeness check** — the step everyone forgets: grep the retired
   terms (prove the regex matches a known hit first) across live docs *and* specs;
   for a prose/contract change, diff what the change touched against the residue.
   A forgotten delta makes no claim at all, so claim audits cannot find it. Re-run
   this **after** archiving a change that renamed anything.
7. Reconcile: two lanes or a direct read → confirmed; single-lane → candidate;
   anything unmeasured → `UNVERIFIED`.
8. Read as a person, then write the note.

## The note

One dated file, `docs/research/docs-review-YYYY-MM-DD.md`, sections in fixed
order: **Status** (complete, read-only exploration) → **The brief**, verbatim →
**The method, as run** → **Measured baseline** → **What the instrument showed** →
**What was found** (`FALSE` table with Quote / Reality, then `STALE`, `Vocab`,
`Gaps`, `Docstrings`, `Held up`) → **Reconciliation** → **Decisions** →
**Running the next one** → **Limits**.

- Line numbers are "as found **before** corrections": the note is a record, not
  live documentation.
- `Held up` is written explicitly — the passes are evidence the instrument is not
  just a complaint generator.
- `Limits` names what the pass could not see (unread lanes, unmeasured claims).

## Aftermath

- Exploration mode: no OpenSpec change, no spec edit, no dependency. The fix pass
  happens on the owner's call, in the same tree, and lands in **one commit with
  the note** — the note and the corrections are one story.
- Archive and research records are left untouched; retitling them falsifies the
  record.
- Point the next review at this note from the docs index, so the instrument is
  reused rather than reinvented.
- Docs changes are verified by being read, not by the code gate; do not claim the
  gate vouches for prose.

## Failure modes seen

- Trusting lane A's confidence scores as proof.
- Showing lane A the code "just to clarify" — the measurement is gone.
- Overlapping audit scopes between B and C, producing duplicate findings and no
  coverage of the seam between them.
- A retired-term regex that misses a form (`tool` vs `tools/`), so residue looks
  clean.
- Claiming coverage from claim audits: a gap makes no claim, so only the blind
  lane and the person-read find it.
- Skipping the post-archive re-check, which is where a rename leaks into specs.
- Writing the note before the fix pass, so line numbers no longer match the tree.