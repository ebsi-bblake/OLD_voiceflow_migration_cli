# Phase 3 — Streaming verification

### P3-01 — Add isolated SSE parser tests

```text
[####################] 100% COMPLETE
```

- [x] Test start/update/end parsing.
- [x] Test chunk boundaries splitting lines and UTF-8 characters.
- [x] Test comments, blank lines, multiple data lines, and unknown fields.
- [x] Test malformed JSON, oversized input, and premature EOF.

### P3-02 — Add terminal success/failure tests

```text
[####################] 100% COMPLETE
```

- [x] Test successful terminal `data.voiceflow` extraction.
- [x] Test failed terminal code/description extraction.
- [x] Test outer code `0` with failed job code.
- [x] Test missing success envelope and fallback to `get_job`.
- [x] Test `get_job` output/data variants.

### P3-03 — Add client lifecycle tests

```text
[####################] 100% COMPLETE
```

- [x] Assert one execute dispatch.
- [x] Assert one stream request.
- [x] Assert one normal-path result and no unnecessary polling.
- [x] Assert exactly one fallback `get_job` when required.
- [x] Assert no redispatch after stream failure.
- [x] Test timeout, HTTP error, disconnect, terminal failure, and success.

**Files:** `tests/migration_cli_xyops.test.ts` and focused streaming tests.

### P3-04 — Run full verification

```text
[####################] 100% COMPLETE
```

- [x] Run focused streaming tests.
- [x] Run `bun run check`.
- [x] Run `git diff --check`.
- [x] Review changed boundaries and diagnostics for accidental secret exposure.

---

## Phase explanation

See [the Phase 3 explanation](../refactor-plan/phase-3.md).
