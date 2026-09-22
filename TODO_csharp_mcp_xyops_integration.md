# TODO: Prepare the Voiceflow Repository for C# MCP/XYOps Integration

## Overall status

**Status:** `[###__]` 0% complete

This file is an execution plan only. It does not authorize deployment, destructive migration execution, or production cutover.

### Status convention

- `[###__]` 0%: not started
- `[###__]` 20%: discovery or prerequisite work underway
- `[###__]` 40%: implementation underway
- `[####_]` 80%: implementation complete; verification remains
- `[#####]` 100%: verified and accepted

## Repository/path clarification

The requested path `~/workspace/empyrean/voiceflow/agent` does not currently exist.

Relevant source currently found:

- `~/workspace/empyrean/voiceflow/xyops/agent/voiceflow-migration.ts`
- `~/workspace/empyrean/voiceflow/xyops/agent/README.md`
- `~/workspace/empyrean/voiceflow-cli/xyops/plugin/entrypoint.ts`
- `~/workspace/empyrean/voiceflow-cli/xyops/plugin/process_entrypoint.ts`
- `~/workspace/empyrean/voiceflow-cli/xyops/plugin/operation_dispatch.ts`
- `~/workspace/empyrean/voiceflow-cli/xyops/plugin/operations.ts`
- `~/workspace/empyrean/voiceflow-cli/xyops/plugin/types.ts`
- `~/workspace/empyrean/voiceflow-cli/xyops/voiceflow/execute_migration.ts` and related execution modules

This plan is intentionally written for the discovered repositories. The authoritative source repository and deployment branch must be confirmed before implementation.

## Known current design

`xyops/agent/voiceflow-migration.ts` exposes a direct agent adapter:

- `plan(input)` delegates to the existing Voiceflow planning boundary.
- `execute(input)` requires `confirmed === true`, claims an injected `ExecutionLedgerStore`, runs the existing migration core, and settles the ledger as `completed`, `failed`, or `unknown`.
- The adapter accepts `secretFileContents` as an optional input.
- The README states that this adapter does not require a CLI, XYOps workflow, or application server.

The CLI/plugin repository separately exposes an XYOps stdin/stdout plugin. Its operation dispatch table currently includes catalog, planning, folder, workflow, and execution operations. The plugin entrypoint writes diagnostics to stderr and responses to stdout.

## Integration objective

Provide a verified, stable machine-to-machine boundary that the C# MCP server can call over the approved transport. The boundary must preserve the existing migration safety model:

```text
plan → explicit confirmation → execute once → reconcile unknown outcome
```

The Node/Voiceflow side owns Voiceflow semantics, secret handling, migration state, and execution idempotency. The C# side must not reproduce those rules or call internal Node modules directly.

## Non-negotiable rules

- [ ] Do not infer XYOps HTTP API endpoints, payloads, auth, lifecycle, retries, or resume semantics.
- [ ] Do not claim that the current stdin/stdout plugin is an HTTP API.
- [ ] Do not expose arbitrary operation dispatch to an internet-facing MCP caller.
- [ ] Do not accept raw shell commands, arbitrary plugin operation names, or arbitrary environment variables from C#.
- [ ] Do not place Voiceflow tokens, project API keys, secret file contents, or credential-bearing payloads in ordinary logs.
- [ ] Do not retry a mutation after an unknown outcome without reconciliation.
- [ ] Preserve the execution ledger and make its durability explicit.
- [ ] Keep the direct agent adapter and standalone plugin behavior working unless an approved breaking change says otherwise.
- [ ] Use runtime validation at all untrusted boundaries.
- [ ] Keep plan and execute as separate operations.

## Repository-backed answers to the initial questions

The initial questions were researched against this repository and the active XYOps client/plugin documentation. These answers are the source-backed baseline for the C# implementation.

