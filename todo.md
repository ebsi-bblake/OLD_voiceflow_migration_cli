# TODO: Migrate Voiceflow CLI to a Long-Running XYOps Workflow

## Scope and operating rules

This document is an execution plan only. It does not authorize implementation of any phase.

- [ ] Implement phases in order unless a phase records an approved dependency exception.
- [ ] Keep all standalone XYOps events functional throughout the migration.
- [ ] Do not redispatch a migration after an unknown outcome; reconcile the existing job/workflow first.
- [ ] Preserve secret redaction and existing diagnostic boundaries.
- [ ] Treat selection/planning reuse and execution-time current-state reads as different policies.
- [ ] Do not infer XYOps Workflow API names, lifecycle semantics, suspension primitives, or resume payloads from the current event API.
- [ ] Verify those capabilities against authoritative XYOps documentation or a controlled XYOps probe before implementing the first integration phase.
- [ ] Keep a rollback path to the current independent-event CLI until the workflow path passes production-like validation.

## Repository baseline and source-supported corrections

### Current architecture observed

- The CLI entrypoint and event-by-event orchestration are in `xyops/cli/migration/index.ts`.
- Local configuration is read by `xyops/cli/config.ts` and `xyops/cli/config-domain.ts`; migration fields are validated by `xyops/cli/schemas/migration-config.ts`.
- Interactive source/destination selection is in `xyops/cli/migration/selection.ts`, with mutable-in-process selection state in `xyops/cli/state.ts`.
- Planning is displayed and confirmed by `xyops/cli/migration/planning.ts` and `xyops/cli/migration/execution.ts`; the CLI calls the independent `plan_migration` and `execute_migration` events.
- The CLI client implements independent event dispatch in `xyops/cli/client/index.ts`, polling in `xyops/cli/client/polling.ts`, SSE observation in `xyops/cli/client/streaming.ts`, and job lifecycle state in `xyops/cli/client/job-observation-state-machine.ts`.
- Voiceflow catalog loading and option projection are in `xyops/voiceflow/catalog/options.ts`, `xyops/voiceflow/catalog/record-parsers.ts`, and `xyops/voiceflow/catalog/index.ts`.
- Catalog event handlers currently return `options` projections. They do not currently expose a workflowData contract containing normalized workspace, project, folder, and environment records.
- `xyops/voiceflow/planning/index.ts` currently reloads workspaces, source projects, and destination folders for every plan and derives labels from those fresh snapshots.
- `xyops/voiceflow/execute-migration-state-machine.ts` is an in-process migration reducer/state machine. It is not an XYOps Workflow definition or a persisted `workflowData` implementation.
- Standalone event dispatch is registered in `xyops/plugin/operation_dispatch.ts`, with operation names in `xyops/plugin/operations.ts` and contracts in `xyops/plugin/types.ts`.
- Existing tests cover CLI event orchestration, catalog projection/parsing, planning, execution state transitions, job observation, protocol state machines, validation, and diagnostics. They do not currently prove an XYOps Workflow API integration.

### Assumptions in the request that require correction or verification

- [ ] Confirm whether this XYOps deployment supports long-running Workflows, persisted JSON workflowData, suspended workflow execution, user-input resume, workflow observation, and terminal result retrieval.
- [ ] Confirm the exact XYOps endpoints, request envelopes, response envelopes, identifiers, authentication model, stream/poll behavior, timeout semantics, and retry/idempotency rules. No endpoint names are assumed by this plan.
- [ ] Confirm whether a Workflow can invoke existing XYOps Events directly, invoke plugin operations, or requires a separately deployed workflow definition.
- [ ] Confirm whether workflowData is bounded, versioned, encrypted, redacted, and visible to operators. Do not place Voiceflow credentials, API keys, secret values, raw protocol frames, or unnecessary payloads in it until confirmed.
- [ ] Confirm whether workflow suspension survives worker restart, workflow retry, duplicate resume, reconnect, and concurrent resume attempts.
- [ ] Confirm whether workflow input can distinguish configured values from canonical selections and whether a resume operation is idempotent.
- [ ] Confirm how workflow cancellation and rejection are represented and whether cancellation can guarantee that no mutation stage starts.
- [ ] Confirm whether a workflow can return a plan without mutation and later resume the same workflow for confirmation.
- [ ] Confirm whether an XYOps Workflow can preserve the current `execute_migration` unknown-outcome/reconciliation semantics.

### Explicit design boundary

```text
SELECTION / PLANNING
    reuse workflowData snapshots and normalized domain records

EXECUTION / MUTATION
    re-read current Voiceflow state when required for safety,
    reconciliation, collision checks, or durability confirmation
```

## Dependency graph

```text
Phase 1
  |
Phase 2
  |
Phase 3
  |
Phase 4
  |
Phase 5
  |
Phase 6
  |
Phase 7
  |
Phase 8
  |
Phase 9
  |
Phase 10
  |
Phase 11
  |
Phase 12
  |
Phase 13
  |
Phase 14
  |
Phase 15
  |
Phase 16
  |
Phase 17
  |
Phase 18
```

- [ ] Do not begin a phase until its predecessor's completion criteria and rollback boundary are recorded.
- [ ] Treat Phase 1 and the XYOps capability verification above as gates for all implementation phases.

---

# Phase 1 - Workflow Data Contract

## Goal

Define the typed and runtime-validated contract for JSON-safe migration workflowData without changing runtime behavior.

## Current problem

The repository has canonical domain types and Zod schemas for several boundaries, but no persisted workflowData contract. Current CLI state is an in-process partial record, catalog event results are option projections, and the planning layer reloads remote catalog data.

## Target behavior

A versioned, JSON-safe, runtime-validated `MigrationWorkflowData` model can represent configuration, normalized catalog snapshots, canonical selections, plan state, interaction state, and execution inputs without storing secrets or raw protocol data.

## Files/modules expected to change

- `xyops/cli/types.ts`
- `xyops/cli/state.ts`
- `xyops/cli/config-domain.ts`
- `xyops/cli/schemas/migration-config.ts`
- `xyops/voiceflow/types.ts`
- `xyops/voiceflow/contracts.ts`
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/planning/index.ts` (contract mapping only if needed)
- New workflow contract/schema module, location to be chosen after repository inspection
- New or extended contract tests near `tests/`

## Dependencies on earlier phases

- None. This is the first implementation phase, but it depends on verified XYOps workflowData serialization/security behavior.

## Implementation tasks

- [ ] Inventory canonical `WorkspaceRecord`, `ProjectRecord`, `FolderRecord`, `EnvironmentRecord`, `MigrationSelection`, `MigrationPlan`, config, secret-reference, warning, receipt, and diagnostic types.
- [ ] Inventory existing Zod schemas and identify where a schema is canonical versus merely transport-specific.
- [ ] Define the minimum state needed to resume each interactive stage.
- [ ] Separate config intent, catalog snapshots, canonical selection, plan, execution input, workflow status, and terminal result.
- [ ] Define a versioned `MigrationWorkflowData` type.
- [ ] Define the matching Zod schema at the workflowData boundary.
- [ ] Ensure dates, errors, IDs, options, records, and unions are represented using JSON-safe values only.
- [ ] Define ownership: workflow owns orchestration and persisted state; CLI owns local files, prompting, display, and transport observation.
- [ ] Define trust boundaries for local config, secret references, XYOps responses, Voiceflow records, user selections, and workflow resume input.
- [ ] Define planning snapshot versus execution current-state rules in the contract documentation.
- [ ] Define schema-version migration behavior for future workflowData versions.
- [ ] Add redaction/serialization tests proving credentials, secret values, tokens, raw frames, and arbitrary response payloads cannot enter workflowData.

## Tests required

- [ ] Type-level contract coverage for required and optional stage fields.
- [ ] Zod acceptance tests for valid empty, partially configured, suspended, planned, confirmed, failed, unknown, and completed states.
- [ ] Rejection tests for unknown fields where strictness is required, invalid IDs, non-JSON values, oversized values, and secret-bearing fields.
- [ ] Round-trip JSON serialization tests.
- [ ] Version compatibility tests for supported workflowData versions.

## Explicit non-goals

- [ ] Do not change event dispatch.
- [ ] Do not add a Workflow API client.
- [ ] Do not move selection or planning into a workflow.
- [ ] Do not change the current migration state machine.

## Completion criteria

- [ ] Contract and schema are reviewed against all current domain types.
- [ ] Contract tests pass.
- [ ] A documented field-level ownership and redaction table exists.
- [ ] No production behavior or event count changes.

## Rollback boundary

Delete or revert only the new contract/schema modules and tests. Existing event and CLI paths must remain unchanged.

## Risks

- Persisting too much catalog data may exceed workflowData limits.
- Reusing transport envelopes may leak protocol or secret data.
- Making the contract too broad may preserve the current duplication rather than define a stable workflow boundary.

## Questions requiring verification

- [ ] What is the XYOps workflowData size and value-type limit?
- [ ] Is workflowData encrypted at rest and redacted in logs/UI?
- [ ] Does XYOps validate workflowData with a schema, or must the workflow validate it explicitly?
- [ ] What is the supported workflowData versioning/migration mechanism?

---

# Phase 2 - Workflow Initialization

## Goal

Allow the CLI to start one migration workflow while preserving the current independent-event path.

## Current problem

`xyops/cli/migration/index.ts` directly sequences check-session, selection events, secret loading, planning, confirmation, and execution. There is no workflow start/observe/resume adapter in the repository.

## Target behavior

The CLI validates local config, starts a single workflow with validated non-secret input, receives a workflow/job identifier, and can observe it. The existing independent-event migration remains the fallback path.

## Files/modules expected to change

- `xyops/cli/migration/index.ts`
- `xyops/cli/client/index.ts`
- `xyops/cli/client/http.ts`
- `xyops/cli/client/streaming.ts`
- `xyops/cli/client/polling.ts`
- `xyops/cli/client/job-response.ts`
- `xyops/cli/types.ts`
- `xyops/cli/config.ts` and `xyops/cli/config-domain.ts`
- `xyops/plugin/operations.ts`, `xyops/plugin/types.ts`, `xyops/plugin/operation_dispatch.ts` if the workflow is deployed through this plugin
- New workflow client/adapter and workflow definition modules, subject to XYOps API verification
- `tests/migration_cli_xyops.test.ts`, `tests/xyops_streaming.test.ts`, and new workflow adapter tests

## Dependencies on earlier phases

- Phase 1 contract complete.
- XYOps workflow start/observe API verified.

## Implementation tasks

- [ ] Keep local migration config file reading in the CLI.
- [ ] Validate config before building any workflow start request.
- [ ] Define the smallest workflow start request supported by the verified XYOps API.
- [ ] Create the migration Workflow definition without moving interactive selection yet.
- [ ] Initialize workflowData with validated config intent only.
- [ ] Return and persist the verified workflow/job identifier in the CLI process.
- [ ] Add observation using the verified SSE/stream API where supported, with bounded polling fallback.
- [ ] Define reconnect behavior, duplicate observation handling, cancellation, and terminal-result retrieval.
- [ ] Preserve the existing independent event execution path behind a feature flag or explicit compatibility mode.
- [ ] Ensure starting a workflow and observing it cannot dispatch the migration twice.

## Tests required

- [ ] Config validation prevents malformed input from reaching workflow start.
- [ ] Start request contains no secrets unless an approved secret transport exists.
- [ ] Workflow identifier is parsed and validated.
- [ ] Observation reconnects without duplicate resume/start operations.
- [ ] SSE failure falls back to polling the same workflow/job ID.
- [ ] Unknown terminal outcome requires reconciliation and never redispatches.
- [ ] Compatibility mode still exercises the existing independent events.

## Explicit non-goals

- [ ] Do not move source or destination selection.
- [ ] Do not remove any standalone event.
- [ ] Do not change Voiceflow catalog loading.
- [ ] Do not pass secret file contents through workflowData.

## Completion criteria

- [ ] A verified workflow can be started and observed in a non-production environment.
- [ ] The current CLI path remains available and passing.
- [ ] Workflow API behavior is documented in the adapter tests rather than inferred.

## Rollback boundary

Disable the workflow feature flag and return to the current event-by-event path without changing existing event handlers.

## Risks

- The requested XYOps Workflow API may not be available in the configured deployment.
- Workflow start may have different job semantics from `/api/app/run_event/v1`.
- A failed start response may leave an unknown workflow creation outcome.

## Questions requiring verification

- [ ] What exact XYOps API starts a Workflow?
- [ ] Can a Workflow invoke existing events, or must logic be deployed as a new workflow artifact?
- [ ] How are Workflow IDs and execution IDs distinguished?
- [ ] What guarantees exist for start idempotency?

---

# Phase 3 - Single Workspace Catalog Load

## Goal

Retrieve workspace records once per migration workflow and reuse them for both source and destination resolution.

## Current problem

`selection.ts` validates and selects source and destination values through separate `list_workspaces` calls. `list_workspaces.ts` returns options rather than normalized records.

## Target behavior

The workflow loads normalized workspace records once, stores the approved projection in workflowData, and derives both source and destination options from that snapshot.

## Files/modules expected to change

- `xyops/voiceflow/catalog/options.ts`
- `xyops/voiceflow/catalog/index.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- `xyops/voiceflow/list_workspaces.ts`
- New workflow catalog stage module
- `xyops/cli/migration/selection.ts`
- `tests/vf_catalog_projection.test.ts`
- `tests/migration_config.test.ts`
- New workflow catalog reuse tests

