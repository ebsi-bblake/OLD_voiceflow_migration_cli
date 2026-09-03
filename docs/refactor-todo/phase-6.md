# Phase 6 — Version and deployment

### P6-01 — Version each contract-affecting phase

```text
[############--------]  60% BLOCKED ON TARGET DEPLOYMENT
```

- [x] Bump current plugin version to `0.1.8`.
- [x] Update package version, plugin version constant, build banner, and fixtures.
- [x] Decide the next version after SSE behavior is accepted: `0.1.9`.
- [x] Update release notes or migration notes if required: no release-note file exists; this checklist records the release evidence.

**Current evidence:** commit `35a9613` contains the `0.1.8` bump. The SSE boundary was verified against the configured XYOps instance; `0.1.9` is the next plugin version.

### P6-02 — Build and inspect the plugin

```text
[####################] 100% DONE
```

- [x] Run `bun run build:plugin`.
- [x] Verify the bundle contains the intended version.
- [x] Verify snake_case operation IDs are present.
- [x] Verify old hyphenated operation IDs are absent.
- [x] Review bundle diff/noise before deployment: generated `dist/` output is ignored and was not added to the commit.

**Evidence:** `dist/voiceflow-event-plugin.cjs` is a 58.45 KB Node-compatible CJS bundle with banner `v0.1.9`.

### P6-03 — Deploy active XYOps plugin safely

```text
[########------------]  40% BLOCKED ON TARGET DEPLOYMENT
```

- [ ] Keep the previous artifact available for rollback — blocked: the target-server artifact store is not available in this workspace.
- [ ] Deploy read-only plugin operations first — blocked: no XYOps deployment access is available.
- [x] Run live session/catalog smoke tests.
- [x] Test SSE success and failure with read-only jobs (`check_session` and `not-supported`).
- [x] Do not run a real migration without explicit approval; no migration was run.

**Live evidence:** configured XYOps returned successful `check_session` and `list_workspaces` results; direct SSE checks returned `success/0` and `failure/unknown_operation`.

### P6-04 — Maintain archived Windmill parity

```text
[########------------]  40% NOT APPLICABLE / DEPLOYMENT BLOCKED
```

- [x] Update local Windmill sources when shared behavior changes: no shared Windmill behavior changed in this phase.
- [ ] Deploy changed libraries sequentially before dependents — not performed; Windmill is archived and deployment access is unavailable.
- [ ] Deploy public Windmill entrypoints sequentially in documented order — not performed; Windmill is archived and deployment access is unavailable.
- [ ] Verify each script after deployment — blocked by the same deployment boundary.
- [x] Keep Windmill operation IDs aligned with active plugin contracts; local sources retain the snake_case contract.

### P6-05 — Final release verification

```text
[############--------]  60% BLOCKED ON TARGET DEPLOYMENT
```

- [x] Run `bun run check`.
- [x] Run live read-only smoke tests.
- [x] Verify no API keys, JWTs, tokens, or secret values are in artifacts/logs; checks and command output were redacted, and the bundle contains no configured secrets.
- [ ] Confirm rollback artifact and deployment version — blocked until target deployment access is provided.
- [x] Commit the completed local phase separately.

---

## Phase explanation

See [the Phase 6 explanation](../refactor-plan/phase-6.md).
