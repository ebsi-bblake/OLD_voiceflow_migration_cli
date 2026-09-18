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

**Completion decision:** [ ] Complete  [ ] Not complete

> A passing command is not sufficient if the command does not exercise the acceptance criteria. Any unchecked item means the BDD is not complete.
