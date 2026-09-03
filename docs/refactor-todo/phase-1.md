# Phase 1 — Model the SSE boundary

### P1-01 — Define transport and launch types

```text
[####################] 100% DONE
```

- [x] Add explicit launch response types.
- [x] Separate outer API response code from job terminal code.
- [x] Represent job ID as a validated non-empty string.
- [x] Add runtime guards for unknown launch responses.

**Files:** `xyops/cli/types.ts`, `xyops/cli/guards.ts`.

### P1-02 — Define SSE event types

```text
[####################] 100% DONE
```

- [x] Define `start`, `update`, and `end` event types.
- [x] Define terminal success and terminal failure as a discriminated union.
- [x] Model unknown update fields without trusting them.
- [x] Keep Voiceflow envelope types out of the generic SSE parser.

**Files:** `xyops/cli/types.ts`, new `xyops/cli/client/streaming.ts`.

### P1-03 — Implement bounded SSE parsing

```text
[####################] 100% DONE
```

- [x] Parse `event:` and `data:` lines.
- [x] Support blank-line event termination.
- [x] Support multiple `data:` lines if the API permits them.
- [x] Ignore comments/keep-alives.
- [x] Reject or safely classify malformed JSON.
- [x] Enforce frame and total byte limits.
- [x] Detect EOF before a terminal event.

**Files:** new `xyops/cli/client/streaming.ts` and focused parser tests.

### P1-04 — Implement stream authentication and timeout

```text
[####################] 100% DONE
```

- [x] Send the existing `X-API-Key` header.
- [x] Send `Accept: text/event-stream`.
- [x] Use `AbortController` and configured timeout.
- [x] Distinguish timeout, network, HTTP, and malformed-stream failures.
- [x] Never put the API key in the stream URL.

**Files:** `xyops/cli/client/http.ts`, `streaming.ts`, `config.ts`.

### P1-05 — Extract terminal result classification

```text
[####################] 100% DONE
```

- [x] Classify terminal `code: 0` as success only when the terminal shape is valid.
- [x] Read successful `data.voiceflow` safely.
- [x] Classify non-zero/string codes as job failure.
- [x] Preserve safe job descriptions without treating them as Voiceflow errors.
- [x] Provide a typed fallback-required result when the envelope is absent.

**Files:** `streaming.ts`, `job-response.ts`, `guards.ts`.

---

## Phase explanation

See [the Phase 1 explanation](../refactor-plan/phase-1.md).
