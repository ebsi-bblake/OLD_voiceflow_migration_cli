# BDD27 completion checklist

Feature: **Execute reducer effects without shadow state or branching effect logic**

This checklist is the completion gate for BDD27. Do not mark it complete while any item is unchecked, unverified, or supported only by a source-pattern search.

## Scenario acceptance

- [ ] Store effect results in reducer-owned workflow context
- [ ] Keep failed effect results out of shadow state
- [ ] Dispatch effects through a typed handler map
- [ ] Preserve reducer-defined effect ordering
- [ ] Prevent effect results from changing a settled workflow
- [ ] Keep effect handlers dependency-explicit and testable
- [ ] Preserve migration behavior while removing shadow state
- [ ] Verify the runner architecture through observable behavior
- [ ] Complete the authoritative effect runner refactor

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
