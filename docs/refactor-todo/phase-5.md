# Phase 5 — Enumerate finite domain values

### P5-01 — Define finite-value enums

```text
[####################] 100% COMPLETE
```

- [x] Convert supported operation identifiers to string-backed enums or the
      repository-approved equivalent.
- [x] Convert Voiceflow error and warning codes.
- [x] Convert SSE event names.
- [x] Convert job states and plugin stages.
- [x] Convert stable CLI diagnostic codes.
- [x] Preserve exact existing serialized values.

### P5-02 — Add runtime narrowing and exhaustive checks

```text
[####################] 100% COMPLETE
```

- [x] Reject unknown operation values at the plugin boundary.
- [x] Narrow unknown SSE event names before dispatch.
- [x] Ensure operation dispatch is exhaustive at build time.
- [x] Ensure error/status mapping is exhaustive at build time.
- [x] Add unknown-value tests.

### P5-03 — Keep free-form strings as validated strings

```text
[####################] 100% COMPLETE
```

- [x] Do not enum IDs, labels, folder names, URLs, credentials, or diagnostics.
- [x] Confirm branded IDs are not introduced until accepted formats are known.
- [x] Review serialization and Windmill compatibility.

### P5-04 — Run enum compatibility verification

```text
[####################] 100% COMPLETE
```

- [x] Test JSON serialization of every enum.
- [x] Test all supported operations.
- [x] Test every error/warning code.
- [x] Run full project checks.

---

## Phase explanation

See [the Phase 5 explanation](../refactor-plan/phase-5.md).
