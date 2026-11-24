---
name: openspec-roadmap-sync
description: Keep a generated STATUS.md and a hand-written ROADMAP.md in step with OpenSpec changes, archives and spec sync. Use when archiving a change, when a status or roadmap file looks stale, when a change renamed or retired terms, or when the user says "move the seal", "sync status", "roadmap stale", or "roadmap_through".
license: MIT
---

# OpenSpec roadmap and status sync

Read the recipe first: `~/.config/opencode/cookbook/openspec-roadmap-sync.md`.
It explains the two-file split, the seal semantics, and the generator inputs.

**Applies only to a project that already runs the two-file pattern** (a generated
`STATUS.md` plus a hand-written `ROADMAP.md` with a `roadmap_through:` line). If
the project has neither, do not invent them mid-task — that is a separate change.

## The move, at archive time

1. **Archive** the change: `openspec archive <name> -y` (or `--skip-specs` for
   doc-only). When requirements were renamed or retired, sync the delta specs
   first, then check residue: grep the retired words across `openspec/specs/` and
   diff against what the change touched.
2. **Stamp mtimes** only if the project's seal compares folder names:
   `find openspec/changes/archive/<folder> -exec touch {} +`.
3. **Edit `ROADMAP.md`** — set `roadmap_through:` to the folder just archived and
   move the finished bullet out of `## Next`. This is the one human judgement
   step; no generator writes this file.
4. **Regenerate** with the project's command (`uv run python status.py` in
   servers, `uv run argus-forge-status` elsewhere). Read the exit code: `1` =
   roadmap stale, `2` = could not gather. Never commit on non-zero.
5. **Commit all three together** — archive dir, `ROADMAP.md`, `STATUS.md`, one
   commit.

## Rules

- Never hand-edit `STATUS.md`; if it looks wrong, fix the input or the generator.
- Do not put requirements in `STATUS.md` or `ROADMAP.md`; they hold counts, ids,
  and intent only.
- Staleness owns the exit code, not the displayed state.
- Say which seal a repo uses (name equality or date prefix) before touching it.
- "Automatic" means a pre-commit guard around that exit code. OpenSpec has no
  post-archive hook, and a scheduled generator becomes a second source of truth.
- Same-day archives need no roadmap edit under a date-prefix seal; under name
  equality they need the touch step.