- The authoritative active deployment is `voiceflow-cli`, specifically the native XYOps Event Plugin under `voiceflow-cli/xyops/plugin/`. The `voiceflow/xyops/agent` adapter is a direct agent boundary and is useful as a domain contract, but the active deployment documentation identifies the native plugin as the production path. Archived Windmill sources are not active.
- C# should submit and observe XYOps jobs over the documented XYOps REST API, not launch the Node process directly. The active plugin is launched by xySat; its stdin/stdout protocol is internal to the XYOps Event Plugin boundary.
- The active deployment is a custom XYOps Event Plugin registered on an xySat target server. The artifact is built with `bun run build:plugin` and invoked as `node /opt/xyops/voiceflow-event-plugin`.
- The base URL is configured through `XYOPS_BASE_URL`; local documentation defaults it to `http://localhost:5522`. Environment-specific values belong in deployment configuration.
- Job submission uses `POST /api/app/run_event/v1` with an event reference (`title` or `id`) and `params`. Workflow launch adds `input: { data: input }`.
- Synchronous event completion uses `POST /api/app/run_event/v1/wait`. Job status/result retrieval uses `POST /api/app/get_job/v1` with `{ id }`. Streaming observation uses `GET /api/app/stream_job/v1` with SSE.
- XYOps authentication uses the `X-API-Key` header. The API key is secret configuration and must not be committed or logged.
- The existing client uses SSE when configured and falls back to bounded polling. Its documented defaults are a 15-second HTTP timeout, 1-second poll interval, 5-minute poll timeout, 1 MiB stream limit, and 256 KiB frame limit.
- The plugin receives `VOICEFLOW_JWT` through the XYOps Secret Vault binding. It must not be sent by C# as an ordinary parameter. Project secret entries are separate from `VOICEFLOW_JWT`; `secretFileContents` must not be used by C# unless an approved secure transport exists.
- The plugin supports these fixed operations: `check_session`, `list_workspaces`, `list_projects`, `list_versions`, `list_folders`, `create_folder`, `plan_migration`, and `execute_migration`. C# must use an allowlist rather than arbitrary operation dispatch.
- The plugin response is one JSON envelope with numeric success code `0` or a stable string failure code. The Voiceflow result is under `data.voiceflow` and follows the typed success/failure envelope.
- The XYOps launch ID is the job ID. The Voiceflow envelope has a separate `operationID`, and migration planning/execution has a separate `planID`. These identifiers must not be conflated.
- The existing workflow-mode CLI is the reference for long-running execution. The C# integration should preserve the separation between accepted job, observed job, terminal result, and unknown outcome rather than inventing a new synchronous mutation contract.
- The source explicitly says migrations are non-idempotent. A network/HTTP/stream timeout during execute is an unknown outcome and requires destination reconciliation before retry. The existing client maps this to `execute-outcome-unknown`.
- The source does not document a safe generic cancellation or mutation retry API. C# must not add cancellation/retry behavior until an authoritative XYOps endpoint and Voiceflow reconciliation procedure exist.
- The source documents target-server plugin registration, Secret Vault binding, build, rollback, protocol smoke testing, and live-job limitations. Production tenant/resource selection must use the approved controlled test environment during verification; it must not be hardcoded in the plugin.
- Production deployment, credential rotation, and rollback are operational tasks documented by the target-server/plugin procedures. The implementation must preserve an artifact rollback path and avoid changing the active plugin until C# contract tests and live smoke tests pass.

### Remaining verification tasks, not unanswered design questions

- [ ] Verify the configured target-server base URL and Event/Workflow title or ID in each environment.
- [ ] Verify the live xySat registration and Secret Vault binding using the documented safe session test.
- [ ] Verify the C# service's network access and API-key secret provisioning.
- [ ] Verify the final MCP choice between immediate job acceptance and bounded waiting against the product request; either choice must use the documented job lifecycle.

---

# Phase 0 - Source and dependency inventory

**Status:** `[#####]` 100%

## Final findings

