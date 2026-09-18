# BDD26 completion checklist

Feature: **Preserve useful Voiceflow failure diagnostics without exposing secrets**

This checklist is the completion gate for BDD26. Do not mark it complete while any item is unchecked, unverified, or supported only by a source-pattern search.

## Scenario acceptance

- [x] Preserve canonical diagnostic identity across every boundary
- [x] Sanitize backend failures at the Voiceflow source boundary
- [x] Redact structured diagnostic DTOs before serialization
- [x] Present a safe actionable failure without opaque stage-only output
- [x] Translate layer-specific failures through one canonical diagnostic taxonomy
- [x] Complete the opaque-error remediation

## Implementation and boundary review

- [x] The behavior is implemented in the owning module, without speculative scope expansion.
- [x] External inputs are treated as `unknown`/untrusted at the boundary.
- [x] Public types, nullability, expected failures, and side effects are explicit.
- [x] Business policy is separate from transport, persistence, parsing, and orchestration.
- [x] Existing valid behavior and compatibility contracts are preserved.
- [x] Malformed, missing, null, empty, duplicate, oversized, unauthorized, delayed, and dependency-failure cases are handled where applicable.
- [x] No secrets, credentials, raw payloads, or stack traces are exposed in diagnostics or tests.

## Verification evidence

- [x] Focused behavioral tests pass.
- [x] Focused BDD scenarios pass: **6 scenarios, 57 steps**.
- [x] Regression/unit test suite passes: **226 tests**.
- [x] Aggregate BDD suite passes: BDD18/19/20/21/22/23/25/26.
- [x] Typecheck passes.
- [x] Lint/format checks pass.
- [x] Relevant build or artifact verification passes.
- [x] Repository search/audit reviewed the canonical diagnostic modules, plugin and CLI boundaries, transport/core consumers, compatibility paths, redaction policy, cause-chain bounds, and related tests; no obsolete BDD26 implementation or duplicate canonical contract remains. Legacy string diagnostics are retained only in existing workflow/state-machine compatibility paths and are outside this structured diagnostic boundary.
- [x] Tests verify observable behavior and contracts, not only implementation text or regex matches.

## Completion record

Implementation files:
- `xyops/diagnostics/create.ts`
- `xyops/cli/diagnostics.ts`
- `bdd/26-diagnostic-transparency-and-canonical-errors/steps.js`
- `package.json`

Test files:
- `bdd/26-diagnostic-transparency-and-canonical-errors/feature.feature`
- `bdd/26-diagnostic-transparency-and-canonical-errors/steps.js`
- `tests/vf_error_diagnostics.test.ts`
- Related plugin, CLI, streaming, and runtime-boundary tests.

Commands run:
- `bun test tests/vf_error_diagnostics.test.ts`
- `bun test tests/xyops_event_plugin.test.ts tests/migration_cli_xyops.test.ts`
- `bun test tests/xyops_streaming.test.ts tests/vf_logux_state_machine.test.ts`
- `bun test` — PASS, 226 tests
- `bun run bdd:18`, `bdd:19`, `bdd:20`, `bdd:21`, `bdd:22`, `bdd:23`, `bdd:25`, `bdd:26` — PASS
- `bun run bdd` — PASS
- `bun run typecheck` — PASS
- `bun run lint` — PASS
- `bun run verify:cli` — PASS

Evidence reviewed:
- Canonical cause identity is preserved through core, plugin, CLI, and serialized output.
- Nested objects, arrays, maps, sensitive keys, Zod-related values, and unknown errors are redacted or bounded without mutating source values.
- Cause chains are bounded to 32 entries.
- CLI diagnostic serialization applies structural redaction before output.
- Confirmed failures and unknown outcomes remain distinct.
- BDD24 is archived and intentionally excluded from the aggregate because it has no registered executable suite; the aggregate claim is explicitly BDD18/19/20/21/22/23/25/26.

Known risks or intentionally deferred items:
- Unknown third-party exception text is intentionally represented by a bounded classification rather than preserved verbatim.
- Generic redaction policy remains conservative for unrecognized values.
- Legacy workflow/state-machine string diagnostics remain compatibility paths outside BDD26's structured diagnostic contract.

**Completion decision:** [x] Complete  [ ] Not complete

> A passing command is not sufficient if the command does not exercise the acceptance criteria. Any unchecked item means the BDD is not complete.