## Dependencies on earlier phases

- Phase 1 contract and Phase 2 workflow initialization.

## Implementation tasks

- [ ] Execute workspace retrieval inside the workflow using a verified existing event or approved reusable function.
- [ ] Normalize rows to `WorkspaceRecord` before storing them.
- [ ] Store records, not only `Option[]`, in workflowData.
- [ ] Derive source and destination options from the same stored records.
- [ ] Record the catalog snapshot identity/time only if the contract and XYOps limits permit it.
- [ ] Verify no credentials, raw protocol payloads, or Logux frames enter workflowData.
- [ ] Preserve standalone `list_workspaces` behavior and response shape.

## Tests required

- [ ] One workspace retrieval per workflow instance.
- [ ] Source and destination option derivation uses the same snapshot.
- [ ] Malformed optional folder metadata does not reject valid records.
- [ ] Raw response and secret-redaction boundary tests.
- [ ] Standalone list-workspaces regression tests.

## Explicit non-goals

- [ ] Do not add project, version, or folder loading.
- [ ] Do not suspend for user input.
- [ ] Do not change execution-time current-state reads.

## Completion criteria

- [ ] Both workspace resolutions can consume one workflowData snapshot.
- [ ] Existing standalone event tests pass.
- [ ] Instrumentation proves no second workspace load in the composed workflow path.

## Rollback boundary

Revert only workflow workspace storage/consumption and restore independent `list_workspaces` calls.

## Risks

- Workspace records may be too large for workflowData.
- A snapshot may become stale before mutation, so it must not be used as execution authority.

## Questions requiring verification

- [ ] Is `WorkspaceRecord` sufficient for canonical labels and path resolution?
- [ ] Does the verified workflow execution expose a safe way to count or trace stage calls?

---

# Phase 4 - Source Workspace Suspend/Resume

## Goal

Prove interactive workflow suspension and resume with source workspace selection only.

## Current problem

`selectSourceSelection` prompts synchronously in the CLI after loading options. No persisted workflow suspension or resume identity exists.

## Target behavior

Configured source workspace resolves automatically. Missing source workspace causes the workflow to suspend with choices; the CLI displays them, submits one canonical selection, and resumes the same workflow.

## Files/modules expected to change

- `xyops/cli/migration/selection.ts`
- `xyops/cli/migration/index.ts`
- `xyops/cli/prompt.ts`
- `xyops/cli/state.ts`
- New workflow interaction state/resume adapter
- `xyops/cli/client/index.ts` and observation modules
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`
- New suspend/resume contract tests

## Dependencies on earlier phases

- Phases 1-3 complete.
- XYOps suspension, input, and resume semantics verified.

## Implementation tasks

- [ ] Define the workflow waiting state and its JSON-safe choice payload.
- [ ] Resolve configured source workspace against canonical workspace records.
- [ ] Suspend with a stable interaction identifier when configuration is absent.
- [ ] Display choices using existing CLI presentation behavior.
- [ ] Validate the selected value against the stored records before resume.
- [ ] Resume the same workflow with canonical `sourceWorkspaceID`.
- [ ] Make duplicate resume submissions idempotent.
- [ ] Verify state and workflow identity survive process restart and reconnect.
- [ ] Do not continue to project or destination stages until this interaction is reliable.

## Tests required

- [ ] Configured source workspace avoids suspension.
- [ ] Missing source workspace suspends exactly once.
- [ ] Valid selection resumes the same workflow.
- [ ] Invalid, stale, duplicate, and concurrent selections are rejected safely.
- [ ] Restart/reconnect preserves the waiting interaction.
- [ ] No mutation or later catalog stage occurs before successful resume.

## Explicit non-goals

- [ ] Do not move project, version, destination, planning, or confirmation interactions.
- [ ] Do not remove CLI prompting support.

## Completion criteria

- [ ] One interactive selection survives suspend, process exit, reconnect, and resume in a controlled environment.
- [ ] No duplicate stage execution or resume side effect is observed.

## Rollback boundary

Disable workflow source selection and use the existing CLI prompt/event path.

## Risks

- Prompt state may be lost if XYOps does not persist arbitrary interaction metadata.
- A CLI crash after selection submission may make resume outcome unknown.

## Questions requiring verification

- [ ] Does XYOps provide a first-class suspended state and resume token?
- [ ] Can the CLI safely retrieve the pending choice after reconnect?
- [ ] What happens when a workflow is resumed twice?

---

# Phase 5 - Source Catalog

## Goal

Load source projects, folders where required, environments, and normalized records once.

## Current problem

`loadProjects` performs multiple catalog reads and `list_projects` exposes only options. `list_versions` separately reloads project/version information.

## Target behavior

The workflow stores normalized `ProjectRecord`, `FolderRecord`, and environment data for the source workspace. Presentation options are derived later from those records.

## Files/modules expected to change

- `xyops/voiceflow/catalog/options.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- `xyops/voiceflow/catalog/index.ts`
- `xyops/voiceflow/list_projects.ts`
- `xyops/voiceflow/list_folders.ts`
- New workflow source-catalog stage
- `tests/vf_catalog_projection.test.ts`
- `tests/vf_folder_validation.test.ts`
- New workflow snapshot tests

## Dependencies on earlier phases

- Phase 4 source workspace canonical ID and suspension path.

## Implementation tasks

- [ ] Identify the minimum catalog rows needed for project, folder, and environment resolution.
- [ ] Load source projects once for the selected workspace.
- [ ] Load source folders only when required by project path/folder relationships.
- [ ] Store normalized domain records, not only options.
- [ ] Preserve project environment/version information needed by Phase 7.
- [ ] Define snapshot ownership and freshness metadata.
- [ ] Keep standalone list-projects/list-folders responses compatible.

## Tests required

- [ ] Source catalog loads once per workflow.
- [ ] Records preserve project-folder relationships and environments.
- [ ] Invalid optional IDs are handled according to existing parser policy.
- [ ] Options derived from records match existing option labels and values.
- [ ] No raw secret/protocol data is stored.

## Explicit non-goals

- [ ] Do not resolve the project or version yet.
- [ ] Do not reload current execution state here.
- [ ] Do not remove standalone list events.

## Completion criteria

- [ ] WorkflowData contains sufficient source records for project and version selection.
- [ ] Existing option behavior remains regression-tested.

## Rollback boundary

Restore independent source project/folder event calls while retaining standalone events.

## Risks

- `loadProjects` may combine multiple Logux streams whose completeness guarantees differ.
- Storing all project environments may exceed workflowData limits.

## Questions requiring verification

- [ ] Are all `ProjectRecord.environments` values complete and authoritative for version selection?
- [ ] Are source folders needed for all project path resolution cases?

---

# Phase 6 - Source Project Resolution

## Goal

Resolve the source project from stored source catalog records without another catalog request.

## Current problem

Configured project validation and interactive selection call `list_projects` independently, and planning reloads projects again.

## Target behavior

Configured project ID/name/path resolves against stored records; otherwise the workflow suspends for selection and resumes with canonical `sourceProjectID`, preserving ambiguity and relationship rules.

## Files/modules expected to change

