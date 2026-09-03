> Tracker: [Phase 5 checklist](../refactor-todo/phase-5.md)

# Phase 5 — Enumerate finite domain values

Convert finite, serialized values to string-backed enums or a consistent
repository-approved enum representation. Do not turn arbitrary strings into
enums.

Candidates:

- supported operation identifiers;
- Voiceflow error codes;
- warning codes;
- SSE event names (`start`, `update`, `end`);
- job states (`active`, `complete`);
- plugin stages (`input`, `secret`, `dispatch`, `response`);
- stable CLI diagnostic codes;
- known protocol status categories.

Keep these as validated strings instead:

- workspace, project, version, and folder IDs;
- folder names and labels;
- URLs and URL path segments;
- JWTs, API keys, secret values, and other credentials;
- server-provided descriptions and free-form diagnostics.

At every untrusted boundary, add a runtime guard that narrows `unknown` to the
enum before dispatch. At internal boundaries, use the enum type so impossible
operation/event/code values fail at build time. Confirm that serialization stays
wire-compatible: enum values must remain the existing snake_case operation IDs,
existing error codes, and existing SSE spellings.

Add compile-time and runtime tests for:

- exhaustive operation dispatch;
- unknown operation rejection;
- every error and warning code;
- every SSE event type;
- unknown job state/event rejection or safe ignoring, according to policy;
- JSON serialization preserving exact wire values.

This phase should follow SSE type modeling and string/URL policy work, because
those boundaries establish where unknown values become trusted domain values.
