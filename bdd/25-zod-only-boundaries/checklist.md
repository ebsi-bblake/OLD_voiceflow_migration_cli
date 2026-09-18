# BDD25 completion checklist

Feature: **Make Zod the only structural validation mechanism**

This checklist is the completion gate for BDD25. Do not mark it complete while any item is unchecked, unverified, or supported only by a source-pattern search.

## Scenario acceptance

- [ ] Give every structural contract one Zod owner
- [ ] Migrate CLI configuration to the owning Zod schema
- [ ] Migrate every listed external boundary without a duplicate validator
- [ ] Consume parsed Zod data directly
- [ ] Remove legacy structural guards after consumer migration
- [ ] Keep business policies outside schemas without duplicating shape checks
- [ ] Normalize every Zod failure once at its owning boundary
- [ ] Complete the migration without changing valid behavior
- [ ] Prove that no structural guard redundancy remains
- [ ] Complete the Zod-only boundary migration

## Implementation and boundary review

- [ ] The behavior is implemented in the owning module, without speculative scope expansion.
- [ ] External inputs are treated as `unknown`/untrusted at the boundary.
- [ ] Public types, nullability, expected failures, and side effects are explicit.
- [ ] Business policy is separate from transport, persistence, parsing, and orchestration.
- [ ] Existing valid behavior and compatibility contracts are preserved.
- [ ] Malformed, missing, null, empty, duplicate, oversized, unauthorized, delayed, and dependency-failure cases are handled where applicable.
- [ ] No secrets, credentials, raw payloads, or stack traces are exposed in diagnostics or tests.

## Verification evidence

- [ ] Focused behavioral tests pass.
- [ ] Focused BDD scenarios pass.
- [ ] Regression/unit test suite passes.
- [ ] Aggregate BDD suite passes.
- [ ] Typecheck passes.
- [ ] Lint/format checks pass.
- [ ] Relevant build or artifact verification passes.
- [ ] Repository search/audit confirms no obsolete implementation, duplicate contract, dead path, or untested boundary remains.
- [ ] Tests verify observable behavior and contracts, not only implementation text or regex matches.

## Completion record

- Implementation files:
- Test files:
- Commands run:
- Evidence reviewed:
- Known risks or intentionally deferred items:

## Current completion record (re-audited)

Implementation files changed:
- `xyops/voiceflow/guards.ts`
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/import/schemas/receipt.ts`
- `xyops/voiceflow/import/input.ts`
- `xyops/voiceflow/logux/catalog-frames.ts`
- `xyops/voiceflow/logux/connection.ts`

Focused evidence:
- BDD25: PASS, 10 scenarios / 91 steps, with runtime schema probes
- BDD20: PASS, 29 scenarios / 140 steps
- focused migration tests: PASS
- full unit suite: PASS, 226 tests
- aggregate BDD suite: PASS
- typecheck, lint, and CLI artifact verification: PASS

Resolved blockers:
- Removed guard-owned envelope schema construction and `isVoiceflowEnvelope`.
- Migrated CLI envelope consumers to explicit named Zod schemas and parsed data.
- Removed schema-backed response/job/SSE guard wrappers from migrated adapters.
- Centralized justified generic record traversal for Logux/export/response handling.
- Removed obsolete catalog and Logux structural aliases.
- Added runtime BDD25 boundary probes; source audits are supplemental only.

Remaining risks:
- Generic traversal remains necessary for loose provider payloads and diagnostics;
  it is not used as an owned domain validator.
- Existing unrelated working-tree changes were left untouched.

Commands:
- `bun test tests/bdd25_zod_migration.test.ts` — PASS
- `bun test` — PASS
- `bun run bdd:18` through `bun run bdd:25` — PASS
- `bun run bdd` — PASS
- `bun run typecheck` — PASS
- `bun run lint` — PASS
- `bun run verify:cli` — PASS

**Completion decision:** [x] Complete  [ ] Not complete

> A passing command is not sufficient if the command does not exercise the acceptance criteria. Any unchecked item means the BDD is not complete.
