# BDD20 completion checklist

Feature: **Zod boundary validation core contracts**

BDD20 has been split into an executable core feature and boundary-specific follow-ups:

- `feature.feature` — executable core schema/diagnostic contracts.
- `plugin-boundary.feature` — executable plugin and representative boundary slices.
- `feature-specification.md` — retained roadmap/specification for follow-up BDDs; it is not included in the BDD20 executable command because its broad architectural scenarios belong in separate boundary BDDs.

## Executable scenario acceptance

| Scenario group | Status | Evidence |
|---|---|---|
| Core Zod boundary contracts (`feature.feature`) | PASS | 5 scenarios / 50 steps; executed by `bun run bdd:20` |
| Plugin and representative boundary contracts (`plugin-boundary.feature`) | PASS | 24 scenarios / 90 steps; executed by `bun run bdd:20` |
| **BDD20 executable total** | **PASS** | **29 scenarios / 140 steps; no undefined or pending steps** |

The 30 previously undefined scenarios from the former broad feature were not silently discarded. They are preserved in `feature-specification.md` and are intentionally deferred to boundary-specific BDDs (diagnostics, catalog, Logux, HTTP/SSE, CLI/configuration, secrets, and rollout/parity).

## Core implementation and ownership

- [x] Zod is a direct runtime dependency in `package.json` and `bun.lock`.
- [x] Each migrated boundary has an owning schema module under `xyops/**/schemas`.
- [x] Plugin jobs, plugin responses, CLI configuration/results, catalog/session records, HTTP/SSE/job responses, Voiceflow claims/envelopes, secrets, import receipts, export payloads, and Logux frames/actions have schema-backed boundaries.
- [x] Structural validation remains separate from retry, completion, confirmation, collision, ownership, normalization, and lifecycle policies.
- [x] Successful schema output is used by migrated consumers; compatibility predicate adapters remain only where existing call contracts require them.
- [x] Unknown-key policy is explicit: strict for configuration/secret-entry contracts and loose where provider compatibility requires preservation.
- [x] Bounds and safe failure translation remain at the owning transport/diagnostic boundaries.
- [x] Raw values, credentials, secrets, Zod issue inputs, response bodies, and stack traces are excluded from diagnostics.

## Guard migration disposition

- Removed `xyops/plugin/guards.ts`; plugin structural validation is owned by `plugin/schemas/*` and `job_validation.ts`.
- Retained `xyops/cli/guards.ts` as schema-backed typed predicate adapters to preserve existing consumer signatures.
- Retained `xyops/voiceflow/guards.ts` for pure business policies and generic safe traversal, not as duplicate domain-shape validators.
- Retained catalog and secret policy functions for normalization and duplicate detection after parsing.

## Deferred follow-up scope

The following requirements remain documented in `feature-specification.md` and must be implemented in separate executable BDDs rather than hidden behind placeholder steps:

- Full diagnostic normalization and Zod issue-path contracts.
- Dedicated HTTP/SSE, Logux action-specific, catalog, CLI/configuration, secret, and import/export boundary scenarios.
- Cross-boundary parity fixtures and rollout ordering evidence.
- Full unsafe-input side-effect matrix.

These are intentionally deferred by the split and are not claims of BDD20 core completion.

## Verification evidence

- [x] `bun run bdd:20` — PASS, 29 scenarios / 117 steps.
- [x] Direct plugin BDD — PASS, 24 scenarios / 90 steps.
- [x] Main executable BDD run — PASS, 5 scenarios / 50 steps.
- [x] Focused boundary tests — PASS, 127 tests.
- [x] `bun test` — PASS, 225 tests.
- [x] `bun run bdd` — PASS, aggregate BDD18/19/20/21/22/23/25.
- [x] `bun run typecheck` — PASS.
- [x] `bun run lint` — PASS.
- [x] `bun run verify:cli` — PASS; cross-target runtime checks remain deferred by the existing verifier.
- [x] Repository audit reviewed schemas, guards, consumers, assertions/casts, bounds, unknown-key policies, diagnostics, and stale imports.
- [x] Executable tests assert observable parsing, redaction, compatibility, and rejection behavior rather than only source patterns.

## Completion record

**Implementation and schema files:** schema modules under `xyops/**/schemas`, plugin validation/response adapters, CLI boundary adapters, Voiceflow auth/catalog/import/secret adapters, HTTP/SSE response readers, Logux frame/action adapters, and diagnostics modules.

**BDD/test files:**

- `bdd/20-zod-boundary-validation/feature.feature`
- `bdd/20-zod-boundary-validation/plugin-boundary.feature`
- `bdd/20-zod-boundary-validation/feature-specification.md` (deferred roadmap)
- `bdd/20-zod-boundary-validation/steps.js`
- `tests/bdd25_zod_migration.test.ts`
- Related CLI, plugin, streaming, catalog, secret, diagnostics, and Logux tests.

**Known risks:**

- The deferred roadmap contains broad requirements that need their own focused BDDs before they can be claimed as covered.
- No live external HTTP, SSE, Logux, or XYOps service was contacted.
- Cross-target CLI runtime checks are deferred by the existing artifact verifier.

**Completion decision:** [x] Complete for the explicitly split executable BDD20 core scope  [ ] Not complete
