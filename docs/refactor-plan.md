Here is the authoritative frozen checklist and explicit list of non-goals for reaching production readiness:

---

### Authoritative Implementation & Verification Checklist

| Requirement | BDD Feature | Implementation Files | Unit / Integration Tests | Verification Command |
| :--- | :--- | :--- | :--- | :--- |
| **Single-Source Zod Migration**: Eliminate dual-track validation ("wooden latch" manual guards and `Object.keys()` loops). Replace custom predicate wrappers with direct Zod schema parsing and type inference. | **BDD25** | • `xyops/cli/config.ts`<br>• `xyops/cli/guards.ts`<br>• `xyops/cli/schemas/*`<br>• `xyops/plugin/job_validation.ts`<br>• `xyops/voiceflow/catalog/record-parsers.ts`<br>• `xyops/voiceflow/secrets.ts` | `tests/bdd25_zod_migration.test.ts` | `bun run verify:cli` |
| **Diagnostic Transparency & Structural Redaction**: Stop flattening failures into stage-only strings (`XYOps reported a job failure (${stage})`). Preserve structured failure details end-to-end while enforcing DTO key-redaction at network boundaries. | **BDD26** | • `xyops/cli/client/job-response.ts`<br>• `xyops/cli/diagnostics.ts`<br>• `xyops/plugin/diagnostics.ts`<br>• `xyops/voiceflow/contracts.ts` | `tests/bdd26_diagnostics.test.ts` | `bun run verify:cli` |
| **Reducer-Owned Context & Effect Handler Map**: Eliminate shadow state in closure `let` variables (`auth`, `artifact`, `plan`, `imported`). Pass resolved data into `MigrationWorkflowState` via typed events and replace imperative `if/else` chains with a handler map. | **BDD27** | • `xyops/voiceflow/execute-migration-state-machine.ts`<br>• `xyops/voiceflow/execute_migration/index.ts` | `tests/bdd27_workflow_effects.test.ts` | `bun test` |
| **Logux Transport Consolidation & Event Abstraction**: Unify WebSocket socket lifecycles, connection frames, and heartbeats into a shared runner. Translate low-level socket events into domain events (`service-unavailable`). | **BDD28** / **BDD29** | • `xyops/voiceflow/logux/index.ts`<br>• `xyops/voiceflow/logux/create-folder.ts`<br>• `xyops/voiceflow/logux/create-secret.ts`<br>• `xyops/voiceflow/logux/rename-project.ts`<br>• `xyops/voiceflow/logux/catalog-state-machine.ts` | `tests/bdd28_logux_transport.test.ts`<br>`tests/bdd29_logux_isolation.test.ts` | `bun test` |
| **Repository Baseline & Build Verification**: Ensure production plugin bundles and Node execution paths pass all existing verification benchmarks cleanly. | **Baseline** | • All `xyops/` modules | Repository test suite | `bun run bdd && bun run check && bun run verify:cli` |

---

### Explicit Non-Goals

1. **No Wire-Frame Changes**: Existing Logux tuple formats (`["connect", ...]`, `["sync", ...]`, `["synced", ...]`) and SSE event structures must remain strictly unchanged.
2. **No Parameter Changes**: CLI flags (`--config`, `--debug`), environment variable names (`XYOPS_API_KEY`, `XYOPS_BASE_URL`), and operation payload keys (`SOURCE_WORKSPACE_ID`, `PLAN_ID`) must preserve exact parameter names and types.
3. **No Public Contract Changes**: Exported TypeScript types, REST endpoints (`/api/app/run_event/v1`, `/api/app/get_job/v1`), and public diagnostic error codes must remain backward-compatible.
4. **No Speculative Frameworks**: Do not introduce third-party state machine engines (e.g., XState) or heavy external framework abstractions; rely strictly on native TypeScript discriminated unions, pure reducers, and Zod.
5. **No Unrelated Cleanup**: Avoid cosmetic code formatting or refactoring in modules outside the active migration scope.
 run bdd && bun run check && bun run verify:cli`) to establish the baseline commit before beginning Step 2?
