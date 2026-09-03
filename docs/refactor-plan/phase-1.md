> Tracker: [Phase 1 checklist](../refactor-todo/phase-1.md)

# Phase 1 — Model the SSE boundary

**Files:**

- `xyops/cli/types.ts`
- `xyops/cli/client/streaming.ts` (new)
- `xyops/cli/client/http.ts`
- `xyops/cli/client/index.ts`

Add explicit types for:

```ts
type XYOpsStreamEvent =
  | { type: "start"; data: Record<string, unknown> }
  | { type: "update"; data: Record<string, unknown> }
  | { type: "end"; data: Record<string, unknown> };
```

The actual implementation should narrow unknown event data rather than trust
JSON. Define a typed stream result containing the terminal status and job ID.

Add a small SSE parser that handles:

- `event:` lines;
- `data:` lines;
- blank-line event termination;
- multiple data lines if supported by the server;
- comments/keep-alives;
- EOF before `end`;
- malformed JSON;
- bounded response size;
- abort and network failure.

Do not make this parser know about Voiceflow envelopes.
