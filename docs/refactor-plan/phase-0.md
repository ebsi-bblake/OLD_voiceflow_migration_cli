> Tracker: [Phase 0 checklist](../refactor-todo/phase-0.md)

# Phase 0 — Baseline and contract inventory

**Owner:** CLI/client boundary

- Record current `run_event`, `/wait`, `get_job`, response guards, and execute
  unknown-outcome behavior.
- Freeze current tests as the regression baseline.
- Identify every active and Windmill caller of `executeEvent`, `pollJob`, and
  `readJobResponse`.
- Do not change public operation parameters in this phase.

**Exit criteria:** baseline checks pass and the list of affected interfaces is
reviewed.
