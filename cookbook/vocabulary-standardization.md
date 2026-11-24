# Recipe: vocabulary standardisation

**Use when** one concept has several names and the disagreement is now load-bearing
— the UI says *vendor*, the API says `target`, the spec says `site` — or a term is
being retired across a repo. **Do not use** for wording inside one file, and do
not run a sweep to fix a design question: decide the words first, separately.

Two worked runs, different in shape on purpose:
`servers` 2026-11-23 (`fleet-vocabulary`, `stacks-sweep`, `stacks-contract`,
`vocabulary-guard`) and `argus-forge` 2026-11-24 (`site-vocabulary`, then a docs
review, then a glossary).

## Pick the shape before touching anything

| Situation | Shape |
| --- | --- |
| Behaviour is identical; only names and prose change | **one change**, `skip_specs: true`, spec prose edited in the same commit |
| A capability's identity changes, or requirement wording is the contract | **separate contract change** with deltas; the sweep change says `skip_specs` and is "not complete until" it lands |
| The vocabulary must *stay* true after the sweep | add a **guard** (step 5), its own change |

`servers` needed all three because `tool-stacks` was a capability; `argus-forge`
needed the first plus a review pass. Writing a delta for a pure rename forces
every spec consumer to re-review unchanged behaviour.

## 1. Measure first

Count the old term per tree — `src`, `tests`, `web`, `openspec/specs`, `docs`,
root files — and put the number in the proposal. Re-measure at the end rather than
quoting: one run's handoff said 32/13, the real count was 44/15.

## 2. Write the standard in the file every agent loads

One row per concept: **canonical | what it means | what it retires**, in
`AGENTS.md` (or the project's equivalent contract). Rules that made both tables
usable:

- **Partial retirements are stated, not implied.** `servers`: *server* and *machine*
  survive as ordinary English, never as the fleet's noun. `argus-forge`: `target`
  survives for "the page being scraped"; `slot` survives outside the category
  schema.
- **A kept list beside the retired list**: hostnames, capability ids, DOM
  vocabulary (`event.target`, `target=`), frozen values. Without it the next
  sweep "fixes" them.
- **The record rule in the same place**: an archive or a dated note keeps the
  words it was written with; editing it falsifies what was decided. Both repos
  had to assert this, because a future agent will otherwise correct history.
- **Downstream copies are subordinate.** The machine-readable `context:` and
  `rules.specs` in `openspec/config.yaml` reach artifact authors (advisory); a
  user glossary is a separate document that says *"where the two disagree, the
  standard wins"*. One term, one home.

## 3. Sweep deepest first

Order used in both repos:

1. **Module move** — `git mv`, then `git status` must show a rename, not
   delete-plus-add.
2. **Identifiers and types** — imports, classes, function names.
3. **Routes and wire keys, in one pass** — a type checker cannot see a key
   mismatch across a boundary; the client and the server move together. Watch for
   a name that previously meant two things in one payload (`{"target": …}` where
   *target* meant both the site and the scrape target).
4. **Tests**, then **client types**, then **client components**, then **spec
   prose**, then **live docs**, then **root docs**.

Along the way:

- **Mark the allowed exceptions explicitly** (`event.target`, spec paths, page-sense
  *target*) so a later reader does not re-sweep them.
- **Never touch records** — archive and research notes. Assert it:
  `git status` lists nothing under `openspec/changes/archive/**` or
  `docs/research/**`.
- **Half a rename is worse than none**: code saying `site` while the artifact key
  says `vendors` recreates the ambiguity the change exists to remove.

## 4. Specs, three mechanisms

- **Pure vocabulary** → `skip_specs: true` in `.openspec.yaml`, "behaviour is
  identical" in the proposal, spec prose edited in the change's own commit. A
  spec's *path* is its capability identity; renaming it is a different change.
- **Requirement wording changes** → a delta per capability. `MODIFIED` blocks are
  re-copied **whole** from the current spec; **scenario names stay
  byte-for-byte** (strict validation refuses a rename); a requirement's *name*
  renames only through `## RENAMED Requirements` (FROM/TO); a Purpose-only edit is
  applied directly, because a delta's Purpose is ignored for an existing
  capability.
- **Capability rename** → not a move: new capability, remove the old
  requirements with Reason + Migration, `retire_capabilities: true`. The archive
  then deletes the old spec directory — which can break other in-flight changes
  that still point at it. Check them in the same run.

## 5. Guard it if the vocabulary must stay true

A test in the existing suite (not a new gate command — a fifth command is the one
people skip), scanning `openspec/specs/**` only:

- word-boundary, case-insensitive regex over the retired words — **`box` is its own
  alternative**: `boxes?` matches "boxe" and "boxes" and never "box", hiding
  eleven hits;
- an allow-list of `(exact phrase, reason)`, matched on **normalized content**,
  not line numbers, so editing around a permitted line does not break it;
- fail on an unrecorded hit **and** on a stale allow-list entry that matches
  nothing — the second direction is what makes it a check rather than a grep;
- a self-test that writes a known-bad spec and asserts it bites;
- every entry carries a reason: an entry is a decision, not an exemption.
  Whole-file permits hid two hits in the sweep's own list.
- Start at the specs. Widen to docs or code only when a retired noun actually
  reaches the contract through a path the corpus check cannot see.

## 6. Review the prose the rename did not re-read

A mechanical rename edits words it does not understand: one docstring became "No
sites" where the code means "no image addresses". After the sweep, run the
adversarial docs review (`adversarial-docs-review.md`) with its **docstring lane
over exactly the modules the commit touched** — `VOCAB` / `ACCURATE-DEFECT` /
`MISSING`. Then check the **whole retirement table**, not only the axis that was
swept: `argus-forge`'s first pass retired `target`/`vendor` and left `door`,
`entry point` and `slot` in live prose. Expect a second, docs-only commit.

## 7. Archive and close

- Post-archive residue grep: `rg -w -i '<every retired word>' openspec/specs/`,
  then **diff the residue against the set the change recorded**. Nothing else in
  the gate reads spec prose.
- If the project has a roadmap seal: stamp the archive folder's mtimes when the
  seal compares names, bump `roadmap_through` **and** the § Next bullet, regenerate
  the status file, one commit.
- Record the decisions the sweep refused: an alias not added because it would
  hide a rename; a breaking key accepted; a dead link left open and written down.

## Traps, all met

- A regex that looks right is not right (`boxes?`).
- The project's own name can be a replacement word: one sweep renamed the repo
  `servers` and its skill to "targets", fixed the next commit.
- Counts drift; handoff numbers are not measurements.
- Strict validation refuses a scenario rename — by design, so the archive can
  match by name.
- Exemption lists grow into hiding places; key them to text with a reason.
- "X is out of scope" is a claim: one grep over the change's own folder disproved
  it for `host`.
- An alias can be the less capable choice when it suppresses the rename offer.