- [x] Confirmed source ownership and current revisions: the active XYOps deployment source is the sibling repository `~/workspace/empyrean/voiceflow-cli` on `master` at `09790fe42996b10108e2df46a54fd98681611089` (`09790fe`, `Fix platform-specific CLI release builds`); the direct agent adapter is in this repository at `xyops/agent/voiceflow-migration.ts`, currently `master` at `d95ca8b7a8de3030b9b6317c3413bf7fd720073e` (`d95ca8b`, `Add direct Voiceflow agent adapter`). `voiceflow-cli/README.md` identifies `voiceflow-cli/xyops/plugin` as the active deployment.
- [x] Inventoried the agent adapter's direct imports: `xyops/voiceflow/execute_migration.ts`, `xyops/voiceflow/plan_migration.ts`, `xyops/voiceflow/execution-ledger.ts`, `xyops/voiceflow/contracts.ts`, `xyops/voiceflow/types.ts`, and `xyops/voiceflow/uuid.ts`. The adapter's transitive behavior is the existing Voiceflow planning boundary, migration execution core, canonical envelopes/faults, typed migration contracts, and execution-ledger claim/settlement policy; implementation must reuse those boundaries rather than duplicate them.
- [x] Inventoried the ledger implementations: the core `ExecutionLedgerStore` interface and claim/settle policy are in `xyops/voiceflow/execution-ledger.ts`; tests use in-memory stores; the active workflow path uses `createXYOpsExecutionLedgerStore` in `xyops/voiceflow/xyops-execution-ledger-store.ts`, backed by the XYOps `get_bucket`/`write_bucket_data` APIs and bucket `bmuc1r0bokku4tz9`. The workflow resolves this store from `JOB_BASE_URL` or `XYOPS_BASE_URL` plus `XYOPS_API_KEY`, so the active path is externally persisted across worker restarts subject to XYOps bucket durability. The direct agent adapter remains host-injected and does not select a default store.
- [x] Inventoried the exported agent contract: `PlanVoiceflowMigrationInput` and `ExecuteVoiceflowMigrationInput` in `xyops/agent/voiceflow-migration.ts`; `AgentMigrationSelection`; `VoiceflowMigrationAgentDependencies`; `VoiceflowMigrationAgent`; `Envelope<T>`, `Success<T>`, `Failure`, `OperationError`, `ErrorCode`, `MigrationSelection`, `MigrationPlan`, `ExecuteResult`, and `ImportedReceipt` in `xyops/voiceflow/types.ts` and `contracts.ts`. The relevant error codes are `INVALID_ARGUMENT`, `CONFIGURATION`, `AUTHENTICATION_FAILED`, `VOICEFLOW_LOGIN_REQUIRED`, `NOT_FOUND`, `DEPENDENCY_TIMEOUT`, `DEPENDENCY_FAILURE`, `PLAN_MISMATCH`, `CONFIRMATION_REQUIRED`, `IMPORT_OUTCOME_UNKNOWN`, and `INTERNAL_ERROR`; failures also carry retryability and safe diagnostics.
- [x] Inventoried secret-bearing data flows: `VOICEFLOW_JWT` is read only from the plugin process environment and supplied by the XYOps Secret Vault; it is not an ordinary event parameter. Project secret entries use `SECRET_FILE_CONTENTS`/`ConfigSecret` values and flow into migration secret creation or patching; imported project data and `exportBase64` are sensitive. Auth headers, Voiceflow JWTs, API keys, secret values, cookies, raw HTTP error bodies, exported data, and sensitive diagnostics are explicitly redacted or forbidden from logs/results. The safe external outputs are typed Voiceflow envelopes, plan/execute metadata, imported resource IDs, warnings, stable error codes, retryability, and sanitized diagnostics.
The canonical schemas are the Zod schemas under `voiceflow-cli/xyops/plugin/schemas`, `voiceflow-cli/xyops/cli/schemas`, and `voiceflow-cli/xyops/voiceflow/schemas`; operation names and parameter names are authoritative in `xyops/plugin/operations.ts` and `migration-parameters.ts`. The plugin wire protocol is stdin/stdout and is distinct from the XYOps HTTP client contract.

The active artifact is the CommonJS plugin built by `bun run build:plugin`, launched by xySat with Node. The repository supports Bun typecheck/tests, plugin build, CLI artifact builds, and GitHub release workflows. No dedicated HTTP service entrypoint exists; the C# integration therefore targets XYOps HTTP.

The existing `voiceflow/migration.json` modification predates this work and remains untouched.

