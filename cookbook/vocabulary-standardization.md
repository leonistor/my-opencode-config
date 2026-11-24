# Recipe: vocabulary standardisation

**Use when** one concept has several names and the disagreement is load-bearing —
more than one surface names it: code plus docs, a spec plus the UI, a payload key
plus a page label. **Do not use** for wording inside one file, and do not run a
sweep to settle a design question: decide the words first, separately.

The work is to distil a standard vocabulary: one canonical word per concept, with
the words it retires written down beside it.

## Why one word per concept

The payoff is fewer errors, in every direction the word travels. In
`argus-forge`, *target* meant both the saved record and the page being scraped, and
one detail payload carried the record under `target` beside its contents under
`site`; the rename then forced that second key to become `settings`, or `site`
would have meant two things inside one object (`site-vocabulary`, D1/D6). In
`servers`, *tool* meant both a self-hosted compose app and an agent's tool call,
in a repository whose operators are agents — every instruction about one was
readable as the other (`fleet-vocabulary`). One canonical word makes code, devdocs
and human talk agree: fewer wrong assumptions by agents and newcomers, cheaper
review, no alias tables hiding a stale name, less churn at the next rename.

The sweep is not free of risk either: a mechanical rename edited one docstring
into "No sites" where the code means "no image addresses". That is why the review
step exists.

Two worked runs, different in shape on purpose: `servers` 2026-11-23
(`fleet-vocabulary`, `stacks-sweep`, `stacks-contract`, `vocabulary-guard`) and
`argus-forge` 2026-11-24 (`site-vocabulary`, then a docs review, then a glossary).

## 1. Write the standard in the file every agent loads

