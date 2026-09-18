# BDD22 completion checklist

Feature: **Make runtime state transitions authoritative**

This record is intentionally conservative. The focused executable slice passes, but the broad feature remains undefined and the repository audit still finds callback-owned settlement in Logux adapters. BDD22 is therefore **not complete**.

## Scenario acceptance

### Focused executable feature (`executable.feature`)

| Scenario | Status | Evidence |
|---|---|---|
| Migration entrypoint guards confirmation before starting | PASS | Focused BDD22, `execute_migration/index.ts` |
| Stream failures reconcile through polling | PASS | Focused BDD22; `job-observation-state-machine.ts`, `vf_runtime_cleanup.test.ts` |
| Direct polling has an explicit lifecycle event | PASS | Focused BDD22; `polling-started` is a reducer event and is not a stream-failure event |
| Logux mutation sends are reducer effects | PASS | Focused BDD22; `vf_logux_state_machine.test.ts` and adapters |
| Runtime wiring acceptance checks run | PASS | Focused BDD22 reducer/effect assertions |
| Migration effects preserve the required ordering | PASS | Focused BDD22 and `vf_migration_workflow_state_machine.test.ts` |
| Late migration events are rejected exactly once | PASS | Focused BDD22 and migration reducer tests |
| Observation terminal transitions are idempotent | PASS | Focused BDD22 and streaming tests |
| Production migration follows every stage in order | PASS | Focused BDD22 injected-dependency runtime adapter test |
| Production observation has no direct polling bypass | PASS | Focused BDD22 and runtime cleanup tests; no redispatch after stream failure |
| Cleanup effects settle only once | PASS | Focused BDD22 and runtime cleanup tests |
| Logux protocol policies remain operation-specific | PASS | Focused BDD22 and BDD18 wire-frame contract |
| Rejected events produce no runtime side effects | PASS | Focused BDD22 and reducer tests |
| Runtime identity and diagnostic state remain aligned | PASS | Focused BDD22 and diagnostic contract tests |

### Broad feature (`feature.feature`)

| Scenario | Status | Evidence / blocker |
|---|---|---|
| Drive migration execution through the authoritative workflow reducer | UNVERIFIED | 14 broad scenarios / 166 steps are undefined in `steps.js`; focused wiring evidence is insufficient for this claim |
| Preserve migration stage ordering | UNVERIFIED | Broad scenario undefined; focused no-secret ordering is covered |
| Reject invalid and late migration events | UNVERIFIED | Broad scenario undefined; focused late-event slice passes |
| Resolve the previous shadow-state contradiction | UNVERIFIED | Broad scenario undefined; adapter still owns effect-local data and settlement orchestration |
| Preserve the rename durability barrier in one authoritative workflow | UNVERIFIED | Broad scenario undefined; rename durability reducer and barrier unit tests pass, but combined runtime wiring is not proven |
| Stop safely when rename durability cannot be confirmed | UNVERIFIED | Broad scenario undefined; bounded barrier tests pass |
| Drive every job-observation path through its reducer | UNVERIFIED | Broad scenario undefined; focused stream/poll paths pass |
| Use one polling reconciliation state | UNVERIFIED | Broad scenario undefined; reducer and runtime cleanup tests cover representative paths |
| Preserve the existing public unknown-outcome contract | UNVERIFIED | Broad scenario undefined; focused regression tests cover the public code |
| Use operation reducers as Logux runtime authority (4 examples) | UNVERIFIED | Broad scenario undefined; unit reducers pass, but adapter callbacks still contain direct settlement decisions |
| Preserve operation-specific protocol policies in shared transport | UNVERIFIED | Broad scenario undefined; BDD18 passes, but no shared transport adapter is present to prove the full claim |
| Settle runtime operations exactly once | UNVERIFIED | Focused races pass; callback-owned `settled` guards remain in Logux adapters |
| Test runtime wiring rather than only pure reducer behavior | UNVERIFIED | Focused wiring exists, but the broad runtime wiring scenario is undefined |
| Complete the authoritative runtime refactor | FAIL | Broad feature is undefined and the audit identified remaining shadow lifecycle flags |

**Broad feature execution:** FAIL for completion purposes — 17 scenarios, 166 steps, all undefined when run with the supplied `steps.js`. Undefined steps are a blocking acceptance failure.

## Authoritative state / event / effect ownership map

| Runtime | Authoritative reducer/state | Typed events | Effects / adapter boundary |
|---|---|---|---|
| Migration | `transitionMigrationWorkflow` / `MigrationWorkflowState` | `MigrationWorkflowEvent` | `execute_migration/index.ts` translates dependency results and interprets `MigrationWorkflowEffect` |
| XYOps observation | `transitionJobObservation` / `JobObservationState` | `JobObservationEvent` | `cli/client/index.ts` interprets stream and polling effects; stream failure and polling outcomes re-enter the reducer |
| Rename durability | `transitionRenameDurability` / `RenameDurabilityState` | `RenameDurabilityEvent` | `catalog/rename-barrier.ts` performs bounded catalog reads and feeds attempt results |
| Logux rename | `transitionRenameState` / `RenameState` | `RenameEvent` | `logux/rename-project.ts` interprets send/close/settle effects |
| Logux folder | `transitionFolderState` / `FolderState` | `FolderEvent` | `logux/create-folder.ts` interprets protocol effects |
| Logux secret | `transitionSecretStateWithEffects` / `SecretState` | `SecretEvent` | `logux/create-secret.ts` interprets protocol effects |
| Logux catalog | `transitionCatalogState` / `CatalogState` | `CatalogEvent` | `logux/index.ts` normalizes frames and interprets effects |

