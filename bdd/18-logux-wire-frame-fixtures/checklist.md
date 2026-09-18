# BDD18 completion checklist

Feature: **Logux wire-frame contract**

## Scenario acceptance

| Scenario | Status | Implementation | Behavioral evidence |
|---|---|---|---|
| Parse a sanitized subscription frame | PASS | `xyops/voiceflow/logux/frame-contract.ts`, `schemas/frame.ts` | `bdd/18-logux-wire-frame-fixtures/feature.feature`; `tests/vf_logux_state_machine.test.ts` |
| Reject malformed input | PASS | `frame-contract.ts`, `schemas/frame.ts` | Focused BDD malformed scenario; parser regression test |
| Preserve connection frame semantics | PASS | `frame-contract.ts`, `schemas/frame.ts` | Focused BDD fixture scenario |
| Preserve the connected response shape | PASS | `frame-contract.ts`, `schemas/frame.ts` | Focused BDD fixture scenario |
| Preserve the rename subscription cursor policy | PASS | `frame-contract.ts`, `rename-project.ts` | Focused BDD fixture scenario; rename state tests |
| Preserve folder completion frames | PASS | `frame-contract.ts`, `create-folder.ts`, `folder-state-machine.ts` | Focused BDD fixture scenario; folder state tests |
| Preserve catalog replacement frames | PASS | `frame-contract.ts`, `catalog-frames.ts`, `connection.ts` | Focused BDD fixture scenario; catalog projection/state tests |
| Preserve bounded error frames | PASS | `schemas/frame.ts`, `catalog-frames.ts` | Focused BDD fixture scenario; bounded-code parser regression test |
| Ignore heartbeat frames as domain actions | PASS | `frame-contract.ts`, `connection.ts`, `catalog-frames.ts` | Focused BDD ping/pong scenarios; heartbeat catalog normalization test |
| Reject a secret failure without action correlation | PASS | `frame-contract.ts`, `create-secret.ts` | Focused BDD fixture scenario; secret correlation test |
| Reject a completion without assistant correlation | PASS | `frame-contract.ts`, `create-secret.ts` | Focused BDD fixture scenario; completion correlation test |
| Reject a catalog frame with invalid values | PASS | `catalog-frames.ts`, `connection.ts` | Focused BDD fixture scenario; catalog boundary tests |
| Normalize a correlated secret failure without leaking payload data | PASS | `frame-contract.ts`, `create-secret.ts`, diagnostics | Focused BDD scenario; `tests/vf_logux_state_machine.test.ts`, `tests/vf_error_diagnostics.test.ts` |
| Accept completion only for both correlations | PASS | `frame-contract.ts`, `create-secret.ts`, `state-machine.ts` | Focused BDD scenario; secret state/correlation tests |

## Implementation and boundary review

- [x] The behavior is implemented in the owning Logux modules, without speculative scope expansion.
- [x] External inputs are parsed as `unknown` through the shared Zod frame boundary before adapter dispatch.
- [x] Public types, nullable fields, expected failures, and side effects are explicit at changed boundaries.
- [x] Business policy remains separate from transport parsing and diagnostics.
- [x] Existing valid behavior and compatibility contracts are preserved; operation-specific cursor policy remains in the operation adapter.
- [x] Malformed, missing, null, empty, duplicate, oversized, unauthorized, delayed, and dependency-failure cases are handled where applicable by the frame boundary, state machines, bounded transport, and catalog/secret tests.
- [x] No secrets, credentials, raw payloads, or stack traces are exposed in diagnostics or tests; secret traces retain only allowlisted summaries.

## Verification evidence

- [x] Focused behavioral tests pass.
- [x] Focused BDD scenarios pass: **14 scenarios, 68 steps**.
- [x] Regression/unit test suite passes: **225 tests**.
- [x] Aggregate BDD suite passes: BDD18/19/20/21/22/23/25 all pass.
- [x] Typecheck passes.
- [x] Lint/format checks pass.
- [x] CLI artifact verification passes.
- [x] Repository search/audit reviewed shared frame parsing, adapters, schemas, reducers, diagnostics, and related tests; duplicate parser implementations were removed from folder and rename adapters.
- [x] Tests verify observable parsing, normalization, correlation, redaction, lifecycle, bounds, and heartbeat behavior rather than source text or regex matches.

## Completion record

**Implementation files:**

- `xyops/voiceflow/logux/schemas/frame.ts`
- `xyops/voiceflow/logux/frame-contract.ts`
- `xyops/voiceflow/logux/connection.ts`
- `xyops/voiceflow/logux/catalog-frames.ts`
- `xyops/voiceflow/logux/create-folder.ts`
- `xyops/voiceflow/logux/rename-project.ts`
- `xyops/voiceflow/logux/update-secret.ts`
- `tests/vf_logux_state_machine.test.ts`

**Test and reference files reviewed:**

- `bdd/18-logux-wire-frame-fixtures/feature.feature`
- `bdd/18-logux-wire-frame-fixtures/protocol.md`
- `bdd/18-logux-wire-frame-fixtures/steps.js`
- `bdd/18-logux-wire-frame-fixtures/fixtures/*.json`
- `tests/xyops_streaming.test.ts`
- `tests/vf_runtime_cleanup.test.ts`
- `tests/vf_secrets.test.ts`
- `tests/vf_catalog_projection.test.ts`
- `tests/vf_error_diagnostics.test.ts`
- `tests/vf_logux_state_machine.test.ts`

**Commands run and results:**

- `bun run bdd:18` — PASS, 14 scenarios / 68 steps.
- `bun test tests/xyops_streaming.test.ts tests/vf_logux_state_machine.test.ts tests/vf_runtime_cleanup.test.ts` — PASS, 32 tests.
- `bun test` — PASS, 225 tests.
- `bun run bdd` — PASS, aggregate BDD18/19/20/21/22/23/25.
- `bun run typecheck` — PASS.
- `bun run lint` — PASS.
- `bun run verify:cli` — PASS; cross-target runtime checks remain intentionally deferred by the existing verifier.

**Known risks or intentionally deferred items:**

- The contract intentionally accepts protocol-specific trailing tuple fields and leaves operation payload validation to consumers, as required by `protocol.md`.
- No live Voiceflow WebSocket was used; transport behavior is covered with deterministic boundary/state tests and sanitized fixtures.
- Cross-target CLI runtime checks are deferred by `scripts/validate-cli-artifacts.ts`; artifact presence and executable checks passed.

**Completion decision:** [x] Complete  [ ] Not complete
