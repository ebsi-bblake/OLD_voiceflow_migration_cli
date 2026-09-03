# Phase 0 — Baseline and contract inventory

### P0-01 — Run and record the repository baseline

```text
[####################] 100% DONE
```

- [x] Run `bun run check`.
- [x] Confirm lint, typecheck, and tests pass.
- [x] Record the current count: 110 tests passing.

**Evidence:** `bun run check` passed before the refactor work.

### P0-02 — Inventory current client paths

```text
[####################] 100% DONE
```

- [x] Identify `run_event`, `/run_event/v1/wait`, and `get_job` callers.
- [x] Identify `executeEvent`, `pollJob`, `readJobResponse`, and response guards.
- [x] Document the active plugin versus archived Windmill boundary.

**Evidence:** `docs/code-walkthrough.md` and current `xyops/cli/client/` code.

### P0-03 — Capture live successful SSE behavior

```text
[####################] 100% DONE
```

- [x] Run a read-only `list_workspaces` job.
- [x] Capture launch response and job ID.
- [x] Capture `start`, active `update`, terminal `update`, and `end` events.
- [x] Confirm terminal success data is at `data.voiceflow`.
- [x] Confirm `get_job.job.data.voiceflow` mirrors the stream envelope.

**Evidence:** `result-xyops-stream.json` from the successful experiment.

### P0-04 — Capture live failed SSE behavior

```text
[####################] 100% DONE
```

- [x] Run a safe invalid-operation job.
- [x] Confirm terminal failure uses a string job code and description.
- [x] Confirm failed jobs have no `data.voiceflow` envelope.
- [x] Confirm `get_job.job.output` contains the diagnostic.
- [x] Confirm the outer API response code remains `0` while the job fails.

**Evidence:** `result-xyops-stream.json` from the failed experiment.

### P0-05 — Preserve experiment hygiene

```text
[################----]  80% IN PROGRESS
```

- [x] Redact API keys, bearer tokens, and job tokens in the experiment script.
- [x] Keep experiment output ignored and uncommitted.
- [ ] Remove temporary experiment files after the SSE contract is implemented.

**Remaining risk:** inspect whether the current result file contains any
additional server-sensitive metadata before sharing it.

---

## Phase explanation

See [the Phase 0 explanation](../refactor-plan/phase-0.md).
