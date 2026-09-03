# Phase 2 — Replace asynchronous execute polling

### P2-01 — Add stream strategy to the client boundary

```text
[####################] 100% COMPLETE
```

- [x] Add a typed streaming dependency to `createXYOpsClient`.
- [x] Keep request/fetch dependencies injectable for tests.
- [x] Avoid coupling the client to Voiceflow operation internals.

**Files:** `xyops/cli/client/index.ts`, `types.ts`.

### P2-02 — Implement streamed `executeEvent`

```text
[####################] 100% COMPLETE
```

- [x] Dispatch `/api/app/run_event/v1` exactly once.
- [x] Validate the returned launch ID.
- [x] Stream `/api/app/stream_job/v1?id=...`.
- [x] Wait for terminal update/end.
- [x] Return the successful Voiceflow envelope from terminal stream data.
- [x] Preserve a final `get_job` fallback only when terminal data is absent or invalid.

**Files:** `xyops/cli/client/index.ts`, `streaming.ts`, `job-response.ts`.

### P2-03 — Preserve failure and unknown-outcome semantics

```text
[####################] 100% COMPLETE
```

- [x] Map terminal job failure to the existing CLI error contract.
- [x] Map post-launch transport failure to `execute-outcome-unknown`.
- [x] Never redispatch execute after stream failure.
- [x] Preserve final job inspection as the operator recovery path.
- [x] Keep raw output and descriptions out of unsafe diagnostics.

**Files:** `index.ts`, `diagnostics.ts`, `job-response.ts`.

### P2-04 — Keep read-only `/wait` behavior unchanged initially

```text
[####################] 100% COMPLETE
```

- [x] Do not change `readEvent` in the first streaming implementation.
- [x] Confirm all read-only CLI flows remain green.
- [x] Decide later whether read-only jobs should also use SSE.

**Files:** `xyops/cli/client/index.ts`, `polling.ts`.

---

## Phase explanation

See [the Phase 2 explanation](../refactor-plan/phase-2.md).
