# Voiceflow / XYOps refactor plan

## Goal

Improve the migration path without changing behavior accidentally:

1. Replace asynchronous XYOps polling with Server-Sent Events (SSE) for job
   lifecycle updates.
2. Keep one final `get_job` fetch because the stream does not contain the
   plugin's final `output`/`data` envelope.
3. Strengthen string and URL validation at external boundaries.
4. Use enums for finite domain and protocol values while keeping free-form
   strings explicitly validated.
5. Keep active `xyops/` and archived Windmill implementations behaviorally
   aligned.

The active deployed system is `xyops/plugin/`; Windmill scripts are archived
but remain a compatibility surface until explicitly retired.

## Current facts and constraints

- Operation IDs use snake_case; Event titles remain `voiceflow_*`.
- `run_event` returns a job ID.
- `stream_job` is `GET /api/app/stream_job/v1?id=<job-id>` and returns SSE
  `start`, `update`, and `end` events.
- SSE updates include status/progress/resource fields and a terminal code, but
  the documented stream does not include the plugin response envelope.
- `get_job` remains necessary to retrieve and parse `output`/`data`.
- Folder discovery is implemented through Logux; folder mutation is not.
- The folder create action, channel, payload, ID format, and acknowledgement
  are unknown and must not be guessed.
- Current plugin version is `0.1.8`.

## Phase documents

Each phase is self-contained in a separate explanation and checklist:

| Phase | Explanation | Checklist |
|---|---|---|
| 0 — Baseline and contract inventory | [phase-0](./refactor-plan/phase-0.md) | [todo](./refactor-todo/phase-0.md) |
| 1 — Model the SSE boundary | [phase-1](./refactor-plan/phase-1.md) | [todo](./refactor-todo/phase-1.md) |
| 2 — Replace asynchronous execute polling | [phase-2](./refactor-plan/phase-2.md) | [todo](./refactor-todo/phase-2.md) |
| 3 — Streaming verification | [phase-3](./refactor-plan/phase-3.md) | [todo](./refactor-todo/phase-3.md) |
| 4 — String and URL hardening | [phase-4](./refactor-plan/phase-4.md) | [todo](./refactor-todo/phase-4.md) |
| 5 — Enumerate finite domain values | [phase-5](./refactor-plan/phase-5.md) | [todo](./refactor-todo/phase-5.md) |
| 6 — Version and deployment | [phase-6](./refactor-plan/phase-6.md) | [todo](./refactor-todo/phase-6.md) |

## Todo tracker synchronization

The executable task tracker is [`docs/refactor-todo.md`](./refactor-todo.md).
Every todo has a stable ID matching the phase and unit of work in this plan.
When scope, ordering, acceptance criteria, or status changes, update the phase
checklist and explanation together.

Status meanings:

- `DONE` — implementation and stated verification are complete;
- `IN PROGRESS` — work has started but acceptance is incomplete;
- `READY` — prerequisites are satisfied and work may begin;
- `BLOCKED` — an external fact, capture, or decision is required;
- `NOT STARTED` — intentionally pending a prerequisite or earlier phase.

The todo files are the concise execution view; the phase explanation files are
the authoritative architecture, risk, and decision-gate record. Completion
bars in the todo index are estimates of acceptance progress, not a substitute
for verification.

## Verification matrix

| Claim | Evidence |
|---|---|
| Execute dispatch is not duplicated | mocked request count plus stream-failure test |
| Stream lifecycle is parsed correctly | isolated SSE parser tests |
| Final result remains compatible | `get_job` output/data fixtures and CLI tests |
| Unknown execute outcomes remain safe | transport failure tests and no-retry assertion |
| Folder creation is correct | redacted UI trace plus mocked Logux acknowledgement tests |
| Folder IDs are not confused with names | discriminated-union type tests and boundary tests |
| No API-key fetch remains | call-site search, focused result tests, live request inspection |
| URLs are safe | URL policy tests for schemes, credentials, encoding, and slashes |
| Active plugin and Windmill remain aligned | mirrored contract tests and sequential deployment verification |

## Risks and rollback

- **SSE endpoint incompatibility:** retain polling behind a small client strategy
  boundary until live SSE behavior is verified.
- **Stream disconnect after launch:** never automatically redispatch execute;
  classify the result as unknown and reconcile through `get_job` or operator
  inspection.
- **Terminal event without output:** always fetch `get_job` after stream end.
- **Folder duplicate creation:** do not retry mutation without a confirmed
  idempotency or reconciliation strategy.
- **Contract mismatch:** deploy read-only operations first, then plan, then
  execute; keep the previous plugin artifact available for rollback.
- **Windmill drift:** update local source and deployed scripts in the same phase,
  checking each script after sequential deployment.

## Explicit non-goals

- Do not invent the Logux folder mutation protocol.
- Do not add JWT signature verification in this refactor.
- Do not make migrations idempotent without a separate design.
- Do not expose project API keys or secret values.
- Do not replace the final job-result fetch with status-only SSE data.
