# BDD24 completion checklist

Feature: **Move an existing destination project to an archive folder**

This checklist is the completion gate for BDD24. Do not mark it complete while any item is unchecked, unverified, or supported only by a source-pattern search.

## Scenario acceptance

- [ ] Move the archived project to an existing archive folder
- [ ] Create the archive folder when it does not exist
- [ ] Keep the archive folder in the destination workspace
- [ ] Stop before migration when archive relocation fails
- [ ] Retry relocation without renaming again

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
