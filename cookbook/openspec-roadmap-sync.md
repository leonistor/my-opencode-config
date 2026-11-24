# Recipe: OpenSpec roadmap and status sync

**Use when** a project runs its changes through OpenSpec and needs a status view
that cannot drift, plus a roadmap that says what is *next* rather than what is
*in flight*. **Do not use** for a repo where changes are not tracked in
OpenSpec — a hand-written `ROADMAP.md` alone is cheaper.

## The split that makes it work

OpenSpec can answer "what is built" and "what is in flight". It deliberately does
not answer "what is next", "what was refused", or "what is waiting on a
measurement" (Fission-AI/OpenSpec#889). So the sync is **two files, split by kind
of truth**:

| File | Written by | Holds |
| --- | --- | --- |
| `STATUS.md` | **generated**, never hand-edited | counts, ids, one-line summaries from `openspec --json`, and one closed-set state word |
| `ROADMAP.md` | **hand-written** | intent: next, waiting, refused, with a `roadmap_through:` seal |

The generated file carries only facts the specs already own, so it cannot become
a second source of truth. The roadmap is the only thing a person writes.

## The seal

`ROADMAP.md` opens with a machine-readable line:

```markdown
roadmap_through: 2026-11-24-ui-improvements
```

The generator compares it with the newest archive folder and **exits 1** while
the roadmap is behind. Staleness owns the exit code independently of what the
roadmap displays — that is the whole forcing function. Two implementations exist
and you must pick one per repo:

- **name equality** (`servers`): the recorded folder must be the newest by
  `lastModified`; archives need `find openspec/changes/archive/<folder> -exec touch {} +`
  because `openspec archive` does not rewrite mtimes.
- **date prefix** (`argus-forge`): compare the recorded folder's `YYYY-MM-DD`
  against the newest archive's date; no stamping, and a same-day archive needs no
  roadmap edit.

State words are a closed set: `in-flight`, `roadmap-stale`, `ready-to-open`,
`awaiting-owner-decision`, `nothing-active`. Read the word before reading the
roadmap.

## The loop, at archive time

1. **Archive** — `openspec archive <name> -y` (add `--skip-specs` for a
   doc-only change). When requirements were renamed or retired, run the spec sync
   as its own step first (`openspec-sync-specs`, or archive's spec merge), then
   check residue: `rg -w -i '<retired words>' openspec/specs/` and diff against
   the change's recorded set.
2. **Stamp mtimes** — only for the name-equality seal:
   `find openspec/changes/archive/<folder> -exec touch {} +`.
3. **Edit `ROADMAP.md`** — set `roadmap_through:` to the folder just archived and
   move the finished bullet out of `## Next`. The generator never writes this
   file; this is the one human judgement step.
4. **Regenerate** — `uv run python status.py` (`servers`) or
   `uv run argus-forge-status` (`argus-forge`). Exit code is the gate: `1` =
   roadmap stale, `2` = could not gather, `0` = clean.
5. **Commit all three together** — archive dir, `ROADMAP.md`, `STATUS.md`, one
   commit: `docs(openspec): archive <name>, move the seal`.
6. **Never hand-edit `STATUS.md`.** If it looks wrong, fix the input or the
   generator.

Generator inputs (all documented output, no private internals):
`openspec list --all --json`, `openspec list --specs --json`,
`openspec status --all --json`, `openspec validate --all --strict --json`,
each change's `proposal.md` `## Why`, each spec's `## Purpose`, and
`ROADMAP.md`'s seal plus headings. `openspec show` is correct but slow (~7 s per
spec); read `spec.md` directly.

## Making it actually automatic

Nothing is automatic today: no CI, no Makefile target, no git hook calls the
generator; the trigger is a person or agent running the command, plus three
advisory texts (`AGENTS.md` "the report and the seal", `openspec/config.yaml`
`operations.archive.guidance`, and a `tasks.md` item inside each change). OpenSpec
has no post-archive hook.

The smallest credible automation is a **pre-commit guard**, not a scheduled
generator:

- The hook runs the generator and refuses the commit when it exits non-zero.
  Fail closed; the guidance text stays as the explanation.
- A scheduled generator is the thing to avoid: it turns `STATUS.md` into an
  independent record that nobody reads at the moment it matters.
- Keep `operations.archive.guidance` in step with the hook — it is what the agent
  reads at archive time, and it should name the same command and the same seal.

Verify idempotence before wiring the hook: an unchanged run must write nothing
(the generators compare the document without its `Generated …` line), otherwise
every commit churns the timestamp.

## Failure modes

- **Seal left behind** — the common miss. It is an exit 1, not a warning; do not
  commit past it.
- **Two sources of truth** — a hand-edit to `STATUS.md`, or a roadmap bullet that
  restates requirements. The first is forbidden; the second drifts silently
  because the seal proves *reviewed*, not *correct*.
- **Archive dropped a scenario** — the spec merge can do this; the status file
  will render the wrong count happily. The residue check is the mitigation.
- **Mixed seal semantics** — name equality and date prefix disagree on the same
  machine. Say which one a repo uses at the top of its recipe copy.
- **Same-day archives** — name equality needs the touch step; date prefix cannot
  distinguish them, so a second archive that day does not force a roadmap edit.