- [x] Source/dependency map recorded.
- [x] Secret/data-flow map recorded.
- [x] Operation/result contract map recorded.
- [x] Deployment/runtime map recorded.
- [x] Active versus compatibility APIs identified.
- [x] Runtime-only verification items separated from repository research.

---

# Phase 1 - Research and select the external boundary

**Status:** `[#####]` 100%

## Final boundary decision

- [x] Dedicated Node HTTP service rejected: no active HTTP service entrypoint exists and the active deployment is the native XYOps Event Plugin.
- [x] Direct process invocation rejected: the plugin stdin/stdout protocol is internal to xySat and is not the C# integration contract.
- [x] XYOps job submission selected: the repository already defines REST submission, SSE observation, polling fallback, typed envelopes, and safe unknown-outcome behavior.
- [x] C# will use `X-API-Key`, submit fixed allowlisted operations, keep plan and execute separate, and preserve the existing Voiceflow ledger/reconciliation rules.
- [x] Cancellation and blind mutation retry are excluded because no safe authoritative endpoint or policy is documented.

## Decision gate

- [x] Boundary decision is recorded and implementation may begin.

---

# Phase 2 - Define a versioned machine-to-machine contract

**Status:** `[###__]` 0%

## Plan contract

- [ ] Define operation name and version.
- [ ] Define required token/credential reference behavior without exposing credential values.
- [ ] Define source workspace, source project, source version, destination workspace, destination folder, and target schema version fields.
- [ ] Define exact ID formats and validation rules.
- [ ] Define whether the plan contract accepts only canonical IDs or also names/paths.
- [ ] Define whether plan binds to a tenant, caller, environment, or expiration.
- [ ] Define plan result fields, warnings, labels, and plan ID.
- [ ] Define safe redaction rules for all plan fields.

## Execute contract

- [ ] Define required plan ID and canonical selection fields.
- [ ] Require literal `confirmed: true`.
- [ ] Define secret reference/input transport.
- [ ] Define idempotency key behavior.
- [ ] Define synchronous result versus accepted-job result.
- [ ] Define terminal states: completed, failed, rejected, cancelled, and unknown/reconciliation-required.
- [ ] Define whether execution can be resumed or only reconciled.

## Status contract, if asynchronous

- [ ] Define operation ID and job ID fields.
- [ ] Define state transition values.
- [ ] Define safe progress information.
- [ ] Define result retrieval and expiration.
- [ ] Define cancellation behavior.
- [ ] Define authorization for status lookup.

## Runtime validation

- [ ] Add Zod schemas for every external request and response.
- [ ] Reject unknown or unsafe fields where appropriate.
- [ ] Preserve absent, null, empty, and present values distinctly.
- [ ] Bound string lengths, collection sizes, and diagnostic payloads.
- [ ] Add schema versioning and compatibility behavior.
- [ ] Add redaction tests proving credentials cannot enter ordinary result/log envelopes.

## Deliverables

- [ ] Versioned contract document.
- [ ] TypeScript types.
- [ ] Runtime schemas.
- [ ] Redacted JSON fixtures for success and failure paths.
- [ ] Compatibility/versioning policy.

---

# Phase 3 - Reuse and harden the agent adapter

**Status:** `[###__]` 0%

## Tasks

- [ ] Confirm `createVoiceflowMigrationAgent` is the canonical domain/application boundary.
- [ ] Keep `plan` and `execute` as separate operations.
- [ ] Validate all input at the adapter boundary before calling planning/execution.
- [ ] Confirm selection IDs are checked by the existing planning boundary.
- [ ] Preserve the literal confirmation requirement.
- [ ] Preserve `claimExecutionLedger` behavior.
- [ ] Preserve duplicate-completion behavior.
- [ ] Preserve reconciliation-required behavior for unknown import outcomes.
- [ ] Ensure the ledger implementation is durable in the selected deployment mode.
- [ ] Ensure `settleExecutionLedger` is attempted on every known execution result.
- [ ] Define behavior if ledger claim, execution, or settlement fails.
- [ ] Ensure unexpected exceptions become canonical redacted diagnostics.
- [ ] Confirm no secret values are included in returned envelopes or logs.
- [ ] Add correlation/operation identifiers without using secrets as identifiers.

