---
description: Stress-test and refine an OpenSpec change — one question at a time, decisions written back to proposal/design/specs/tasks
---

Load the `grill-with-change` skill and run it on this change:

$ARGUMENTS

If that names no change, use the only active one from `openspec list --json`; ask which one when
several are active, and ask whether to create a change when none is.

Stay inside the skill: one user-facing question at a time, phase-gated write-back, and only
user-confirmed decisions become normative. Do not edit application code.

This is opt-in. Do not continue into implementation or start a grilling round on your own.
