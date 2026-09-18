# BDD27 completion checklist

Feature: **Execute reducer effects without shadow state or branching effect logic**

This checklist is the completion gate for BDD27. Do not mark it complete while any item is unchecked, unverified, or supported only by a source-pattern search.

## Scenario acceptance

- [x] Store effect results in reducer-owned workflow context
- [x] Keep failed effect results out of shadow state
- [x] Dispatch effects through a typed handler map
- [x] Preserve reducer-defined effect ordering
- [x] Prevent effect results from changing a settled workflow
- [x] Keep effect handlers dependency-explicit and testable
- [x] Preserve migration behavior while removing shadow state
- [x] Verify the runner architecture through observable behavior
- [x] Complete the authoritative effect runner refactor

## Implementation and boundary review

- [x] The behavior is implemented in the owning module, without speculative scope expansion.
- [x] External inputs are treated as `unknown`/untrusted at the boundary.
- [x] Public types, nullability, expected failures, and side effects are explicit.
- [x] Business policy is separate from transport, persistence, parsing, and orchestration.
- [x] Existing valid behavior and compatibility contracts are preserved.
- [x] Malformed, missing, null, empty, duplicate, oversized, unauthorized, delayed, and dependency-failure cases are handled where applicable by existing boundary adapters and the reducer runner.
- [x] No secrets, credentials, raw payloads, or stack traces are exposed in diagnostics or tests.

## Verification evidence

- [x] Focused behavioral tests pass.
- [x] Focused BDD scenarios pass: **9 scenarios, 83 steps**.
- [x] Regression/unit test suite passes: **226 tests**.
- [x] Aggregate BDD suite passes: BDD18/19/20/21/22/23/25/26/27.
- [x] Typecheck passes.
- [x] Lint/format checks pass.
- [x] Relevant build or artifact verification passes.
- [x] Repository search/audit reviewed migration orchestration, reducer context ownership, effect/result mappings, handler dispatch, terminal guards, diagnostic translation, and related runtime tests. The targeted migration runner has no mutable workflow data outside the reducer state; the only runner-local mutable value is the current authoritative reducer state.
- [x] Tests verify observable behavior and contracts, not only implementation text or regex matches.

## Effect/state ownership mapping

| Reducer-owned state or transition | Effect | Handler | Result event/state update |
| --- | --- | --- | --- |
| `AUTHENTICATION` | `authenticate` | `authenticate` | `authentication-succeeded` stores `auth` |
| `EXPORT` | `export` | `export` | `export-succeeded` stores `artifact` |
| `PLANNING` | `plan` | `plan` | `plan-succeeded` stores `plan` |
| `ARCHIVE_PREFLIGHT` | `load-archive-candidates` | `load-archive-candidates` | `archive-preflight-result` stores `archive` when present |
| `ARCHIVE` | `rename`, `confirm-archive-durability` | matching handlers | `archive-renamed` / `archive-durability-confirmed` |
| `IMPORT` | `import` | `import` | `import-succeeded` stores `imported` |
| `SECRET_INPUT` / `SECRET_RESOLUTION` | `resolve-secrets` with explicit phase | `resolve-secrets` | input or `secret-resolution-completed`, storing `secrets` |
| `SECRET_CREATION` | `create-next-secret` | `create-next-secret` | `secret-completed` or unknown/failure terminal event |
| terminal state | `settle-success` / `settle-failure` | settlement handlers | one public `Envelope` result |

## Completion record

Implementation files:
- `xyops/voiceflow/execute-migration-state-machine.ts`
- `xyops/voiceflow/execute_migration/effect-runner.ts`
- `xyops/voiceflow/execute_migration/index.ts`
- `package.json`

Test files:
- `bdd/27-authoritative-effect-runner/feature.feature`
- `bdd/27-authoritative-effect-runner/steps.js`
- `tests/vf_migration_workflow_state_machine.test.ts`
- `tests/vf_runtime_cleanup.test.ts`
- `tests/xyops_streaming.test.ts`
- `tests/vf_rename_durability.test.ts`
- `tests/vf_logux_state_machine.test.ts`
- `tests/migration_cli_xyops.test.ts`
- `tests/xyops_event_plugin.test.ts`

Related verification maintenance:
- `bdd/23-runtime-boundaries-and-control-flow/steps.js` now treats the effect runner as the orchestration implementation while retaining observable boundary assertions.

Commands run:
- `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/27-authoritative-effect-runner/feature.feature' --import 'bdd/27-authoritative-effect-runner/steps.js'` — PASS, 9 scenarios / 83 steps
- `bun test tests/vf_migration_workflow_state_machine.test.ts` — PASS
- `bun test tests/vf_runtime_cleanup.test.ts` — PASS
- `bun test tests/xyops_streaming.test.ts` — PASS
- `bun test tests/vf_rename_durability.test.ts` — PASS
- `bun test tests/vf_logux_state_machine.test.ts` — PASS
- `bun test tests/migration_cli_xyops.test.ts` — PASS
- `bun test tests/xyops_event_plugin.test.ts` — PASS
- `bun test` — PASS, 226 tests
- `bun run bdd` — PASS, including BDD27
- `bun run typecheck` — PASS
- `bun run lint` — PASS
- `bun run verify:cli` — PASS

Evidence reviewed:
- `runMigrationWorkflow` keeps only the current reducer state locally; auth, artifact, plan, archive, imported receipt, and resolved secrets are stored in `MigrationWorkflowContext`.
- `createMigrationEffectHandlers` is a typed handler map covering every `MigrationWorkflowEffect` kind; result values become typed reducer events.
- Cancellation emits `abort-active-operation` before settlement, and the runner accepts an explicit injectable abort dependency without adding ambient cleanup state.
- Sequential effect execution stops after a handler failure and dispatches the failure/unknown-outcome event through the reducer.
- Terminal reducer states reject duplicate and late events with no effects, preserving exactly-once settlement.
- Runtime BDD27 tests exercise handler selection, result storage, ordering, failure propagation, dependency injection, and terminal immunity.
- BDD18 wire contracts and BDD20/25 parsed boundaries remain delegated to existing adapters.

Known risks or intentionally deferred items:
- BDD28 will consolidate shared Logux connection lifecycle and operation-specific runners; BDD27 intentionally retains existing catalog, folder, secret, and rename transport adapters.
- BDD29 will establish the Logux transport/domain translation boundary; BDD27 does not redesign frame parsing or WebSocket protocols.
- Migration effect execution is sequential by reducer-emitted order; concurrent effects are not introduced because the migration stages are dependent and import/secret operations are not generally idempotent.
- `secretFileContents` remains immutable runner input rather than reducer context because it is untrusted sensitive input; resolved secret results are stored only in reducer context.

**Completion decision:** [x] Complete  [ ] Not complete

> A passing command is not sufficient if the command does not exercise the acceptance criteria. Any unchecked item means the BDD is not complete.