Reducers are pure and do not perform network, filesystem, timer, socket, logging, or settlement effects. External frame/results are normalized before reducer dispatch in the audited paths.

## Shadow-state audit

- **Migration stage shadow state:** no separate mutable stage variable was found; production assigns the reducer state and invokes effects from reducer output. Auth, artifact, plan, imported receipt, archive candidate, and resolved secrets are effect data, not stage decisions.
- **Migration settlement flag:** removed from `execute_migration/index.ts`; terminal reducer effects now own settlement eligibility and native Promise resolution is idempotent.
- **Observation state:** one mutable reducer state exists in the client adapter. Direct polling now requires the explicit `polling-started` reducer event; stream failure always follows the reducer-produced polling effect. Job IDs are correlated at dispatch.
- **Rename durability:** reducer rejects superseded attempt IDs and the barrier does not resend the rename mutation.
- **Logux callback-owned lifecycle:** **FAIL / remaining risk.** `create-folder.ts`, `create-secret.ts`, `rename-project.ts`, `syncCatalog`, and `update-secret.ts` still contain local `settled` guards and some callbacks call `settle` directly after dispatch. These are cleanup safety guards, but they mean the broad “effects determine settlement” claim is not fully proven.
- **Duplicate state machines / stale adapters:** no unused migration reducer was found; `rename-durability-state-machine.ts` and Logux operation reducers are imported by production adapters. `update-secret.ts` remains an older direct protocol adapter and is not reducer-backed.
- **Transport/domain boundary:** frame parsing and operation-specific policies remain in adapters; BDD18 frame validation remains intact.

## Cleanup and exactly-once settlement evidence

- SSE reader lock release is covered by `tests/xyops_streaming.test.ts`.
- HTTP timeout abort cleanup is covered by streaming tests.
- Polling timeout and late response behavior is covered by `tests/vf_runtime_cleanup.test.ts`.
- Terminal reducer transitions reject later success/failure/timeout events.
- Logux sockets and timers have defensive cleanup, but callback-owned settlement remains an open authority concern and prevents a complete audit result.

## Verification evidence

Commands run:

- `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/22-authoritative-runtime-state/executable.feature' --import 'bdd/22-authoritative-runtime-state/steps.js'` — **PASS**, 14 scenarios / 31 steps.
- `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/22-authoritative-runtime-state/feature.feature' --import 'bdd/22-authoritative-runtime-state/steps.js'` — **FAIL for acceptance**, 17 scenarios / 166 steps undefined.
- `bun test tests/vf_migration_workflow_state_machine.test.ts tests/vf_rename_durability.test.ts tests/vf_runtime_cleanup.test.ts tests/xyops_streaming.test.ts tests/vf_logux_state_machine.test.ts` — **PASS after changes**.
- Related integration tests — **PASS**, 51 tests: `bun test tests/migration_cli_xyops.test.ts tests/xyops_event_plugin.test.ts`.
- `bun test` — **PASS**, 226 tests.
- `bun run bdd` — **PASS**, aggregate configured suite (BDD18/19/20 executable split/21 executable/22 executable/23/25); it does not execute the broad undefined BDD22 feature.
- `bun run typecheck` — **PASS**.
- `bun run lint` — **PASS**.
- `bun run verify:cli` — **PASS**, with existing cross-target runtime checks deferred by the verifier.

The broad BDD22 feature remains a separate failing acceptance command despite the configured aggregate suite passing.

## Dependency status

- **BDD20: NOT COMPLETE.** Per task-provided dependency status, its main feature has 30 undefined scenarios / 311 undefined steps. Its plugin-boundary feature passes. The existing BDD20 checklist's split-scope completion wording is not treated as overriding this dependency limitation.
- **BDD21: INCOMPLETE.** Its executable feature passes, but its completion checklist has not been completed/accepted for this task. BDD22 does not claim BDD21 completion.
- BDD18 wire-frame validation remains passing and is preserved by the focused Logux tests; this does not remove the BDD20/BDD21 limitations.

## Remaining risks / intentionally deferred items

1. The broad BDD22 feature has undefined steps and is a hard blocker.
2. Logux adapters retain callback-owned settlement guards and direct settlement calls; they need a follow-up reducer-effect adapter refactor before the broad authority claim can pass.
3. `update-secret.ts` is not wired through the shared Logux state-machine/effect pattern.
4. Full, post-change aggregate and artifact verification has not yet been run.
5. No live Voiceflow, XYOps, SSE, or Logux service was contacted; tests use deterministic adapters and fixtures.

**Completion decision:** [ ] Complete  [x] Not complete

> BDD22 is NOT COMPLETE. BDD20 and BDD21 remain incomplete as stated above; neither dependency is claimed complete.