## Tests

- [ ] Plan success.
- [ ] Plan validation failure.
- [ ] Execute without confirmation.
- [ ] Execute with invalid plan ID.
- [ ] Successful execution.
- [ ] Duplicate already-completed execution.
- [ ] Reconciliation-required execution.
- [ ] Ledger claim failure.
- [ ] Ledger settlement failure.
- [ ] Secret input redaction.
- [ ] Unexpected dependency failure translation.

---

# Phase 4 - Implement the selected host boundary

**Status:** `[###__]` 0%

## If a Node HTTP service is selected

- [ ] Add or reuse a minimal service host; do not add a second server if one already exists.
- [ ] Add versioned plan and execute routes or the approved RPC equivalent.
- [ ] Authenticate and authorize every request.
- [ ] Validate input with the canonical schemas.
- [ ] Resolve token/secret references through an approved host mechanism.
- [ ] Never accept arbitrary shell commands or arbitrary operation names.
- [ ] Implement bounded request body and response limits.
- [ ] Propagate cancellation to Voiceflow requests and execution stages.
- [ ] Return stable error codes and safe descriptions.
- [ ] Add health/readiness behavior that does not reveal credentials or tenant data.
- [ ] Add structured logs with redacted identifiers and correlation IDs.

## If XYOps job submission is selected

- [ ] Add the approved XYOps job/plugin registration or deployment metadata.
- [ ] Define a fixed operation allowlist for plan and execute.
- [ ] Map HTTP job input into the typed agent adapter input.
- [ ] Keep secret values out of ordinary job parameters if XYOps secure references exist.
- [ ] Verify plugin process entrypoint behavior and stdout/stderr separation.
- [ ] Ensure one request maps to one traceable job/execution identity.
- [ ] Define result persistence and retrieval behavior.
- [ ] Define safe polling/streaming behavior for callers.
- [ ] Preserve unknown-outcome and reconciliation states.

## If another boundary is selected

- [ ] Document why the selected mechanism is equivalent or safer.
- [ ] Define all transport, authentication, validation, timeout, retry, and result semantics before implementation.

## Gate

- [ ] No implementation may proceed from guessed endpoints or undocumented wire behavior.

---

# Phase 5 - XYOps/plugin packaging and deployment

**Status:** `[###__]` 0%

- [ ] Confirm plugin version and artifact versioning rules.
- [ ] Confirm runtime target (Node/Bun) required by deployment.
- [ ] Build the approved artifact with the existing build scripts.
- [ ] Validate that required dependencies are included.
- [ ] Validate that stdout contains only the protocol response and stderr contains diagnostics.
- [ ] Validate that process exit codes match the XYOps contract.
- [ ] Validate startup failure, malformed input, and graceful shutdown behavior.
- [ ] Configure approved environment/secret references.
- [ ] Deploy to a non-production XYOps environment.
- [ ] Record deployed artifact hash/version.
- [ ] Confirm rollback to the previous artifact.
- [ ] Confirm the C# service can target each environment without code changes.

## Tests/checks

- [ ] `bun run lint`.
- [ ] `bun run typecheck`.
- [ ] `bun run test`.
- [ ] `bun run build:plugin` if plugin boundary is selected.
- [ ] `bun run verify:cli` if CLI artifacts are involved.
- [ ] Protocol fixture tests.
- [ ] Deployment smoke test.
- [ ] Secret redaction test against logs and artifacts.

---

# Phase 6 - End-to-end plan path

**Status:** `[###__]` 0%

- [ ] Use a controlled test Voiceflow environment.
- [ ] Submit a plan through the exact boundary C# will call.
- [ ] Verify all selection IDs are validated.
- [ ] Verify the plan ID is stable and traceable.
- [ ] Verify no mutation occurs during planning.
- [ ] Verify response shape and error codes against the C# contract.
- [ ] Verify logs contain safe correlation and operation IDs only.
- [ ] Verify a malformed request is rejected before Voiceflow mutation or unnecessary remote calls.
- [ ] Verify an expired/invalid plan is rejected according to the approved policy.
- [ ] Capture a redacted request/response fixture for C# contract tests.

