# Phase 4 — String and URL hardening

### P4-01 — Define field-specific string policies

```text
[####################] 100% COMPLETE
```

- [x] Define policies for workspace, project, version, and folder IDs.
- [x] Define `parseFolderName` separately from `parseFolderID`.
- [x] Define schema-version and operation parsing policies.
- [x] Apply trim, control-character, length, and justified character rules.
- [x] Avoid `String(value)` as a substitute for validation.

### P4-02 — Centralize trusted service URLs

```text
[####################] 100% COMPLETE
```

- [x] Centralize Voiceflow HTTP origins.
- [x] Centralize Voiceflow WebSocket origin.
- [x] Construct encoded path segments exactly once.
- [x] Keep user/configured URLs separate from trusted service URLs.

### P4-03 — Harden configured XYOps URLs

```text
[####################] 100% COMPLETE
```

- [x] Allow only `http:` and `https:`.
- [x] Reject embedded credentials.
- [x] Reject unexpected fragments.
- [x] Preserve safe trailing-slash normalization.
- [x] Add URL tests for invalid schemes and encoded path values.

### P4-04 — Verify strings and URLs

```text
[####################] 100% COMPLETE
```

- [x] Test whitespace, Unicode, slash, backslash, `?`, `#`, `%`, and `..`.
- [x] Test empty, null, numeric, array, and object inputs.
- [x] Test long IDs/names and control characters.
- [x] Run full project checks.

---

## Phase explanation

See [the Phase 4 explanation](../refactor-plan/phase-4.md).
