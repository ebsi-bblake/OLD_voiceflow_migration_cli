# BDD21 completion checklist

Feature: **Preserve structured Voiceflow migration errors and redact them structurally**

## Scenario acceptance

| Feature scenario | Status | Behavioral evidence |
|---|---|---|
| Use one canonical diagnostic contract across all layers | PASS | Broad BDD; `Diagnostic` is owned by `xyops/diagnostics/types.ts` and translations retain fields |
| Preserve existing public failure identifiers with added structure (6 examples) | PASS | Broad BDD outline; CLI serialization preserves each identifier and structured diagnostic |
| Preserve a structured cause chain through every boundary | PASS | Broad BDD; core → plugin → CLI causes remain ordered |
| Redact structured diagnostic DTOs before serialization | PASS | Broad BDD and `vf_error_diagnostics.test.ts`; structured output is inspected before JSON serialization |
| Redact nested and collection values safely | PASS | Broad BDD; nested objects, arrays, and `Map` values are bounded and redacted |
| Handle an unstructured or malformed failure payload | PASS | Broad BDD; `createUnexpectedDiagnostic` produces bounded generic structure |
| Sanitize backend failures at the core source boundary | PASS | Broad BDD and import/export/HTTP tests; unsafe detail is not retained |
| Keep plugin diagnostics structured | PASS | Broad BDD and `xyops_event_plugin.test.ts`; DTO remains queryable before compatibility text |
| Translate errors without destroying identity | PASS | Broad BDD and `vf_error_diagnostics.test.ts`; causes append without replacing root code |
| Preserve unexpected failures as safe structured causes | PASS | Broad BDD; exception text and stack are omitted |
| Provide safe actionable guidance (7 examples) | PASS | Broad BDD outline and `next_action.ts` policy |
| Preserve the execute unknown-outcome safety barrier | PASS | Broad BDD plus migration/streaming/runtime cleanup tests |
| Distinguish unknown import outcome from confirmed import failure | PASS | Broad BDD plus import and outcome tests |
| Keep explicit validated rejection distinct from uncertainty | PASS | Broad BDD plus migration outcome tests |
| Complete the diagnostic refactor without opacity regressions | PASS | Broad BDD acceptance scenario |

Focused executable feature: **15 scenarios / 48 steps — PASS**.
Broad feature: **27 scenarios / 231 steps — PASS** (including outline expansions).
No undefined or pending steps remain in either BDD21 feature.

## Canonical ownership and boundary map

- `xyops/diagnostics/types.ts` owns the single `Diagnostic`, `DiagnosticCause`, domain, and safe-context contract.
- `xyops/diagnostics/create.ts` owns construction, next-action selection, cause translation, field/cause bounds, and non-mutating normalization.
- `xyops/diagnostics/redact.ts` owns recursive structural redaction for objects, arrays, and maps, including depth, key, item, and string bounds.
- `xyops/diagnostics/outcome.ts` owns before-dispatch, confirmed-rejection, and unknown-outcome classification.
- `xyops/voiceflow/contracts.ts` translates core `OperationFault`/unknown errors while preserving public codes and safe messages.
- `xyops/plugin/diagnostics.ts` appends plugin boundary causes and provides the bounded legacy stderr compatibility formatter.
- `xyops/plugin/wire_protocol.ts` retains structured diagnostics in the Voiceflow failure envelope while preserving protocol identifiers.
- `xyops/cli/diagnostics.ts` owns CLI compatibility output and carries the canonical diagnostic object.
- HTTP, SSE, Logux, import/export, and migration state machines classify uncertainty before translation; they do not reinterpret it as a confirmed failure.

## Security and compatibility audit

- [x] Sensitive aliases are structurally redacted at every supported nesting level: tokens, authorization, cookies, API keys, credentials, secrets, passwords, defaults, payloads, response bodies, file contents, stack, and input values.
- [x] Unknown values and `Error` objects are not serialized as raw diagnostic context.
- [x] Diagnostic context, causes, fields, and strings are bounded; cause chains are capped at 32 entries.
- [x] Source errors and caller-owned contexts are not mutated.
- [x] Zod issue input and arbitrary response payloads do not cross the diagnostic boundary as raw values.
- [x] Public codes and legacy CLI/plugin identifiers remain available; unknown execute/import outcomes remain distinct from confirmed rejection.
- [x] Safe operational context such as IDs, endpoint, status, domain, stage, and nextAction remains available where permitted.
- [x] No live credentials, response bodies, exported data, or stack traces are used as test output.

## Verification evidence

- [x] `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/21-diagnostic-contract-and-redaction/executable.feature' --import 'bdd/21-diagnostic-contract-and-redaction/steps.js'` — PASS, 15 scenarios / 48 steps.
- [x] `bun node_modules/@cucumber/cucumber/bin/cucumber-js 'bdd/21-diagnostic-contract-and-redaction/feature.feature' --import 'bdd/21-diagnostic-contract-and-redaction/steps.js'` — PASS, 27 scenarios / 231 steps.
- [x] `bun test tests/vf_error_diagnostics.test.ts` — PASS, 6 tests.
- [x] Related boundary tests — PASS.
- [x] Full `bun test` — PASS, 225 tests.
- [x] `bun run bdd` — PASS, aggregate BDD18/19/20/21/22/23/25.
- [x] `bun run typecheck` — PASS.
- [x] `bun run lint` — PASS.
- [x] `bun run verify:cli` — PASS; cross-target runtime checks remain deferred by the existing verifier.
- [x] Tests exercise serialized behavior and structured DTOs, not only source patterns.

## Remaining risks and intentionally deferred items

- No live external Voiceflow, XYOps, HTTP, SSE, or Logux service was contacted; integration behavior is covered with deterministic boundary fixtures.
- Compatibility formatter output remains a string by contract, but structured identity is retained in the response/error DTO before formatting.
- Cross-target CLI runtime checks remain limited by the existing artifact verifier.
- **BDD20 remains NOT COMPLETE**: its original main feature still has 30 undefined scenarios / 311 undefined steps. BDD21 does not change or hide that blocker.

**Completion decision:** [x] COMPLETE  [ ] NOT COMPLETE — BDD21 scenarios and required verification are complete.
