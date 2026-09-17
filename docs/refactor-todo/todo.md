# Voiceflow / XYOps refactor todo

This is the execution tracker for [`refactor-plan.md`](./refactor-plan.md).
Each phase has its own checklist and links to its detailed explanation:

| Phase | Checklist | Explanation |
|---|---|---|
| 0 — Baseline and contract inventory | [phase-0](./refactor-todo/phase-0.md) | [phase-0 explanation](./refactor-plan/phase-0.md) |
| 1 — Model the SSE boundary | [phase-1](./refactor-todo/phase-1.md) | [phase-1 explanation](./refactor-plan/phase-1.md) |
| 2 — Replace asynchronous execute polling | [phase-2](./refactor-todo/phase-2.md) | [phase-2 explanation](./refactor-plan/phase-2.md) |
| 3 — Streaming verification | [phase-3](./refactor-todo/phase-3.md) | [phase-3 explanation](./refactor-plan/phase-3.md) |
| 4 — String and URL hardening | [phase-4](./refactor-todo/phase-4.md) | [phase-4 explanation](./refactor-plan/phase-4.md) |
| 5 — Enumerate finite domain values | [phase-5](./refactor-todo/phase-5.md) | [phase-5 explanation](./refactor-plan/phase-5.md) |
| 6 — Version and deployment | [phase-6](./refactor-todo/phase-6.md) | [phase-6 explanation](./refactor-plan/phase-6.md) |

## Summary

```text
P0 Baseline and inventory       [####################] 100% DONE
P1 SSE boundary                [####################] 100% DONE
P2 Streaming execute path      [--------------------]   0% NOT STARTED
P3 Streaming tests             [--------------------]   0% NOT STARTED
P4 String and URL hardening    [--------------------]   0% NOT STARTED
P5 Finite-value enums          [--------------------]   0% NOT STARTED
P6 Version and deployment      [####----------------]  20% IN PROGRESS

Overall implementation         [#####---------------]  25% IN PROGRESS
```

Legend: `DONE`, `IN PROGRESS`, `READY`, `BLOCKED`, `NOT STARTED`.

The baseline, live SSE success/failure experiments, walkthrough, and `0.1.8`
version bump are complete evidence work. Phase 1 now models and validates the
SSE transport boundary; execute-event integration remains in Phase 2.

## Current next action

`P2-01` is the next implementation unit: add the streaming strategy to the
client boundary without changing read-only polling behavior.

Do not begin folder creation or API-key removal from this tracker; those changes
are outside the revised scope.
