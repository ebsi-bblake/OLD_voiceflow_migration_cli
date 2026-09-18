# BDD19 completion checklist

Feature: **Centralize migration parameter names without changing the wire contract**

## Scenario acceptance

| Scenario | Status | Canonical owner | Producer / consumer | Behavioral evidence |
|---|---|---|---|---|
| Preserve the exact external parameter keys | PASS | `xyops/migration-parameters.ts` — `MigrationParameterName` | `xyops/cli/state.ts`, `xyops/migration-parameters.ts`, `xyops/plugin/operation_dispatch.ts` | BDD19 contract scenario; `migration_parameter_contract.test.ts` exact payload assertions |
| Use typed constants at parameter boundaries | PASS | `xyops/migration-parameters.ts` types and `MigrationParameterName` | CLI `eventParametersFor`; plugin `requiredParameter` / `optionalParameter`; migration builders | BDD19 type-safety scenario; compile-time `@ts-expect-error` checks and emitted-payload assertions |
| Preserve required and optional parameter behavior | PASS | `xyops/migration-parameters.ts` builders | CLI state construction; plugin dispatch; Voiceflow migration handlers | BDD19 behavior scenario; `migration_parameter_contract.test.ts`, `migration_config.test.ts` |
| Prefer const objects over TypeScript enums for protocol strings | PASS | `xyops/migration-parameters.ts`; `xyops/voiceflow/types.ts` for operations | CLI/plugin adapters consume runtime const objects; no translation layer | BDD19 design scenario; runtime shape and exact serialized payload tests |

## Implementation and boundary review

- [x] The behavior is implemented in the owning module, without speculative scope expansion. The existing canonical owner is `xyops/migration-parameters.ts`; no additional implementation change was necessary.
- [x] External parameter values are validated at the plugin boundary from `unknown` with `OperationParameterStringSchema`; malformed and missing required values become `INVALID_ARGUMENT`.
- [x] Public types, optionality, expected failures, and serialization boundaries are explicit in `migration-parameters.ts`, CLI state, and plugin dispatch.
- [x] Parameter construction, validation, serialization, and Voiceflow business behavior remain separate.
- [x] Existing wire compatibility is preserved: emitted keys remain exactly `PLAN_ID`, `SOURCE_WORKSPACE_ID`, `SOURCE_PROJECT_ID`, `SOURCE_VERSION_ID`, `DESTINATION_WORKSPACE_ID`, `DESTINATION_FOLDER_ID`, `TARGET_SCHEMA_VERSION`, `SECRET_FILE_CONTENTS`, and `CONFIRMED`; values are not normalized by the builders.
- [x] Required, optional, omitted, empty, malformed, unknown, and legacy-alias cases are covered where applicable. Optional `TARGET_SCHEMA_VERSION` and `SECRET_FILE_CONTENTS` are omitted when absent; required blank values and removed aliases are rejected. Oversized/duplicate/unauthorized/delayed/dependency-failure cases are outside this parameter-contract boundary and remain owned by their respective adapters/tests.
- [x] Secret values are passed only as the established secret-array wire value and are not included in diagnostics; related redaction tests pass.

## Verification evidence

- [x] Focused behavioral tests pass.
- [x] Focused BDD scenarios pass: **4 scenarios, 32 steps**.
- [x] Regression/unit test suite passes: **225 tests**.
- [x] Aggregate BDD suite passes: BDD18/19/20/21/22/23/25 all pass.
- [x] Typecheck passes.
- [x] Lint/format checks pass.
- [x] CLI artifact verification passes.
- [x] Repository search/audit reviewed all protocol parameter literals and producer/consumer paths. The only production definitions of the migration parameter wire keys are in `MigrationParameterName`; test/reference literals are retained only as explicit emitted-wire expectations or sanitized diagnostic fixtures.
- [x] Tests verify emitted request/payload behavior, omission semantics, validation, and secret handling rather than only private implementation text or regex matches.

## Completion record

**Implementation files:**

- `xyops/migration-parameters.ts` — canonical parameter constant object, types, validation, and builders.
- `xyops/cli/state.ts` — CLI parameter producers and typed operation payload boundary.
- `xyops/plugin/operation_dispatch.ts` — plugin parameter consumers and boundary validation.
- `xyops/plugin/job_validation.ts` — plugin operation/parameter validation.
- `xyops/voiceflow/types.ts` — canonical `VoiceflowOperation` const object.
- `xyops/voiceflow/contracts.ts` — operation envelope/error compatibility reviewed; unchanged.

**Test files:**

- `bdd/19-migration-parameter-constants/feature.feature`
- `bdd/19-migration-parameter-constants/steps.js`
- `tests/migration_parameter_contract.test.ts`
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`
- `tests/xyops_event_plugin.test.ts`
- Related diagnostics and boundary tests reviewed.

**Commands run and results:**

- `bun run bdd:19` — PASS, 4 scenarios / 32 steps.
- `bun test tests/migration_parameter_contract.test.ts tests/migration_config.test.ts` — PASS, 31 tests.
- `bun test` — PASS, 225 tests.
- `bun run bdd` — PASS, aggregate BDD18/19/20/21/22/23/25.
- `bun run typecheck` — PASS.
- `bun run lint` — PASS.
- `bun run verify:cli` — PASS; existing verifier reports cross-target runtime checks deferred.

**Known risks or intentionally deferred items:**

- `PluginOperation` retains its plugin-schema operation object separately from `VoiceflowOperation`; BDD19 concerns migration parameter names and explicitly preserves `VoiceflowOperation` operation values.
- Test fixtures necessarily repeat wire keys to assert compatibility; no production duplicate parameter definitions were found.
- No live XYOps request was sent; emitted payload compatibility is established through deterministic adapter and contract tests.

**Completion decision:** [x] Complete  [ ] Not complete