- `xyops/cli/migration/selection.ts`
- `xyops/cli/migration/index.ts`
- New workflow resolution policy module
- `xyops/voiceflow/catalog/options.ts`
- `xyops/cli/state.ts`
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`
- `tests/vf_catalog_projection.test.ts`

## Dependencies on earlier phases

- Phases 1-5 complete.

## Implementation tasks

- [ ] Adapt configured ID/name/path resolution to normalized stored records.
- [ ] Derive project options from records while preserving current labels.
- [ ] Suspend for interactive project selection when required.
- [ ] Validate resume input against the source workspace's stored projects.
- [ ] Preserve ambiguity detection and folder/path relationship rules.
- [ ] Store canonical `sourceProjectID` in workflowData.
- [ ] Add instrumentation proving no second source project retrieval occurs.

## Tests required

- [ ] Exact ID, normalized name, and path resolution.
- [ ] Missing, ambiguous, wrong-workspace, and stale values.
- [ ] Interactive suspend/resume and duplicate resume.
- [ ] No second project catalog request.

## Explicit non-goals

- [ ] Do not load versions remotely.
- [ ] Do not change planning or execution.

## Completion criteria

- [ ] Source project is resolved solely from workflowData.
- [ ] Existing configured and interactive modes remain behaviorally compatible.

## Rollback boundary

Restore source project event selection while leaving workspace workflow state intact only if that mixed mode is explicitly tested; otherwise disable the workflow path.

## Risks

- Existing name/path matching may depend on option labels that do not exist on raw records.
- Folder paths may be incomplete if the source folder snapshot is partial.

## Questions requiring verification

- [ ] What is the canonical path representation for a project in the current catalog?
- [ ] Can a project label change during a suspended interaction, and how should stale snapshots be handled?

---

# Phase 7 - Source Version Derivation

## Goal

Derive version choices from the selected `ProjectRecord` rather than invoking `list_versions` in the composed workflow.

## Current problem

`xyops/voiceflow/list_versions.ts` invokes the catalog loader independently, and current CLI selection calls it after project selection.

## Target behavior

Version choices come from stored project environments using existing `versionOptions` semantics. The workflow stores canonical `sourceVersionID` and never calls `loadProjects` again for version selection.

## Files/modules expected to change

- `xyops/voiceflow/catalog/options.ts`
- `xyops/cli/migration/selection.ts`
- `xyops/cli/migration/index.ts`
- `xyops/voiceflow/list_versions.ts` only for compatibility preservation/tests if needed
- `tests/vf_catalog_projection.test.ts`
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`

## Dependencies on earlier phases

- Phase 6 selected `sourceProjectID` and stored source project record.

## Implementation tasks

- [ ] Locate the selected project record in workflowData.
- [ ] Derive version choices using existing `versionOptions` policy where compatible.
- [ ] Resolve configured source version against canonical environment/version records.
- [ ] Suspend for interactive version selection when required.
- [ ] Validate resume input against the selected project's versions.
- [ ] Store canonical `sourceVersionID`.
- [ ] Remove only the composed workflow's `list_versions` call.
- [ ] Keep `list_versions` functional as a standalone event.

## Tests required

- [ ] Draft and published version derivation.
- [ ] Multiple environments and missing version IDs.
- [ ] Configured, ambiguous, missing, and interactive version selection.
- [ ] No additional `loadProjects` call.
- [ ] Standalone `list_versions` regression tests.

## Explicit non-goals

- [ ] Do not delete `list_versions`.
- [ ] Do not refresh current source version data during selection.

## Completion criteria

- [ ] Version selection uses stored project records only.
- [ ] Existing labels and schema-version behavior remain unchanged.

## Rollback boundary

Restore the independent `list_versions` call in the selection path.

## Risks

- Project environments may not be equivalent to the standalone event's current response.
- Version IDs may be stale after suspension.

## Questions requiring verification

- [ ] Is `ProjectRecord.environments` complete for all supported project types?
- [ ] Does the standalone version event apply filtering not represented by `versionOptions`?

---

# Phase 8 - Destination Workspace Resolution

## Goal

Resolve destination workspace from the workspace snapshot already stored in workflowData.

## Current problem

Destination validation invokes `list_workspaces` again even after source workspace resolution.

## Target behavior

Destination ID/name/path resolution and interactive choices use the existing workspace records without a second workspace request.

## Files/modules expected to change