---

# Phase 7 - End-to-end confirmed execution path

**Status:** `[###__]` 0%

- [ ] Use only an approved non-production migration target.
- [ ] Require `confirmed: true` at every applicable boundary.
- [ ] Verify the operation is associated with the plan ID.
- [ ] Verify the ledger claim prevents duplicate execution.
- [ ] Verify export/archive/import/secret behavior through the existing migration core.
- [ ] Verify successful completion settles the ledger as completed.
- [ ] Verify known failure settles the ledger as failed.
- [ ] Verify unknown import outcome settles the ledger as unknown/reconciliation-required.
- [ ] Verify a client timeout does not cause C# or XYOps to blindly submit a second mutation.
- [ ] Verify repeated status retrieval is safe.
- [ ] Verify duplicate execute requests are rejected or return the existing result.
- [ ] Verify result redaction.

---

# Phase 8 - Failure, recovery, and reconciliation verification

**Status:** `[###__]` 0%

- [ ] Voiceflow authentication failure.
- [ ] Voiceflow validation failure.
- [ ] XYOps authentication failure.
- [ ] XYOps unavailable.
- [ ] Job submission response lost after server acceptance.
- [ ] Status polling timeout.
- [ ] Worker/process restart during planning.
- [ ] Worker/process restart during export.
- [ ] Worker/process restart during archive.
- [ ] Worker/process restart during import.
- [ ] Logux acknowledgment delayed or lost.
- [ ] Import result unknown.
- [ ] Ledger unavailable.
- [ ] Duplicate resume/execute request.
- [ ] Cancellation before mutation.
- [ ] Cancellation during mutation.
- [ ] Malformed or oversized external response.

For each case:

- [ ] Define the externally visible status.
- [ ] Define whether retry is safe.
- [ ] Define the reconciliation operation.
- [ ] Define the operator action.
- [ ] Add a deterministic test or controlled probe.
- [ ] Ensure diagnostics do not expose secrets.

---

# Phase 9 - Contract compatibility and release management

**Status:** `[###__]` 0%

- [ ] Add compatibility tests for the standalone plugin operations that remain supported.
- [ ] Add compatibility tests for the direct agent adapter.
- [ ] Add contract fixtures consumed by the C# repository.
- [ ] Define breaking versus non-breaking contract changes.
- [ ] Version the external contract independently from internal TypeScript modules.
- [ ] Add release notes for operation/result/schema changes.
- [ ] Define minimum C# client version for each Node/XYOps contract version.
- [ ] Define deprecation period before removing any existing operation.
- [ ] Keep rollback artifact available.

---

# Phase 10 - Final evidence and production readiness

**Status:** `[###__]` 0%

## Required evidence

- [ ] Source and deployment ownership confirmed.
- [ ] XYOps API behavior verified from authoritative documentation or controlled probe.
- [ ] Contract schemas and fixtures reviewed.
- [ ] Unit tests pass.
- [ ] Typecheck and lint pass.
- [ ] Plugin/build checks pass where applicable.
- [ ] Non-production plan probe passes.
- [ ] Non-production confirmed execution probe passes.
- [ ] Duplicate execution probe passes.
- [ ] Unknown-outcome reconciliation probe passes.
- [ ] Restart/reconnect probe passes.
- [ ] Secret redaction review passes.
- [ ] Observability review passes.
- [ ] Rollback rehearsal passes.
- [ ] C# consumer contract tests pass against the final fixtures.

## Production acceptance criteria

- [ ] The boundary is documented and versioned.
- [ ] Only approved plan/execute/status operations are reachable.
- [ ] Authentication and authorization are enforced.
- [ ] Secret values are never exposed in logs, prompts, ordinary job data, or MCP results.
- [ ] Explicit confirmation is mandatory for mutations.
- [ ] Duplicate mutation submission is prevented or safely reconciled.
- [ ] Unknown outcomes are visible and actionable.
- [ ] The execution ledger is durable and operationally monitored.
- [ ] Rollback and disable procedures are documented.
- [ ] All source-backed design questions have authoritative answers recorded above; only live environment verification remains.