One row per concept: **canonical | what it means | what it retires**, in
`AGENTS.md` (or the project's equivalent contract).

- **Partial retirements are stated, not implied.** `servers`: *server* and
  *machine* survive as ordinary English, never as the fleet's noun. `argus-forge`:
  `target` survives for "the page being scraped"; `slot` survives **inside**
  `category-schema.md` and is retired everywhere else. A reader who cannot tell
  which sense survives will sweep the wrong one.
- **A kept list beside the retired list**: hostnames, capability ids, frozen
  values, and the client-side names a sweep must leave (`event.target`, `target=`
  attributes — `site-vocabulary` tasks name them). The guard's `ALLOWED` table is
  the second home of the same list, deliberately; without both, the next reader
  treats the allow-list as the only one and re-sweeps the docs.
- **The record rule**: an archive or a dated note keeps the words it was written
  with; editing it falsifies what was decided. Put it next to the table where the
  reader meets it; one run carried it in its sweep proposal and in the guard's
  scope note instead, which works only if the sweep document is read first.
- **Downstream copies are subordinate.** `context:` / `rules.specs` in
  `openspec/config.yaml` reach artifact authors (advisory, not a gate); a user
  glossary is a separate document that says *"where the two disagree, the
  standard wins"*. One term, one home.

## 2. Measure the old term's spread

Count occurrences per tree — `src`, `tests`, `web`, `openspec/specs`, `docs`, root
files — and put the number in the proposal. Re-measure at the end rather than
quoting: one handoff said 32/13, the real count was 44/15. The spread is also what
tells you whether the change is a sweep detail or a contract change.

## 3. Pick the packaging after the standard exists

| Situation | Shape |
| --- | --- |
| Behaviour is identical; only names and prose change | **one change**, `skip_specs: true`, spec prose edited in the same commit |
| A capability's identity changes, or requirement wording is the contract | **separate contract change** with deltas; the sweep says `skip_specs` and "is not complete until" it lands |
| The vocabulary must *stay* true afterwards | add a **guard** (§6), its own change |

Steps 5 and 8 assume an OpenSpec project. Without one, the standard, the sweep and
the guard still apply; only the packaging and residue steps fall away.

Where the lag is declared matters: the phrase "this change is not complete until
…" belongs in the proposal's § What Changes, next to `skip_specs: true`, so a
reader of the change sees the debt rather than discovering it.

## 4. Sweep deepest first

1. **Module move** — `git mv`, then `git status` must show a rename, not
   delete-plus-add.
2. **Identifiers and types** — imports, classes, function names.
3. **Routes and wire keys, in one pass** — a rename that crosses a wire boundary
   moves client and server in one commit; a type checker cannot see a key
   mismatch. Watch a key that would end up meaning two things inside one object
   (`site` vs `settings` above).
4. **Tests**, then **client types**, then **client components**, then **spec
   prose**, then **live docs**, then **root docs**.

- Mark every allowed exception explicitly, so a later reader does not re-sweep it.
- Never touch records — archive and research notes. Assert it: `git status` lists
  nothing under `openspec/changes/archive/**` or `docs/research/**`.
- Half a rename is worse than none: code saying `site` while the artifact key says
  `vendors` recreates the ambiguity the change exists to remove.

## 5. Specs: choose the mechanism, not the mechanics

- **Pure vocabulary** → `skip_specs: true`, "behaviour is identical" in the
  proposal, spec prose edited in the change's own commit. A spec's *path* is its
  capability identity; renaming it is a different change with its own delta.
- **Requirement wording changes** → a delta per capability. OpenSpec's own rules
  govern the block mechanics (whole `MODIFIED` blocks, scenario names frozen,
  `## RENAMED` for requirement names, Purpose-only edits applied directly); the
  mechanical detail belongs to `openspec instructions` and the archive skill, not
  here.
- **Capability rename** → not a move: new capability, old requirements removed
  with Reason + Migration, `retire_capabilities: true`. The archive then deletes
  the old spec directory, which can break other in-flight changes still pointing
  at it — check them in the same run.

## 6. Guard it if the vocabulary must stay true

A test in the existing suite (not a new gate command — a fifth command is the one
people skip), scanning `openspec/specs/**` only:

- word-boundary, case-insensitive regex over the retired words — **`box` is its
  own alternative**: `boxes?` matches "boxe" and "boxes" and never "box", hiding
  eleven hits;
- an allow-list of `(exact phrase, reason)`, matched on **normalized content**,
  not line numbers, so editing around a permitted line does not break it;
- fail on an unrecorded hit **and** on a stale allow-list entry that matches
  nothing — the second direction is what makes it a check rather than a grep;
- a self-test that writes a known-bad spec and asserts it bites;
- every entry carries a reason: an entry is a decision, not an exemption.
  Whole-file permits hid two hits in the sweep's own list.

Start at the specs. Golden files, generated data and `docs/research/**` are out of
scope by design; widen only when a retired noun actually reaches the contract
through a path the corpus check cannot see.

## 7. Review the prose the rename did not re-read

A mechanical rename edits words it does not understand. After the sweep, run the
adversarial docs review (`adversarial-docs-review.md`) with its **docstring lane
over exactly the modules the commit touched** — `VOCAB` / `ACCURATE-DEFECT` /
`MISSING`. Then check the **whole retirement table**, not only the axis that was
swept: `argus-forge`'s first pass retired `target`/`vendor` and left `door`,
`entry point` and `slot` in live prose. Expect a second, docs-only commit.

## 8. Archive and close

- Post-archive residue grep: `rg -w -i '<every retired word>' openspec/specs/`,
  then **diff the residue against the set the change recorded**. Nothing else in
  the gate reads spec prose.
- Regenerate any generated document, and if the project has a roadmap seal, close
  it here (see Project knobs).
- Record the decisions the sweep refused — aliases not added, keys broken, dead
  links left open. `argus-forge` used the change's design `## Rejected
  alternatives`; `servers` recorded numbered decisions in `docs/BRIEF.md`. Name
  the file; do not leave the refusals in a scratch note.

## Traps, all met

- A regex that looks right is not right (`boxes?`).
- The project's own name can be a replacement word: one sweep renamed the repo
  `servers` and its skill to "targets", fixed the next commit.
- Counts drift; handoff numbers are not measurements.
- Exemption lists grow into hiding places; key them to text with a reason.
- "X is out of scope" is a claim: one grep over the change's own folder disproved
  it for `host`.
- An alias can be the less capable choice when it suppresses the rename offer.

## Project knobs

- **Roadmap seal** (only where one exists): if it compares archive folder names,
  stamp mtimes first (`find openspec/changes/archive/<folder> -exec touch {} +`)
  because the archive does not rewrite them; then bump `roadmap_through` **and**
  the § Next bullet, regenerate the status file, one commit. A date-prefix seal
  needs no stamping.
- **Guard scope**: specs only at first. The trigger to widen is the first retired
  noun that reaches the contract through a path the corpus check cannot see.
- **Refusals**: the change's design, or the project's numbered decisions — the
  place a reader already looks.
- **No OpenSpec**: drop §5 and the spec half of §8; keep the standard, the sweep,
  the review and (if wanted) a guard over whatever the contract corpus is.