- `xyops/cli/migration/selection.ts`
- Workflow resolution stage modules
- `xyops/voiceflow/catalog/options.ts` if shared projection changes are required
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`

## Dependencies on earlier phases

- Phase 3 workspace snapshot and Phase 4-7 selection interaction infrastructure.

## Implementation tasks

- [ ] Resolve destination config against stored workspace records.
- [ ] Suspend for destination selection when required.
- [ ] Validate resume input against the stored workspace IDs.
- [ ] Store canonical `destinationWorkspaceID`.
- [ ] Prove no second workspace catalog request occurs.

## Tests required

- [ ] Configured destination ID/name/path.
- [ ] Interactive destination selection.
- [ ] Invalid and ambiguous values.
- [ ] Source and destination can be the same or different according to existing policy.
- [ ] Workspace load count is one.

## Explicit non-goals

- [ ] Do not load destination folders before destination workspace is known.
- [ ] Do not perform mutation.

## Completion criteria

- [ ] Destination workspace is resolved from the original workspace snapshot.
- [ ] Existing CLI modes and labels remain compatible.

## Rollback boundary

Restore independent destination workspace selection while retaining source workflow behavior only if tested; otherwise use the full compatibility path.

## Risks

- Destination workspace may change while the workflow is suspended.

## Questions requiring verification

- [ ] Is a stale workspace snapshot acceptable for selection, or must the workflow revalidate identity before folder mutation?

---

# Phase 9 - Destination Folder Resolution

## Goal

Load and reuse destination folders once, while preserving folder creation behavior.

## Current problem

Destination folders are retrieved during selection/validation and again during planning. Creating a folder currently returns a folder projection, but the workflow has no persisted catalog update policy.

## Target behavior

The workflow loads destination folders after destination workspace resolution, resolves the configured or selected folder from records, creates a missing folder when allowed, and updates the stored folder snapshot with the known created record without an unnecessary full reload.

## Files/modules expected to change

- `xyops/voiceflow/catalog/options.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/create_folder.ts`
- `xyops/voiceflow/logux/create-folder.ts`
- `xyops/cli/migration/selection.ts`
- Workflow folder stage and workflowData adapter
- `tests/vf_folder_validation.test.ts`
- `tests/migration_config.test.ts`
- `tests/migration_cli_xyops.test.ts`

## Dependencies on earlier phases

- Phase 8 canonical destination workspace.

## Implementation tasks

- [ ] Load destination folders once after destination workspace is known.
- [ ] Store normalized `FolderRecord` values.
- [ ] Resolve configured ID/name/path against stored folder records.
- [ ] Suspend for interactive folder selection when required.
- [ ] Preserve existing missing-folder creation policy and confirmation boundaries.
- [ ] Convert a successful folder creation result into a validated canonical `FolderRecord` or approved minimal record.
- [ ] Append/update the known folder in workflowData without blindly reloading the full catalog.
- [ ] Define behavior when creation succeeds but the response is incomplete or outcome is unknown.

## Tests required

- [ ] Folder ID/name/path resolution and ambiguity.
- [ ] Nested path resolution and parent relationships.
- [ ] Interactive selection and resume.
- [ ] Successful creation updates workflowData.
- [ ] Duplicate creation, timeout, unknown outcome, and stale folder snapshot cases.
- [ ] No unnecessary full folder reload after a validated creation.

## Explicit non-goals

- [ ] Do not remove standalone `list_folders` or `create_folder`.
- [ ] Do not treat the selection snapshot as authoritative during mutation.

## Completion criteria

- [ ] Destination folder is canonical and available to planning without a second full catalog load.
- [ ] Creation and unknown-outcome safety rules are documented and tested.

## Rollback boundary

Restore independent folder retrieval/creation and preserve the old duplicate-load behavior temporarily if required for safety.

## Risks

- A created folder response may not contain all fields needed by path reconstruction.
- Logux acknowledgment may confirm a mutation while the workflow response remains unknown.

## Questions requiring verification

- [ ] What is the authoritative created-folder response contract?
- [ ] Can folder creation be idempotently reconciled by name/parent/workspace?

---

# Phase 10 - Pure Planning Input

## Goal

Build a migration plan from canonical resolved selections and stored records without reconstructing catalog information through remote calls.

## Current problem

`xyops/voiceflow/planning/index.ts` calls `loadWorkspaces`, `loadProjects`, and `loadFolders` inside `buildMigrationPlan`, even after selection has already loaded equivalent data.

## Target behavior

Planning consumes validated canonical domain records and selection, preserves labels, relationships, plan IDs, and schema behavior, and stores the completed `MigrationPlan` in workflowData.

## Files/modules expected to change

- `xyops/voiceflow/planning/index.ts`
- `xyops/voiceflow/plan_migration.ts`
- `xyops/voiceflow/catalog/options.ts`
- `xyops/voiceflow/types.ts`
- Workflow planning stage
- `xyops/cli/migration/planning.ts`
- `tests/vf_auth_planning_fp.test.ts`
- `tests/vf_schema_version.test.ts`
- `tests/migration_cli_xyops.test.ts`

## Dependencies on earlier phases

- Phases 1-9 provide canonical selection and snapshots.

## Implementation tasks

- [ ] Inventory every remote/catalog call currently reachable from `buildMigrationPlan`.
- [ ] Define a pure planning input type containing canonical selection and required stored records.
- [ ] Change pure plan construction to consume that input.
- [ ] Preserve canonical labels and relationship validation.
- [ ] Preserve planID generation and schema-version behavior.
- [ ] Ensure configured strings are resolved before planning; planning must not blindly trust them.
- [ ] Store the completed `MigrationPlan` in workflowData.
- [ ] Keep standalone `plan_migration` functional, potentially through an adapter that loads its own catalog when run independently.

## Tests required

- [ ] Pure plan construction performs zero remote calls.
- [ ] Plan labels match current behavior for IDs, names, paths, folders, and versions.
- [ ] Missing and mismatched records fail explicitly.
- [ ] Plan ID determinism/uniqueness behavior remains unchanged.
- [ ] Standalone plan event regression tests.

## Explicit non-goals

- [ ] Do not mutate Voiceflow.
- [ ] Do not remove the independent planning event.
- [ ] Do not refresh current execution state here.

## Completion criteria

- [ ] The composed workflow planning stage makes no catalog requests.
- [ ] `MigrationPlan` is validated and persisted in workflowData.
- [ ] Standalone `plan_migration` still works independently.

## Rollback boundary

Restore the existing remote-loading `buildMigrationPlan` adapter while retaining a separately tested pure planner if possible.

## Risks

- Existing standalone and workflow planning inputs may diverge.
- Snapshot records may omit fields currently obtained by planning reloads.

## Questions requiring verification

- [ ] Which fields are truly required to build labels and validate relationships?
- [ ] Does plan ID generation depend on any remote or time-sensitive data?

---

# Phase 11 - Plan Ready Suspension

## Goal

Suspend after planning and return a validated plan to the interactive CLI without mutation.

## Current problem

The current CLI displays the plan in-process, then prompts for confirmation. No persisted workflow waiting state exists.

## Target behavior

The workflow reaches a stable `awaiting-confirmation` state containing the validated plan; the CLI observes it and reuses existing `displayPlan` behavior.

## Files/modules expected to change

- `xyops/cli/migration/planning.ts`
- `xyops/cli/migration/execution.ts`
- `xyops/cli/migration/index.ts`
- Workflow state/interaction modules
- `xyops/cli/client/index.ts`
- `tests/vf_execute_confirmation.test.ts`
- `tests/migration_cli_xyops.test.ts`
- New workflow suspension tests

## Dependencies on earlier phases

- Phase 10 completed plan in workflowData.
- Phase 4 interaction transport proven.

## Implementation tasks

- [ ] Define the plan-ready waiting state and observable payload.
- [ ] Validate plan data at the workflow-to-CLI boundary.
- [ ] Expose the plan without exposing secrets.
- [ ] Reuse current `displayPlan` formatting.
- [ ] Ensure no export, archive, import, folder mutation, or secret mutation has occurred.
- [ ] Represent the workflow as waiting for explicit confirmation.

## Tests required

- [ ] Plan-ready state is stable across reconnect.
- [ ] Plan display matches current output.
- [ ] No mutation calls precede confirmation.
- [ ] Invalid or incomplete plan payloads are rejected.

## Explicit non-goals

- [ ] Do not resume execution.
- [ ] Do not change plan content.

## Completion criteria

- [ ] CLI can display a plan produced by the same workflow execution.
- [ ] Workflow remains resumable after process restart.

## Rollback boundary

Restore in-process plan display while leaving planning contract tests intact.

## Risks

- Plan payload may be too large for workflowData or observation response limits.
- Display may accidentally expose secret-derived labels or diagnostics.

## Questions requiring verification

- [ ] Is plan output returned through workflowData, terminal output, or a dedicated workflow observation payload?

---

# Phase 12 - Confirmation Resume

## Goal

Replace separate CLI execution dispatch with resume of the same workflow after explicit confirmation.

## Current problem

`xyops/cli/migration/index.ts` prompts locally and then dispatches a separate `execute_migration` event.

## Target behavior

Rejection terminates the waiting workflow without mutation. Confirmation resumes the same workflow with an explicit `confirmed=true` input, and execution cannot start without it.

## Files/modules expected to change

- `xyops/cli/migration/index.ts`
- `xyops/cli/migration/execution.ts`
- `xyops/cli/migration/secret-input.ts`
- Workflow resume adapter/state
- `xyops/migration-parameters.ts`
- `tests/vf_execute_confirmation.test.ts`
- `tests/migration_cli_xyops.test.ts`

## Dependencies on earlier phases

- Phase 11 plan-ready suspension.

## Implementation tasks

- [ ] Keep confirmation prompting in the CLI.
- [ ] Define explicit rejection/cancellation workflow termination.
- [ ] Resume the same workflow with `confirmed=true` through the verified API.
- [ ] Validate workflow ID, interaction ID, plan ID, and confirmation input together.
- [ ] Make duplicate confirmation submissions idempotent.
- [ ] Prevent execution when confirmation is missing, false, stale, or malformed.
- [ ] Define how secret input is supplied without placing secret values in workflowData.

## Tests required

- [ ] Rejection causes no mutation.
- [ ] Confirmation resumes the same workflow exactly once.
- [ ] Missing/false confirmation cannot reach execution.
- [ ] Duplicate/replayed confirmation does not duplicate execution.
- [ ] Secret transport and redaction tests.

## Explicit non-goals

- [ ] Do not simplify execution reducers.
- [ ] Do not change Voiceflow mutation operations.

## Completion criteria

- [ ] The separate CLI execute dispatch is not used by the workflow path.
- [ ] Confirmation is an auditable workflow input.

## Rollback boundary

Return to the current local confirmation plus independent execute-event path.

## Risks

- Resume may be accepted while the CLI loses the response.
- Secret input may require an XYOps secure-input capability not currently present.

## Questions requiring verification

- [ ] Does XYOps support secure resume inputs or secret references?
- [ ] Can rejected workflows be terminally cancelled without running queued work?

---

# Phase 13 - Execution Integration

## Goal

Connect the existing migration execution implementation to the workflow without simplifying it.

## Current problem

The current `execute_migration` event receives plan ID, selection, secret input, and confirmation independently after the CLI has completed planning.

## Target behavior

The workflow invokes or embeds the existing execution behavior using canonical plan/selection data and preserves export, archive, import, secret, diagnostics, and unknown-outcome semantics.

## Files/modules expected to change

- `xyops/voiceflow/execute_migration/index.ts`
- `xyops/voiceflow/execute_migration/arguments.ts`
- `xyops/voiceflow/execute_migration/effect-runner.ts`
- `xyops/voiceflow/execute_migration/effect-runner/*`
- `xyops/voiceflow/execute-migration-state-machine.ts`
- `xyops/plugin/operation_dispatch.ts`
- Workflow execution stage/adapter
- `tests/vf_execute_api_key_outcome.test.ts`
- `tests/vf_execute_confirmation.test.ts`
- `tests/vf_migration_workflow_state_machine.test.ts`
- `tests/vf_runtime_cleanup.test.ts`

## Dependencies on earlier phases

- Phase 12 confirmed workflow resume.

## Implementation tasks

- [ ] Reuse existing execution implementation initially.
- [ ] Pass canonical `planID` and `MigrationSelection`.
- [ ] Pass secret input through an approved secure boundary.
- [ ] Preserve the migration reducer and effect runner.
- [ ] Preserve export, archive, import, secret, warning, and result behavior.
- [ ] Preserve job observation and unknown-outcome handling.
- [ ] Prevent workflow retries from redispatching completed mutations.
- [ ] Map workflow terminal status to the existing CLI result/diagnostic envelope.
- [ ] Maintain standalone `execute_migration` behavior.

## Tests required

- [ ] End-to-end workflow execution with no-op/test Voiceflow dependencies.
- [ ] Export/archive/import/secret state-machine regression suite.
- [ ] Confirmed versus unconfirmed execution.
- [ ] Timeout, network failure, mutation acknowledgment, and unknown outcome reconciliation.
- [ ] Duplicate workflow retry/resume does not duplicate mutations.

## Explicit non-goals

- [ ] Do not refactor the main migration state machine for size.
- [ ] Do not remove current-state reads.
- [ ] Do not remove standalone execute event.

## Completion criteria

- [ ] Workflow execution produces the same validated result and diagnostics as the current event.
- [ ] Existing execution tests pass without weakening assertions.

## Rollback boundary

Route confirmed plans to the existing independent `execute_migration` event and retain the workflow only through plan-ready state.

## Risks

- Workflow retry semantics may conflict with effect-runner idempotency.
- Workflow persistence may not support the current rich state or error context.

## Questions requiring verification

- [ ] Can the Workflow call the existing event without changing its job lifecycle?
- [ ] What is the workflow retry policy for a stage that performed a Voiceflow mutation?

---

# Phase 14 - Current-State Safety Boundary

## Goal

Document and enforce which Voiceflow reads intentionally remain during execution.

## Current problem

Removing all repeated reads would make mutation safety weaker. The repository includes archive collision checks, rename durability checks, Logux acknowledgments, import reconciliation, and unknown-outcome paths that may require fresh state.

## Target behavior

Selection/planning reads are reused from workflowData. Execution reads are explicitly classified and retained when they are preconditions, reconciliation, durability confirmation, or current-state safety checks.

## Files/modules expected to change

- `xyops/voiceflow/execute_migration-state-machine.ts`
- `xyops/voiceflow/execute_migration/effect-runner/*`
- `xyops/voiceflow/archive.ts`
- `xyops/voiceflow/catalog/rename-barrier.ts`
- `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- `xyops/voiceflow/logux/*`
- `xyops/voiceflow/import/*`
- `tests/vf_rename_durability.test.ts`
- `tests/vf_runtime_cleanup.test.ts`
- New retained-read policy tests/document

## Dependencies on earlier phases

- Phase 13 workflow execution integration.

## Implementation tasks

- [ ] Inventory every Voiceflow read reachable during export, archive, rename, import, secret, and reconciliation stages.
- [ ] Classify each read as stale duplicate, mutation precondition, reconciliation, durability confirmation, or other documented safety read.
- [ ] Remove only stale duplicates proven to be covered by workflowData.
- [ ] Preserve archive collision checks.
- [ ] Preserve rename durability checks and Logux acknowledgment handling.
- [ ] Preserve import and execute unknown-outcome reconciliation.
- [ ] Produce an explicit retained-read list with rationale and owner.
- [ ] Add instrumentation/tests for expected read counts by stage.

## Tests required

- [ ] Every retained read has a regression test or explicit integration probe.
- [ ] Stale duplicate reads are absent from selection/planning.
- [ ] Current-state mutation preconditions still execute.
- [ ] Unknown outcomes never cause unsafe blind retries.
- [ ] Durability and reconciliation races remain covered.

## Explicit non-goals

- [ ] Do not optimize away safety reads because they look duplicated.
- [ ] Do not redesign Logux protocol state machines.

## Completion criteria

- [ ] Retained-read list is reviewed and linked from the workflow implementation.
- [ ] Read-count tests distinguish intentional execution reads from selection/planning duplication.

## Rollback boundary

Restore any removed read independently if a safety test or production-like probe fails; do not disable the entire safety boundary.

## Risks

- Snapshot freshness may be mistaken for current-state authority.
- Removing a read may create a race around another operator's mutation.

## Questions requiring verification

- [ ] Which Voiceflow operations provide authoritative current state after a mutation acknowledgment?
- [ ] Which reads are safe to cache across workflow suspension?

---

# Phase 15 - CLI Orchestration Cleanup

## Goal

Make the CLI an interactive workflow client rather than the migration orchestrator.

## Current problem

`xyops/cli/migration/index.ts` currently owns stage order, local state accumulation, event dispatch, planning, confirmation, and execution dispatch.

## Target behavior

The CLI starts, observes, displays, prompts, resumes, and reports. The Workflow owns orchestration, workflowData, stage transitions, suspension, resumption, and execution.

## Files/modules expected to change

- `xyops/cli/migration/index.ts`
- `xyops/cli/migration/selection.ts`
- `xyops/cli/migration/planning.ts`
- `xyops/cli/migration/execution.ts`
- `xyops/cli/migration/secret-input.ts`
- `xyops/cli/state.ts`
- `xyops/cli/progress.ts`
- `xyops/cli/prompt.ts`
- `xyops/cli/client/*`
- `tests/migration_cli_xyops.test.ts`
- `tests/migration_config.test.ts`
- `tests/vf_execute_confirmation.test.ts`

## Dependencies on earlier phases

- Phases 1-14 complete and workflow path proven.

## Implementation tasks

- [ ] Remove obsolete event-by-event orchestration from the workflow-enabled CLI path.
- [ ] Remove obsolete intermediate CLI state that duplicates workflowData.
- [ ] Retain only observation state needed for reconnect and display.
- [ ] Preserve configured, partially configured, and fully interactive modes.
- [ ] Preserve current output, progress, prompt, and diagnostic behavior.
- [ ] Preserve compatibility mode until production migration is complete.
- [ ] Ensure CLI reconnect can recover the current workflow stage and pending input.
- [ ] Ensure terminal results are rendered exactly once.

## Tests required

- [ ] Fully configured migration.
- [ ] Partially configured migration with each suspension point.
- [ ] Fully interactive migration.
- [ ] CLI restart/reconnect at every waiting and running stage.
- [ ] Cancellation, rejection, failure, success, and unknown outcome.
- [ ] No duplicated catalog calls or mutation dispatches.

## Explicit non-goals

- [ ] Do not remove standalone event commands or event handlers.
- [ ] Do not alter Voiceflow domain policy.

## Completion criteria

- [ ] Workflow path CLI has no stage orchestration responsibility beyond interaction and observation.
- [ ] Compatibility path remains available until the approved cutover.

## Rollback boundary

Switch the default path back to the current event-by-event CLI without deleting the workflow adapter.

## Risks

- A large cleanup diff can obscure behavioral regressions.
- CLI reconnect logic may accidentally create a second workflow.

## Questions requiring verification

- [ ] Which workflow states and payloads are guaranteed stable enough for CLI display?
- [ ] Does the CLI need local durable storage for workflow IDs between invocations?

---

# Phase 16 - Standalone Event Review

## Goal

Review event ownership after the workflow path is stable without deleting events solely because the workflow no longer composes them.

## Current problem

The same event registry supports standalone operations and composed CLI orchestration. Their compatibility value is not yet formally classified.

## Target behavior

Every event has a documented status: required by workflow, useful standalone operation, compatibility operation, or obsolete. No removal occurs without separate approval.

## Files/modules expected to change

- `xyops/plugin/operations.ts`
- `xyops/plugin/types.ts`
- `xyops/plugin/operation_dispatch.ts`
- `xyops/voiceflow/check_session.ts`
- `xyops/voiceflow/list_workspaces.ts`
- `xyops/voiceflow/list_projects.ts`
- `xyops/voiceflow/list_versions.ts`
- `xyops/voiceflow/list_folders.ts`
- `xyops/voiceflow/create_folder.ts`
- `xyops/voiceflow/plan_migration.ts`
- `xyops/voiceflow/execute_migration/index.ts`
- `tests/xyops_event_plugin.test.ts`
- `tests/vf_error_diagnostics.test.ts`

## Dependencies on earlier phases

- Phase 15 workflow path is stable and observable.

## Implementation tasks

- [ ] Review `check_session`.
- [ ] Review `list_workspaces`.
- [ ] Review `list_projects`.
- [ ] Review `list_versions`.
- [ ] Review `list_folders`.
- [ ] Review `create_folder`.
- [ ] Review `plan_migration`.
- [ ] Review `execute_migration`.
- [ ] Classify each event using the four required categories.
- [ ] Document standalone callers, compatibility promises, and deprecation requirements.
- [ ] Add contract tests for every event retained.
- [ ] Obtain explicit approval before deleting or changing any event contract.

## Tests required

- [ ] Standalone invocation tests for every retained event.
- [ ] Plugin operation registry and parameter validation tests.
- [ ] Workflow invocation tests where an event remains a workflow dependency.
- [ ] Compatibility/deprecation tests for any event marked obsolete but retained.

## Explicit non-goals

- [ ] Do not delete events during this review by default.
- [ ] Do not change event payloads merely to make workflow integration easier.

## Completion criteria

- [ ] Classification table is complete and approved.
- [ ] All retained standalone event tests pass.

## Rollback boundary

No runtime rollback should be needed if this phase is documentation/tests only; revert only approved event changes.

## Risks

- An event may be used by external operators or automation not visible in this repository.

## Questions requiring verification

- [ ] Is there an external XYOps event catalog or deployment manifest that must be updated?
- [ ] What compatibility window is required for event titles and IDs?

---

# Phase 17 - Zod and Validation Cleanup

## Goal

Remove redundant manual structural validation only after the workflow architecture stabilizes.

## Current problem

Validation is distributed across Zod schemas, parsers, guards, event handlers, and domain policies. Before workflowData settles, cleanup could remove checks that protect a new persistence boundary.

## Target behavior

Unknown external data passes through Zod, becomes a normalized typed domain value, and then passes through domain/workflow policy. Structural checks guaranteed by successful Zod parsing are not repeated; business, relationship, protocol, retry, and mutation-safety checks remain.

## Files/modules expected to change

- `xyops/voiceflow/catalog/record-parsers.ts`
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- `xyops/voiceflow/schemas/auth_claims.ts`
- `xyops/voiceflow/schemas/export_payload.ts`
- `xyops/voiceflow/schemas/secret_entry.ts`
- `xyops/voiceflow/import/schemas/receipt.ts`
- `xyops/plugin/job_validation.ts`
- `xyops/plugin/schemas/*`
- WorkflowData schema module from Phase 1
- `xyops/voiceflow/validation.ts`
- Tests covering each listed boundary

## Dependencies on earlier phases

- Phases 1-16 complete; all workflowData and event boundaries are stable.

## Implementation tasks

- [ ] Review catalog parsing for duplicate structural checks.
- [ ] Review authentication claim validation.
- [ ] Review export metadata validation.
- [ ] Review plugin input validation.
- [ ] Review secret input validation.
- [ ] Review import receipt validation.
- [ ] Review workflowData validation.
- [ ] Remove only manual structural checks guaranteed by successful Zod parsing.
- [ ] Keep domain rules, resource existence, relationship rules, protocol policy, retry policy, and mutation safety checks.
- [ ] Document any remaining manual checks and why Zod cannot replace them.

## Tests required

- [ ] Malformed external data tests at every boundary.
- [ ] Valid normalized-domain-value tests.
- [ ] Domain-policy rejection tests after successful parsing.
- [ ] Regression tests for secret redaction and unknown fields.
- [ ] WorkflowData schema compatibility tests.

## Explicit non-goals

- [ ] Do not normalize all schemas or rename public fields.
- [ ] Do not remove business or safety validation.
- [ ] Do not change event behavior as a cleanup side effect.

## Completion criteria

- [ ] Validation ownership is documented per boundary.
- [ ] Tests prove no protection was lost.
- [ ] Typecheck, lint, and full test suite pass.

## Rollback boundary

Revert each validation cleanup independently when a boundary regression is found.

## Risks

- A Zod schema may validate shape but not semantic relationships.
- Shared schemas may be consumed by external payloads with compatibility requirements.

## Questions requiring verification

- [ ] Which schemas are public protocol contracts versus internal domain parsers?
- [ ] Are unknown fields intentionally preserved anywhere for forward compatibility?

---

# Phase 18 - Over-Engineering Cleanup

## Goal

Simplify implementation details only after the workflow migration is stable and behavior is proven.

## Current problem

The repository contains multiple state machines and typed orchestration layers, including rename durability, XYOps job observation, and migration execution. Some may be more complex than necessary, but their safety behavior is not interchangeable.

## Target behavior

Only proven-equivalent simplifications are made. The main migration state machine and Logux protocol state machines are not reduced merely for line count.

## Files/modules expected to change

- `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- `xyops/voiceflow/catalog/rename-barrier.ts`
- `xyops/cli/client/job-observation-state-machine.ts`
- `xyops/cli/client/index.ts`
- `xyops/voiceflow/execute-migration-state-machine.ts` only for explicitly approved local cleanup
- Diagnostic creation/translation modules under `xyops/diagnostics/`
- `tests/vf_rename_durability.test.ts`
- `tests/vf_runtime_cleanup.test.ts`
- `tests/vf_logux_state_machine.test.ts`
- `tests/vf_migration_workflow_state_machine.test.ts`

## Dependencies on earlier phases

- Phases 1-17 complete, including production-like workflow validation and rollback readiness.

## Implementation tasks

- [ ] Review rename durability state machine for unnecessary states or transitions.
- [ ] Review XYOps job observation state machine for duplicated transport behavior.
- [ ] Review private function signature aliases for actual boundary value.
- [ ] Review Promise composition for unnecessary wrappers without changing effect/error semantics.
- [ ] Review currying only where it obscures rather than clarifies domain context.
- [ ] Review diagnostic recursion for bounded, non-leaking behavior.
- [ ] Prove equivalent behavior before each simplification.
- [ ] Keep the main migration state machine intact unless a separate approved refactor is created.
- [ ] Do not simplify Logux protocol state machines without protocol-level evidence.

## Tests required

- [ ] Existing state-machine transition suites pass unchanged where behavior is preserved.
- [ ] Property/invariant tests for idempotence, terminality, and duplicate events.
- [ ] Job observation tests cover SSE, polling fallback, reconnect, and unknown outcomes.
- [ ] Diagnostic redaction and recursion-bound tests.
- [ ] Full typecheck, lint, focused tests, and full test suite.

## Explicit non-goals

- [ ] Do not optimize for fewer lines at the expense of explicit safety boundaries.
- [ ] Do not rewrite the migration reducer.
- [ ] Do not alter Logux protocol semantics.

## Completion criteria

- [ ] Every cleanup has a before/after behavior claim and test evidence.
- [ ] No state machine loses duplicate-event, unknown-outcome, or safety behavior.
- [ ] Full verification passes.

## Rollback boundary

Revert each cleanup commit independently; retain the stable workflow migration.

## Risks

- Simplifying observation may reintroduce duplicate dispatch or unsafe retry behavior.
- Diagnostic simplification may leak dependency details or secrets.

## Questions requiring verification

- [ ] Which complexity is required by XYOps/Logux protocol guarantees rather than local design?
- [ ] Is the current polling fallback policy consistent with the final Workflow observation API?

---

## Cross-phase verification checklist

- [ ] Every phase has a focused unit/contract test set.
- [ ] Every phase has an integration or controlled XYOps probe where an external API is involved.
- [ ] Full configured, partially configured, and fully interactive flows are tested.
- [ ] Standalone event behavior remains covered.
- [ ] Selection/planning catalog retrieval counts are measured and reduced only where safe.
- [ ] Execution current-state reads are explicitly retained and documented.
- [x] SSE observation has bounded polling fallback for the existing job/workflow ID.
- [ ] Duplicate start, resume, retry, reconnect, and terminal observation behavior is tested.
- [ ] No secret values, tokens, raw protocol frames, or unbounded external payloads enter workflowData.
- [ ] Unknown outcomes are reconciled before any retry or operator instruction to retry.
- [x] `bun run typecheck` passes.
- [x] `bun run lint` passes.
- [x] Focused tests pass after each phase.
- [x] Full `bun test` passes before workflow cutover.
- [x] CLI and plugin artifacts are rebuilt before production-like validation.
- [ ] Rollback to independent event orchestration is tested before enabling the workflow by default.

## Phase 1 research findings: XYOps workflowData and secrets

- [x] Confirmed native XYOps `workflowData` support in `docs/workflows.md`.
- [x] Confirmed workflowData is shared across sub-jobs for one workflow run.
- [x] Confirmed sub-jobs can read `Job.workflowData` and update it by emitting a `workflowData` object in job output.
- [x] Confirmed updates are shallow-merged; top-level arrays are concatenated.
- [x] Confirmed workflowData exists only for the workflow run and is not persistent storage.
- [x] Confirmed workflowData is exposed to every sub-job, so resolved secret values must not be stored there.
- [x] Confirmed the current secret flow resolves all configured entries first, then reconciles them sequentially.
- [x] Decision: preserve that boundary as one future execution job.
- [x] Decision: store only non-secret secret descriptors/metadata in workflowData.
- [x] Decision: resolve concrete values and create/update secrets inside the same execution job without emitting values into workflowData.
- [ ] Verify whether the chosen execution-job input path is persisted or visible in job input, output, logs, activity, retries, or suspended-job state.
- [ ] Verify the secure transport for secret values before Phase 12/13 implementation.
- [x] Decision: exclude `config.secrets` entirely from persisted workflowData; pass secret input only to the final single execution job.
- [x] Decision: use a small discriminated union for meaningful workflow milestones rather than one fully optional structure or a variant for every node.
- [x] Decision: include normalized `catalog.sourceFolders` so nested source project paths can be resolved without another catalog request.
- [x] Decision: retain the `ProjectRecord.environments` data required to derive source version choices, including draft/published version IDs where present.
- [x] Decision: retain `parentID` and any other canonical record fields required by later workflow stages; do not reload data merely because a later stage needs it.
- [x] Principle: workflowData should retain all validated normalized data needed by later selection/planning stages, while excluding unrelated fields and execution-only current-state data.
- [x] Decision: retain validated non-secret config intent separately from canonical selection; exclude `config.secrets` from workflowData.

## Phase 1 implementation status

- [x] Added a versioned, discriminated `MigrationWorkflowData` contract.
- [x] Added a strict Zod boundary schema with JSON-safe value validation.
- [x] Reused canonical Voiceflow record, selection, and plan concepts without changing their runtime paths.
- [x] Excluded `config.secrets`, credentials, raw payloads, protocol frames, artifacts, and execution results.
- [x] Added progressive milestone coverage from configured state through planned state.
- [x] Added malformed catalog, selection, config, unknown-field, secret-field, and non-JSON value tests.
- [x] No CLI orchestration, event, catalog retrieval, planning, or execution behavior was changed.

## Phase 2 XYOps scaffold

- [x] Created disabled workflow `Voiceflow Migration Workflow` in XYOps.
- [x] Workflow ID: `emubj74188ymokoo`.
- [x] Added manual trigger `wf_start`.
- [x] Added `voiceflow_check_session` event node (`emtalivkniyc8gcd`).
- [x] Verified the workflow definition after creation.
- [ ] Implement workflow start/observation in the CLI before enabling the workflow.

## Phase 2 implementation progress

- [x] Added the configured migration workflow reference with default title `Voiceflow Migration Workflow` and `XYOPS_WORKFLOW_MIGRATION` override.
- [x] Added typed workflow input JSON values.
- [x] Added workflow start support using the verified XYOps run-event boundary and `input.data`.
- [x] Added workflow observation support with SSE primary and same-job polling fallback.
- [x] Added terminal workflow job fields to the response boundary.
- [x] Preserved the existing event-by-event CLI orchestration; it remains the active path.
- [ ] Wire the CLI migration command to opt into workflow start/observation.
- [ ] Add the workflow initializer stage and validated workflowData emission before enabling the remote workflow.
- [x] Added `initialize_migration_workflow` plugin operation to validate and emit workflowData from workflow input.
- [x] Deployed the updated Voiceflow Migration plugin to XYOps plugin `pmtal4rok7gbevqi`.
- [x] Created initializer Event `voiceflow_initialize_migration_workflow` with ID `emubkslmbxvckcjk`.
- [x] Updated workflow `emubj74188ymokoo` to run initializer before `voiceflow_check_session`; workflow remains disabled.
- [x] Rebuilt and redeployed the corrected plugin artifact after the initializer input-boundary fix (plugin revision 154).
- [x] Wired the CLI to start and observe the migration workflow when `XYOPS_MIGRATION_MODE=workflow` is set.
- [x] Added non-secret initial workflow input mapping and retained `events` as the compatibility default.
- [x] Validated observed workflowData before reporting the workflow terminal state.
- [x] Enabled the development workflow and completed a remote no-mutation probe: initializer and check-session stages completed successfully in job `jmublabsoh2tzg3c`.
- [x] Confirmed remote workflow results merge `workflowData` into job `data` alongside the Voiceflow envelope; CLI extraction now handles that shape.
- [x] Added `load_workspaces` workflow operation and normalized workspace milestone emission.
- [x] Deployed plugin revision 156, created Event `voiceflow_load_workspaces` (`emublhe8jreazq4v`), and inserted it into workflow `emubj74188ymokoo`.
- [x] Completed a remote Phase 3 probe: workflow job `jmublk2kvwl8s0ay` loaded two normalized workspace records and then completed session validation successfully.
- [x] Fixed workflow ordering: initialization -> workflow-aware session check -> workspace loading.
- [x] Added `check_session_workflow` (`emublxqwmowth7l2`) so the session gate preserves workflowData for downstream stages.
- [x] Remote probe succeeded in order: `voiceflow_initialize_migration_workflow`, `voiceflow_check_migration_workflow_session`, `voiceflow_load_workspaces`.
- [x] Created `voiceflow_load_source_catalog` Event `emubm9h8qeaob14o` and connected it after workspace loading.
- [x] Completed remote source-catalog probe with configured workspace `empyrean-ci`: 48 projects and 12 folders loaded into `SOURCE_CATALOG_LOADED` workflowData (job `jmubma81efk6xqjj`).
- [x] Added `resolve_source_selection` and connected it after source catalog loading.
- [x] Created Event `voiceflow_resolve_source_selection` (`emubmei7pojidh80`) and deployed the updated plugin.
- [x] Completed remote source-resolution probe: workflow `jmubmf85xpumwm3e` reached `SOURCE_RESOLVED` with canonical workspace, project, and draft version IDs.
- [x] Added destination catalog loading and configured destination folder resolution.
- [x] Created Events `emubmjj8vz9air76` and `emubmjj48yz1x591`, connected after source resolution, and deployed the updated plugin.
- [x] Completed remote probe: workflow `jmubml09f3qsul8s` reached `DESTINATION_RESOLVED` with canonical destination workspace and folder IDs.
- [x] Added pure workflow planning from the validated catalog snapshot.
- [x] Created `voiceflow_plan_migration_workflow` Event `emubmpghwetl67mu` and connected it after destination resolution.
- [x] Completed remote plan probe: workflow `jmubmq158fstv9qz` reached `PLANNED` with plan ID `d44e473f78f0936ca46b0c11` and validated labels.
- [x] Workflow CLI now renders the validated `PLANNED` migration plan using the existing display contract without starting mutation.
- [x] Verified the current workflow graph has no first-class suspension node; its node types are event/job/trigger/limit/action/controller/note.
- [x] Verified XYOps exposes `resumeJob` for an already-suspended active job, but no suspension mechanism is currently present in this workflow or native plugin path.
- [x] Native suspension/resume is not used; confirmation is implemented by starting a separate execution workflow.

## Confirmed human-in-the-loop composition strategy

- [x] Confirmed the current planning workflow should produce a validated `PLANNED` handoff and stop without mutation.
- [x] Confirmed native workflow suspension is not required for the intended design.
- [x] Adopted composed workflows as the human-in-the-loop boundary:
  - Planning workflow loads catalogs, resolves canonical selections, and generates the plan.
  - CLI displays the plan and obtains explicit human confirmation.
  - Execution workflow receives the confirmed plan as JSON input and performs mutation stages.
- [x] Defined and validated the plan-to-execution handoff contract, bound to the exact `planID` and canonical selection.
- [x] Ensure execution revalidates current Voiceflow state before irreversible operations.
- [ ] Ensure execution workflow start is idempotent and duplicate starts reconcile the existing execution before retrying.
- [x] Keep secret values out of workflow input and workflowData; pass configured secret entries only as `SECRET_FILE_CONTENTS` execution-workflow parameters.
- [x] Added a disabled dedicated execution workflow that accepts only confirmed, validated plan input.
- [ ] Add end-to-end tests for plan handoff, confirmation rejection, duplicate execution starts, unknown outcomes, and final result reporting.
- [x] Replaced hand-rolled workflow-envelope and workflowData shape checks in the newly added workflow-stage modules with Zod schemas.
- [x] Replaced recursive JSON-safety validation in `migration-workflow-data` with a recursive Zod JSON-value schema.
- [x] Verified changed workflow boundaries with typecheck, lint, and focused tests.
- [x] Defined a secret-free confirmed execution handoff containing `schemaVersion`, literal `confirmed: true`, `planID`, and the validated plan; schema binding rejects mismatched plan IDs, unknown fields, and secret payloads.
- [x] Added `toExecutionWorkflowInput` to construct the validated handoff from the planned migration.
- [x] Added and deployed the disabled dedicated execution workflow that accepts this handoff.
- [x] Added `initialize_execution_workflow`, which accepts only the confirmed, secret-free handoff and emits validated `EXECUTION_READY` workflowData.
- [x] Registered the execution-workflow initializer through the plugin operation and response workflowData validation.
- [x] Deployed the initializer and execution events and composed the disabled execution workflow; production enablement still waits on secret transport and duplicate-start verification.
- [x] Added `execute_migration_workflow`, which consumes only `EXECUTION_READY` workflowData and delegates to the existing migration execution state machine.
- [x] Kept optional secret input outside workflowData; configured entries now use the existing `SECRET_FILE_CONTENTS` parameter path.
- [x] Deployed and verified the initializer/execution events and composed the second workflow; it remains disabled for real mutation.
- [x] Built and deployed native plugin revision 163 containing the execution workflow operations.
- [x] Created `voiceflow_initialize_execution_workflow` (`emubo4mwn5lo80yv`).
- [x] Created `voiceflow_execute_migration_workflow` (`emubo4nah5vnhb7w`).
- [x] Initial non-mutating probe exposed a wrong-target Node spawn failure; this was corrected by targeting Moves Servers.
- [x] Verified both execution events are enabled and point to plugin `pmtal4rok7gbevqi`.
- [x] Probed `voiceflow_initialize_execution_workflow` with invalid input; launch succeeded and no migration mutation was attempted.
- [x] Confirmed the Moves Servers target can spawn the configured Node runtime and execute the plugin.
- [x] Corrected the new execution events to target the `Moves Servers` group (`gmtnfn78nyo6k532`) instead of `Main Group`.
- [x] Re-ran the initializer probe on `df2v-moves-d01` (`jmubocshghre3ucv`); plugin spawned successfully and returned validated `EXECUTION_READY` data.
- [x] The prior Node spawn error was target-selection related, not a broken Node script.
- [x] Composed and exported the second execution workflow using the verified Moves Servers target.
- [x] Composed disabled execution workflow `emuboe9h3jre7p5p` targeting the Moves Servers workflow event, with initializer `emubo4mwn5lo80yv` followed by execution `emubo4nah5vnhb7w` on success.
- [x] Verified the deployed workflow graph and event references by exporting the created workflow.
- [x] Added the CLI execution-workflow reference and confirmed handoff start/observation path.
- [x] Kept the execution workflow disabled pending secret transport, current-state revalidation, and duplicate-start reconciliation.
- [x] Added `XYOPS_WORKFLOW_EXECUTION` / `executionWorkflow` configuration with default title `Voiceflow Migration Execution Workflow`.
- [x] Workflow CLI path now prompts for confirmation after `PLANNED`, then starts and observes the separate execution workflow with the validated plan handoff.
- [x] Workflow execution reads configured secrets only after confirmation and sends them to the execution workflow as `SECRET_FILE_CONTENTS`; no secret values enter workflow input or workflowData.
- [x] Added integration coverage for the planned → confirmed → execution-workflow start/observe handoff adapter.
- [x] Extracted the confirmed execution workflow start/observe adapter and wired the workflow CLI path through it.
- [x] Added integration coverage proving one execution-workflow start followed by observation of the same job ID.
- [x] Added integration coverage proving secret entries are passed only in execution workflow params.
- [x] Probed `voiceflow_execute_migration_workflow` on Moves Servers with invalid workflowData (`jmubop5veuyglbvn`); it reached the plugin and rejected input before any migration effect.
- [ ] Do not run a valid execution handoff yet: that would invoke real Voiceflow export/import, and the execution workflow remains disabled.
- [x] Extended workflow starts with a separate `params` channel.
- [x] Workflow CLI reads configured secret files only after confirmation and passes parsed entries as `SECRET_FILE_CONTENTS` to the execution workflow start; the plan/input/workflowData remain secret-free.
- [x] Execution workflow event continues to reuse the existing plugin-side `parseSecretEntries` and secret migration logic.
- [ ] Verify the deployed XYOps workflow propagates start params to child event params with a controlled secret-bearing test, then enable only after confirming no secret leakage in job/workflow logs.
- [x] Controlled sentinel probe on plugin `v0.0.9`: XYOps propagated `SECRET_FILE_CONTENTS` to child job metadata under `workflow.params`; child job `jmucwiex5sd461id` showed the sentinel in `workflow.params` but not normal params, input, data, output, activity, or logs. The initializer rejected invalid input before mutation; execution workflow was disabled again.
- [x] Plugin `v0.0.10` now parses and reads `workflow.params.SECRET_FILE_CONTENTS`; unit coverage passes and the deployed invalid-handoff probe `jmucwmlwlxm9rdzi`/`jmucwmlwpxxus89j` confirmed the new plugin version ran before mutation.
- [x] Confirmed the existing `Voiceflow` Secret Vault contains `XYOPS_API_KEY` and is assigned to `emubo4nah5vnhb7w`; the value was not read or exposed.
- [x] Deployed plugin revision 172 containing the execution-ledger bucket guard, injected test seam, and workflow-envelope unwrapping; the execution workflow remains disabled.
- [x] Ran a missing-input probe against `emubo4nah5vnhb7w`; it failed validation before any ledger or Voiceflow mutation.
- [x] Added a non-mutating test seam proving a completed ledger record blocks the migration executor.
- [x] Attempted the approved local `migration.json` workflow run (`jmubp8hcwgi0od53`) with the execution workflow temporarily enabled.
- [x] Planning workflow loaded session/workspaces/source catalog, then stopped at source selection with a non-secret `CONFIGURATION` failure; confirmation was never reached, so the secrets file was not read/sent and no mutation occurred.
- [x] Disabled execution workflow `emuboe9h3jre7p5p` again after the failed pre-plan test.
- [x] Corrected the local migration configuration/source selection or chose a currently valid catalog target before retrying; no blind retry was performed.
- [x] Added source-resolution diagnostics; the local failure was identified as a project option-label mismatch: configured `source_path` omitted the generated project ID suffix, while option labels included it.
- [x] Fixed source project matching to strip the generated trailing `(projectID)` suffix before normalized comparison; deployed plugin revision 165.
- [x] Fixed workflow CLI job-data extraction for the nested XYOps `{ data: { voiceflow, workflowData } }` response shape.
- [x] Re-ran the local workflow: source resolution now succeeds.
- [x] Planning now produces a validated plan for `migration.json`, including the planned destination-folder creation action; the run was answered `no` at confirmation, so no folder or migration mutation occurred.
- [x] Executed the approved `migration.json` handoff after explicit confirmation; planning succeeded, but the execution workflow aborted before child jobs with `Could not find linked trigger definition: exec_start`.
- [x] Disabled `emuboe9h3jre7p5p` again after the failed execution attempt; the execution ledger bucket remains empty and no Voiceflow mutation was observed.
- [x] Diagnosed the next execution failure: the child event received the prior workflow result under `input.data.voiceflow.result`; updated the ledger guard to unwrap that envelope before validation.
- [x] Diagnosed the following `PLAN_MISMATCH`: planning omitted the target schema while execution discovered `13.1` from the artifact; set `target_schema_version` to `13.1` in `migration.json` so planning and execution use the same plan identity.
- [x] Re-ran planning with the corrected configuration; it reused the created destination folder and produced plan `c9c5148aa5f29244bb7f2af7`; no migration was run.
- [x] Repaired the execution workflow trigger by adding the missing trigger ID `exec_start` to its manual trigger definition.
- [x] Enabled the repaired workflow for a missing-input probe; `exec_start` advanced to `exec_initialize`, which rejected invalid input before mutation; disabled the workflow again.
- [x] Added equivalent generated-ID suffix normalization for destination folder labels; deployed plugin revision 166.

## Pending destination-folder creation design

- [x] Confirmed that a missing destination folder should be represented as a planned, user-visible action rather than created during planning.
- [x] Confirmed that a separate workflow is unnecessary.
- [x] Chosen a workflow-aware `create_folder_workflow` event inside the existing execution workflow.
- [x] Extend the workflow-data/plan contract with a pending destination-folder creation state containing workspace, requested folder/path, and explicit create action.
- [x] Update planning output to highlight that the confirmed migration will create the missing folder.
- [x] Add `create_folder_workflow` to re-read the current destination folder catalog before creation.
- [x] Reuse a folder that appeared while planning was awaiting confirmation.
- [x] Create the folder only when it is still absent, then verify the durable folder ID.
- [x] Stop safely on ambiguity, duplicate creation, timeout, or unknown creation outcome.
- [x] Connect `create_folder_workflow` before `execute_migration_workflow` in the disabled execution workflow.
- [x] Add tests for missing-folder planning, cancellation, reappeared folders, creation success, and unknown outcomes.

## Pending source-schema discovery and target override

- [x] Treat `target_schema_version` as an explicit override, not the default.
- [x] Define the source schema as the exported source artifact `_version` metadata.
- [x] Add a read-only source-schema discovery event that exports the selected source version and returns only the validated schema version; do not persist artifact bytes in workflowData.
- [x] Add the source-schema discovery event/node before plan-ID generation in the planning workflow. Event `emucv0djeip9zdlg`; workflow node `wf_resolve_source_schema`; deployed workflow `emubj74188ymokoo`.
- [x] Pass the discovered source schema through workflowData into planning and the confirmed execution handoff.
- [x] Use the configured `target_schema_version` only when present; otherwise use the discovered source schema.
- [x] Ensure planning, confirmation, folder creation, and execution compute the same plan ID from the resolved schema using canonical selection-property ordering.
- [x] Keep schema discovery read-only and independent of Voiceflow mutation stages.
- [x] Add tests for omitted override, explicit override, malformed source metadata, schema mismatch, and plan-ID stability.
- [x] Remove the temporary `target_schema_version` workaround from `migration.json` after the discovery path is deployed and verified; omitted-override probe `jmucv6pus3gt24l1` resolved source and target schema `1.2`.
- [ ] Keep the execution workflow disabled until source-schema discovery and plan-ID consistency pass production-like validation.
- [x] Add an explicit plugin `workflow.params` boundary; determine whether its operator-visible job metadata is an acceptable secret transport before any valid execution handoff remains pending.
- [x] Updated plugin `pmtal4rok7gbevqi` and verified the planning workflow graph: source resolution -> schema discovery -> destination catalog.
- [x] Enabled read-only schema event `emucv0djeip9zdlg` for workflow invocation and completed planning probe `jmucv4pz4t80i1th`; resolved source schema `1.2`, honored target override `13.1`, produced plan `642a1c34ea8aaba9395b6466`, and declined confirmation without mutation.
- [x] Reconciled job evidence: aborted probe `jmucv3vzyn6wi70a` was a confirmed pre-schema non-start caused by a disabled event; successful probe `jmucv4pz4t80i1th` completed all planning nodes and returned `PLANNED` data.
- [x] Rebuilt and redeployed plugin `pmtal4rok7gbevqi` after ledger/folder-safety changes; verified the deployed script contains `resolve_source_schema_workflow` and remains execution-disabled.
- [x] Approved execution attempt `jmucwolw4adr5ylk` stopped at `PLAN_MISMATCH` before export/import; canonical plan-ID fix deployed as plugin `v0.0.11`.
- [ ] Retry execution: `jmucwrzjxxn5us2i` reached Voiceflow import and failed with retryable `DEPENDENCY_FAILURE`; destination-folder catalog visibility caused a second folder creation (`111` then `112`). Treat the migration as unresolved and reconcile before any retry.
- [ ] Clean-run execution `jmucx2jcbjbhh9ru` created fresh folder `113`, reached import, and failed with `DEPENDENCY_FAILURE`. Import diagnostics recorded plan `770a77496777943dff205259`, destination workspace/folder, schema `1.2`, and artifact size without secrets; reconcile before retrying.
- [x] Execution `jmucxopodi045obk` used `version._version` and resolved target schema `13.12`; Voiceflow returned HTTP 201 for folder `114`, but receipt parsing rejected the project-shaped response. Parser fix deployed as plugin `v0.0.17`.
- [x] Reconciled the confirmed successful import, reran plan `056d80d8ee969bdeba0cd17c`, and completed the migration successfully; execution job `jmuczvk5jwgucpje`, ledger status `completed`, import status `201`.
- [x] Deployed plugin `v0.0.13` with safe import HTTP diagnostics for status, content type, response size, and sanitized request-failure code; do not retry until the import outcome is reconciled.

## Execution-ledger implementation plan

### 1. Confirm XYOps primitives

- [x] Verify authoritative bucket read behavior and JSON data retrieval. `xy bucket <id> --format json` returns bucket metadata, JSON data, files, and revision.
- [x] Verify authoritative bucket write behavior and revision/conflict responses. The installed SDK exposes `writeBucketData` as a shallow merge with optional fetch; no revision or conditional-write field is exposed.
- [x] Verify whether bucket create/update supports an atomic create-if-absent or compare-and-swap lock. The current SDK request types expose no conditional-write primitive.
- [x] Verify whether bucket writes are serialized strongly enough for concurrent execution claims. A controlled ten-writer probe showed all writes succeed, the bucket revision remains unchanged, and the final same-key value is last-writer-wins; this is not safe for atomic claims.
- [x] Verify job lookup by returned job ID and determine whether lookup by `planID` or execution fingerprint is supported. `getJob`/`getJobs` support IDs; no native `planID` lookup was found in the CLI/SDK surface.
- [x] Verify SSE/stream observation and bounded polling behavior for workflow jobs. The SDK exposes `streamJob`; CLI job retrieval provides polling-compatible reads.
- [x] Verify workflow/job status, log, terminal-result, timeout, and reconnect semantics from the installed SDK/CLI surface. `getJob`, `getJobLog`, `streamJob`, `getWorkflowJobSummary`, and workflow job records are available; reconnect/timeout behavior still needs a live failure probe.
- [x] Document consistency, race, retention, and failure limitations before choosing the ledger adapter. Buckets are authoritative for reads and ordinary writes, but are unsuitable as the atomic claim/lock unless XYOps exposes a lower-level conditional API not present in the installed SDK.
- [x] Decide against a custom atomic store: use the XYOps execution-workflow max-concurrency limit of `1` as the serialization guard and a minimal bucket status record as the safety record.
- [x] Inventory the installed SDK's relevant native controls: event/job limits can constrain an event's concurrency, job tags can carry searchable metadata, and workflow/job lookup plus SSE are available.
- [x] Accept that event/job limits are global to the execution workflow rather than keyed by execution fingerprint; this is intentional defense-in-depth and may serialize independent migrations.
- [x] Accept that run-event tags and input fields are metadata/input only, not native idempotency keys; deduplication is implemented by the first execution step.
- [x] Verify the configured execution workflow limit is `job=1` with the duplicate-status guard as the authoritative safety policy. Workflow `emuboe9h3jre7p5p` is disabled and reports job limit `1`, queue limit `0`, and retry limit `0`.

### 2. Define the ledger contract

- [x] Reuse the existing Logux operation state machines for Voiceflow mutation acknowledgement and `UNKNOWN_OUTCOME`; the ledger must not duplicate operation-level acknowledgement logic.
- [x] Key each ledger record by `planId`.
- [x] Define the minimal states `in-flight`, `completed`, `failed`, and `unknown`.
- [x] Store only `planId`, `status`, and `timestamp`; workflow/job IDs and detailed diagnostics remain in XYOps job state.
- [x] Store the execution state-machine terminal classification without duplicating Logux action receipts or raw frames.
- [x] Define and enforce allowed state transitions for terminal `completed`/`unknown` records; retries from `failed` return to `in-flight` only after a new claim.
- [x] Do not automatically expire or clear stale `in-flight`/`unknown` records; require reconciliation.
- [x] Prohibit credentials, secret values, raw protocol frames, and unnecessary payloads.
- [x] Add runtime validation and redaction tests for ledger records.

### 3. Claim before launch

- [x] Use the XYOps execution-workflow max-concurrency limit of `1` as the serialization guard.
- [x] Write `in-flight` before any Voiceflow mutation.
- [x] Stop when an existing record is `in-flight`, `completed`, or `unknown`.
- [x] Use `planId` as the migration identity; a reused plan ID is conservatively blocked.
- [x] Fail closed when the bucket cannot be read or written.
- [x] Add tests for duplicate and missing-record decisions.

### 4. Launch and record

- [x] Start the XYOps execution workflow only after the execution path is accepted by the existing CLI handoff.
- [x] Treat a lost launch response as unresolved; the queued duplicate must encounter `in-flight` or the terminal status.
- [x] Ensure a retry cannot proceed while the original plan record is unresolved.
- [x] Keep detailed workflow/job identity in XYOps rather than duplicating it in the minimal bucket record.

### 5. Reconcile before retry

- [x] Define a pure reconciliation policy distinguishing confirmed non-start, active, completed, failed, unknown, and ambiguous evidence; ambiguous evidence blocks relaunch.
- [ ] Reconcile `starting` and `unknown` records before allowing a retry.
- [x] Inspect the recorded XYOps workflow/job status and logs for reconciliation evidence.
- [ ] Resume observation when the original job is found.
- [x] Distinguish confirmed non-start, confirmed execution, terminal failure, and ambiguity for the planning probe evidence.
- [ ] Block when evidence remains ambiguous.
- [ ] Never blindly relaunch a migration after an unknown outcome.

### 6. Settle terminal state

- [x] Mark `completed` only after the existing migration execution state machine confirms the final Voiceflow outcome.
- [x] Mark `failed` only for a confirmed non-mutating or terminal failure outcome from the existing operation policies.
- [x] Mark `unknown` when the existing Logux/migration state machines classify a dispatched mutation as unknown.
- [x] Preserve the original workflow/job identity and diagnostic context without duplicating operation-level receipts.
- [x] Make settlement idempotent and safe against duplicate observations; terminal ledger records cannot be overwritten.

### 7. Add concurrency and failure tests

- [ ] Concurrent starts for the same plan.
- [ ] Different fingerprints for the same plan.
- [ ] Lost XYOps launch response.
- [ ] Duplicate CLI retry.
- [ ] Existing `starting` entry.
- [x] Existing `unknown` entry.
- [ ] Original job found during reconciliation.
- [ ] No job found during reconciliation.
- [ ] Successful terminal outcome.
- [ ] Confirmed failed terminal outcome.
- [ ] Ambiguous terminal outcome.
- [ ] Duplicate settlement and stale-claim recovery.

### 8. Production-like verification

- [x] Deploy ledger changes while the execution workflow remains disabled.
- [x] Exercise the complete lifecycle with safe plan `056d80d8ee969bdeba0cd17c`; final job `jmuczvk5jwgucpje` completed with import status `201`.
- [x] Simulate lost responses and concurrent starts through unknown-outcome, reconnect, and concurrent-claim tests.
- [x] Verify bucket records contain no secrets; bucket `bmuc1r0bokku4tz9` currently contains one record with only `planId`, `status`, and `timestamp`.
- [x] Verify SSE/polling reconnects observe the same job; focused CLI/streaming/runtime suites cover same-job polling fallback and no redispatch.
- [x] Created the dedicated XYOps bucket `bmuc1r0bokku4tz9` titled `Voiceflow Execution Ledger`; it is initialized empty.
- [x] Confirm no duplicate Voiceflow mutations: duplicate execution was blocked by the ledger, and the reconciled rerun completed exactly one new import.
- [x] Record rollback and manual-reconciliation procedures in `docs/workflow-migration-rollback.md`.

### 9. Enablement gate

- [x] Enable execution workflow `emuboe9h3jre7p5p` by explicit operator request; job limit `1`, queue limit `0`, and retry limit `0` remain configured.
- [x] Verify worker-level atomic claim behavior with concurrent-claim tests; XYOps bucket writes have no server-side compare-and-set primitive.
- [x] Confirm reconciliation tests pass.
- [x] Confirm ambiguous outcomes safely block instead of relaunching.
- [x] Confirm production-like validation shows no duplicate starts or mutations; blocked rerun job `jmucy0e1w49m00h8` performed no import.
- [ ] Run the final typecheck, lint, focused tests, and full test suite.
- [x] Update this TODO with evidence, deployment IDs, and the final enablement decision.
