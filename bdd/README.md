# BDD completion workflow

This directory contains one `checklist.md` per numbered BDD feature. The checklist is a release gate, not a progress note.

## Required workflow

1. Read the BDD feature and its checklist before changing code.
2. Inventory the relevant source boundaries, contracts, tests, fixtures, and existing implementations.
3. Implement the smallest change that satisfies the scenarios.
4. Add or update behavioral tests for valid, malformed, missing, null, empty, duplicate, oversized, unknown, and failure cases where applicable.
5. Run the focused tests and BDD feature first.
6. Run the aggregate BDD suite, full tests, typecheck, lint, and relevant build/artifact checks.
7. Perform a repository search/audit for obsolete guards, duplicate schemas, compatibility wrappers, dead code, unchecked assertions, secret leakage, and untested boundaries.
8. Update only the evidence and completion record in the checklist.
9. Do not mark the BDD complete until every checkbox is satisfied and reproducible evidence is recorded.

## Agent prompt: implement a BDD

```text
You are implementing BDD<N>. Read bdd/<directory>/feature.feature and bdd/<directory>/checklist.md first.

Treat every scenario and checklist item as a blocking acceptance criterion. Inspect the repository and existing tests before designing the change. Identify the owning boundaries, types, policies, effects, compatibility behavior, and edge cases. Implement the smallest faithful change. Add behavioral tests; do not rely on source regexes as the primary proof.

Run focused tests, the focused BDD feature, aggregate BDDs, the full test suite, typecheck, lint, and relevant build/artifact verification. Audit the repository for stale implementations, duplicate validation, dead code, unchecked assertions, and missing boundary coverage.

Do not claim completion while any checklist item is unchecked, unverified, or only inferred. If blocked, report the exact blocking item and stop rather than weakening the requirement.
```

## Agent prompt: verify a BDD

```text
Audit BDD<N> against its feature and bdd/<directory>/checklist.md. Do not modify code initially.

For every scenario, identify concrete implementation evidence and a behavioral test. Run the focused BDD, focused tests, aggregate BDD suite, full tests, typecheck, lint, and relevant build checks. Search for obsolete implementations, duplicate contracts, bypasses, unsafe diagnostics, and untested boundaries. Treat source-pattern checks as supplemental only.

Return a scenario-by-scenario PASS, FAIL, or UNVERIFIED result with file and command evidence. BDD<N> is complete only if every item passes. Do not report green based solely on compilation or a superficial test.
```

## Agent prompt: close remaining gaps

```text
Continue BDD<N> from its checklist. Reproduce every unchecked, failed, or weakly evidenced item before changing code. Prefer replacing structural guard duplication with the owning schema, removing obsolete consumers, and adding runtime contract tests where the checklist requires it. Preserve business policies and compatibility behavior.

Repeat the complete verification workflow after each coherent change. Stop only when every checklist item has concrete evidence. Do not reinterpret, delete, or weaken an acceptance criterion to obtain a passing result.
```

## Evidence standard

- **PASS** means the behavior is exercised and the result is observed.
- **FAIL** means the implementation or verification contradicts the criterion.
- **UNVERIFIED** means the evidence is missing, indirect, source-only, or too narrow.
- A BDD with any `FAIL` or `UNVERIFIED` item is **not complete**.
