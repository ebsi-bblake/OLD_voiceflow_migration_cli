> Tracker: [Phase 2 checklist](../refactor-todo/phase-2.md)

# Phase 2 — Replace execute polling with streaming

**Files:**

- `xyops/cli/client/index.ts`
- `xyops/cli/client/streaming.ts`
- `xyops/cli/client/job-response.ts`
- `xyops/cli/client/polling.ts`
- `xyops/cli/config.ts`

Change only asynchronous `executeEvent` first:

```text
run_event
  -> validate launch ID
  -> stream_job until terminal event
  -> get_job exactly once
  -> require successful job
  -> parse Voiceflow envelope
```

Keep the existing `/run_event/v1/wait` behavior for read-only operations until
SSE parity is proven. Do not dispatch execute twice if the stream connection
fails; an execute result may already exist.

Preserve these semantics:

- transport failure after execute launch maps to `execute-outcome-unknown`;
- terminal job failure is distinguishable from transport failure;
- final output is parsed only after completion;
- secrets are never included in diagnostics;
- one execute dispatch occurs per CLI invocation.
