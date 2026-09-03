> Tracker: [Phase 3 checklist](../refactor-todo/phase-3.md)

# Phase 3 — Test the streaming client

**Files:** `tests/migration_cli_xyops.test.ts` and focused streaming tests.

Test the observable contract:

- start/update/end sequence;
- progress updates ignored safely;
- terminal success followed by one `get_job`;
- terminal failure;
- stream EOF before end;
- malformed event data;
- keep-alive/comment lines;
- HTTP non-2xx stream response;
- timeout/abort;
- stream failure after launch does not redispatch execute;
- final `output` and `data` variants still parse exactly as before;
- API key is sent without appearing in request bodies or diagnostics.

Run the existing full check after focused tests.

###
