# Type Inventory

## Summary

- Source files scanned: **119**
- Files exporting types: **52**
- State-machine files: **7**
- Event-definition files: **8**
- Effect-definition files: **7**
- Schema files: **18**

## CLI

- `xyops/cli/client/http.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/client/index.ts`
- `xyops/cli/client/job-observation-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/cli/client/job-response.ts`
- `xyops/cli/client/polling.ts`
- `xyops/cli/client/streaming.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/diagnostics.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/guards.ts`
- `xyops/cli/migration/execution.ts`
- `xyops/cli/migration/index.ts`
- `xyops/cli/migration/planning.ts`
- `xyops/cli/migration/secret-input.ts`
- `xyops/cli/migration/selection.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/progress.ts`
- `xyops/cli/prompt.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/secrets.ts`
- `xyops/cli/types.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/validation.ts`

## Plugin

- `xyops/plugin/contracts.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/diagnostics.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/job_validation.ts`
- `xyops/plugin/operation_dispatch.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/operations.ts`
- `xyops/plugin/stdin_job.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/types.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/validation_fault.ts`
- `xyops/plugin/wire_protocol.ts`

## Migration workflow

- `xyops/migration-parameters.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/execute-migration-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/voiceflow/execute_migration/arguments.ts`
- `xyops/voiceflow/execute_migration/effect-runner.ts`
  - re-export only
- `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/execute_migration/effect-runner/failure-mapping.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/control.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts`
- `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
- `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
- `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: yes
- `xyops/voiceflow/execute_migration/index.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/execute_migration/warnings.ts`

## Voiceflow core

- `xyops/voiceflow/api_key.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/archive.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/auth.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/check_session.ts`
- `xyops/voiceflow/contracts.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/create_folder.ts`
- `xyops/voiceflow/debug.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/guards.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/list_folders.ts`
- `xyops/voiceflow/list_projects.ts`
- `xyops/voiceflow/list_versions.ts`
- `xyops/voiceflow/list_workspaces.ts`
- `xyops/voiceflow/regex.ts`
- `xyops/voiceflow/types.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/urls.ts`
- `xyops/voiceflow/uuid.ts`
- `xyops/voiceflow/validation.ts`

## Voiceflow REST

- `xyops/voiceflow/export.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/http/body.ts`
- `xyops/voiceflow/http/index.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no

## Voiceflow catalog

- `xyops/voiceflow/catalog/index.ts`
  - re-export only
- `xyops/voiceflow/catalog/options.ts`
- `xyops/voiceflow/catalog/record-parsers.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/catalog/rename-barrier.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: no

## Voiceflow Logux transport

- `xyops/voiceflow/logux/catalog-frames.ts`
- `xyops/voiceflow/logux/connection.ts`
  - exports types: yes
  - defines state: no
  - defines events: yes
  - defines effects: no
- `xyops/voiceflow/logux/frame-contract.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/logux/index.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no

## Voiceflow Logux state machines

- `xyops/voiceflow/logux/catalog-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/voiceflow/logux/create-folder.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/logux/create-secret.ts`
- `xyops/voiceflow/logux/folder-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/voiceflow/logux/rename-project.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/logux/rename-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/voiceflow/logux/secret-state-machine.ts`
  - exports types: yes
  - defines state: yes
  - defines events: yes
  - defines effects: yes
- `xyops/voiceflow/logux/update-secret.ts`

## Planning

- `xyops/voiceflow/plan_migration.ts`
- `xyops/voiceflow/planning/index.ts`
- `xyops/voiceflow/planning/plan-id.ts`

## Import

- `xyops/voiceflow/import/index.ts`
- `xyops/voiceflow/import/input.ts`

## Secrets

- `xyops/voiceflow/secrets.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no

## Diagnostics

- `xyops/diagnostics/create.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/diagnostics/next_action.ts`
- `xyops/diagnostics/outcome.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/diagnostics/redact.ts`
- `xyops/diagnostics/result.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/diagnostics/types.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no

## Schemas

- `xyops/cli/schemas/catalog-results.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/diagnostics.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/migration-config.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/migration-results.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/session.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/voiceflow-envelope.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/schemas/xyops-responses.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/schemas/native_plugin_job.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/schemas/operation_parameter.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/plugin/schemas/plugin_response.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/catalog/schemas/catalog_record.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/import/schemas/receipt.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/logux/schemas/action.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/logux/schemas/frame.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/schemas/auth_claims.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/schemas/existing_secret.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/schemas/export_payload.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/voiceflow/schemas/secret_entry.ts`
  - exports types: no
  - defines state: no
  - defines events: no
  - defines effects: no

## Configuration

- `xyops/cli/config.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no
- `xyops/cli/file-path.ts`
- `xyops/cli/state.ts`
  - exports types: yes
  - defines state: no
  - defines events: no
  - defines effects: no

## Tests


## Build and entrypoints

- `xyops/cli/index.ts`
- `xyops/plugin/entrypoint.ts`
- `xyops/plugin/process_entrypoint.ts`
- `xyops/plugin/version.ts`

## Files requiring review

- None identified in Pass 1; ownership was assigned from source paths and imports/exports.


## Pass 2 Analysis

> This pass documents the current exported type declarations only. No source or test files were changed. Re-export-only entries point to their original declaration for field analysis.

## Group: CLI

### `Sleep`
- Source: `xyops/cli/client/http.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/voiceflow/catalog/rename-barrier.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/http.ts`
- Related types:
  - Types in `xyops/cli/client/http.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RequestBody`
- Source: `xyops/cli/client/http.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/client/http.ts`
- Related types:
  - Types in `xyops/cli/client/http.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Request`
- Source: `xyops/cli/client/http.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/http.ts`
- Related types:
  - Types in `xyops/cli/client/http.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `StreamResponseReader`
- Source: `xyops/cli/client/http.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/client/http.ts`
- Related types:
  - Types in `xyops/cli/client/http.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `JobObservationState`
- Source: `xyops/cli/client/job-observation-state-machine.ts`
- Category: State
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/job-observation-state-machine.ts`
- Related types:
  - Types in `xyops/cli/client/job-observation-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"DISPATCHED"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"STREAMING"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"POLLING"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"SUCCEEDED"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `diagnosticCode` | `CliDiagnosticCode` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"UNKNOWN_OUTCOME"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `diagnosticCode` | `CliDiagnosticCode` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `JobObservationEffect`
- Source: `xyops/cli/client/job-observation-state-machine.ts`
- Category: Effect
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/job-observation-state-machine.ts`
- Related types:
  - Types in `xyops/cli/client/job-observation-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"start-stream"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"start-polling"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `JobObservationEvent`
- Source: `xyops/cli/client/job-observation-state-machine.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/job-observation-state-machine.ts`
- Related types:
  - Types in `xyops/cli/client/job-observation-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"execute-dispatched"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"stream-failed"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"polling-started"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"stream-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"job-active"` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"job-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"job-failed"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"observation-failed"` | yes | Current declaration property. | Consumers listed above. |
| `diagnosticCode` | `CliDiagnosticCode` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"poll-timeout"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `JobObservationTransition`
- Source: `xyops/cli/client/job-observation-state-machine.ts`
- Category: Transition
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/client/job-observation-state-machine.ts`
- Related types:
  - Types in `xyops/cli/client/job-observation-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `JobObservationState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly JobObservationEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `StreamJob`
- Source: `xyops/cli/client/streaming.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/client/streaming.ts`
- Related types:
  - Types in `xyops/cli/client/streaming.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CliError`
- Source: `xyops/cli/diagnostics.ts`
- Category: Error
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/http.ts`
  - `xyops/cli/client/polling.ts`
- Producers:
  - Declaration and export: `xyops/cli/diagnostics.ts`
- Related types:
  - Types in `xyops/cli/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CliDiagnostic`
- Source: `xyops/cli/diagnostics.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/cli/diagnostics.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CliDiagnosticCode`
- Source: `xyops/cli/diagnostics.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/types.ts`
  - `xyops/cli/client/job-observation-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/cli/diagnostics.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SelectSourceSelection`
- Source: `xyops/cli/migration/selection.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/migration/selection.ts`
- Related types:
  - Types in `xyops/cli/migration/selection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SelectDestinationSelection`
- Source: `xyops/cli/migration/selection.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/migration/selection.ts`
- Related types:
  - Types in `xyops/cli/migration/selection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PromptLifecycle`
- Source: `xyops/cli/prompt.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/prompt.ts`
- Related types:
  - Types in `xyops/cli/prompt.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `beforeAsk` | `() => void` | yes | Current declaration property. | Consumers listed above. |
| `afterAsk` | `() => void` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PromptReader`
- Source: `xyops/cli/prompt.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/migration/secret-input.ts`
  - `xyops/cli/migration/selection.ts`
- Producers:
  - Declaration and export: `xyops/cli/prompt.ts`
- Related types:
  - Types in `xyops/cli/prompt.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ask` | `(question: string) => Promise<string>` | yes | Current declaration property. | Consumers listed above. |
| `close` | `() => void` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Option`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/index.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/prompt.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationSelection`
- Source: `xyops/cli/types.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
  - `xyops/voiceflow/execute_migration/arguments.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/planning/plan-id.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `sourceWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceProjectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceVersionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationFolderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `targetSchemaVersion` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: targetSchemaVersion
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationPlan`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/cli/migration/planning.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `selection` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |
| `labels` | `Readonly<{` | yes | Current declaration property. | Consumers listed above. |
| `sourceProject` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceVersion` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationWorkspace` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationFolder` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowWarning`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/migration/execution.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowSuccess`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `true` | yes | Current declaration property. | Consumers listed above. |
| `operation` | `string` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `result` | `T` | yes | Current declaration property. | Consumers listed above. |
| `warnings` | `readonly VoiceflowWarning[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `operation` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `operation`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowFailure`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `false` | yes | Current declaration property. | Consumers listed above. |
| `operation` | `string` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `error` | `Readonly<{` | yes | Current declaration property. | Consumers listed above. |
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `Diagnostic` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `operation` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `operation`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowEnvelope`
- Source: `xyops/cli/types.ts`
- Category: Envelope
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/validation.ts`
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/plugin/types.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/plugin/wire_protocol.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ResponseSchema`
- Source: `xyops/cli/types.ts`
- Category: Schema
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/validation.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsResponse`
- Source: `xyops/cli/types.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/client/http.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `description` | `string` | no | Current declaration property. | Consumers listed above. |
| `id` | `string` | no | Current declaration property. | Consumers listed above. |
| `job` | `unknown` | no | Current declaration property. | Consumers listed above. |
| `data` | `unknown` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: description, id, job, data
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `NativePluginResponse`
- Source: `xyops/cli/types.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `xy` | `1` | yes | Current declaration property. | Consumers listed above. |
| `complete` | `true` | yes | Current declaration property. | Consumers listed above. |
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `data` | `Readonly<{ voiceflow: unknown }>` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsLaunchResponse`
- Source: `xyops/cli/types.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsStreamEventType`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/schemas/xyops-responses.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsStreamEvent`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/streaming.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `type` | `XYOpsStreamEventType` | yes | Current declaration property. | Consumers listed above. |
| `data` | `Record<string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `type` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `type`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsStreamLimits`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/streaming.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `maxBytes` | `number` | no | Current declaration property. | Consumers listed above. |
| `maxFrameBytes` | `number` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: maxBytes, maxFrameBytes
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsStreamJob`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/streaming.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsStreamResult`
- Source: `xyops/cli/types.ts`
- Category: Result
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/streaming.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"success"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `data` | `Record<string` | yes | Current declaration property. | Consumers listed above. |
| `requiresJobResponse` | `true` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"failure"` | yes | Current declaration property. | Consumers listed above. |
| `jobID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `data` | `Record<string` | yes | Current declaration property. | Consumers listed above. |
| `requiresJobResponse` | `true` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsJobState`
- Source: `xyops/cli/types.ts`
- Category: State
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `state/stage discriminant` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `state/stage discriminant`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsJob`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/client/polling.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | no | Current declaration property. | Consumers listed above. |
| `state` | `string` | no | Current declaration property. | Consumers listed above. |
| `progress` | `number` | no | Current declaration property. | Consumers listed above. |
| `completed` | `boolean | number | null` | no | Current declaration property. | Consumers listed above. |
| `code` | `number | string` | no | Current declaration property. | Consumers listed above. |
| `description` | `string` | no | Current declaration property. | Consumers listed above. |
| `output` | `string | null` | no | Current declaration property. | Consumers listed above. |
| `data` | `unknown` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: id, state, progress, completed, code, description, output, data
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsJobResponse`
- Source: `xyops/cli/types.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `job` | `XYOpsJob & Readonly<{ id: string }>` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsWaitJob`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `description` | `string` | no | Current declaration property. | Consumers listed above. |
| `output` | `string | null` | no | Current declaration property. | Consumers listed above. |
| `data` | `unknown` | no | Current declaration property. | Consumers listed above. |
| `completed` | `boolean | number | null` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: description, output, data, completed
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsWaitResponse`
- Source: `xyops/cli/types.ts`
- Category: Protocol response
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `number | string` | yes | Current declaration property. | Consumers listed above. |
| `description` | `string` | no | Current declaration property. | Consumers listed above. |
| `job` | `XYOpsWaitJob` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: description
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExecuteResult`
- Source: `xyops/cli/types.ts`
- Category: Result
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/index.ts`
  - `xyops/cli/migration/execution.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `exportStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `exportBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `selected` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |
| `imported` | `Readonly<{ projectID: string` | yes | Current declaration property. | Consumers listed above. |
| `apiKeyRetrieved` | `boolean` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: apiKeyRetrieved
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ConfigSecret`
- Source: `xyops/cli/types.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/cli/secrets.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `key` | `string` | yes | Current declaration property. | Consumers listed above. |
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |
| `type` | `"projectId" | "" | "url"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `type` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `type`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEntry`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/secrets.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEntries`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/config.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/migration/secret-input.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EventParameterValue`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/state.ts`
  - `xyops/cli/guards.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EventParameters`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/migration/selection.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsEventConfig`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/config.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `checkSession` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `listWorkspaces` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `listProjects` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `listVersions` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `listFolders` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `createFolder` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `planMigration` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |
| `executeMigration` | `XYOpsEventReference` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsEventReference`
- Source: `xyops/cli/types.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/config.ts`
  - `xyops/cli/migration/selection.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `title` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsConfig`
- Source: `xyops/cli/types.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/config.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `baseURL` | `string` | yes | Current declaration property. | Consumers listed above. |
| `apiKey` | `string` | yes | Current declaration property. | Consumers listed above. |
| `events` | `XYOpsEventConfig` | yes | Current declaration property. | Consumers listed above. |
| `httpTimeoutMs` | `number` | yes | Current declaration property. | Consumers listed above. |
| `pollIntervalMs` | `number` | yes | Current declaration property. | Consumers listed above. |
| `pollTimeoutMs` | `number` | yes | Current declaration property. | Consumers listed above. |
| `streamMaxBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `streamMaxFrameBytes` | `number` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationState`
- Source: `xyops/cli/types.ts`
- Category: State
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/migration/index.ts`
  - `xyops/cli/state.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `sourceWorkspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourceProjectID` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourceVersionID` | `string` | no | Current declaration property. | Consumers listed above. |
| `destinationWorkspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `destinationFolderID` | `string` | no | Current declaration property. | Consumers listed above. |
| `targetSchemaVersion` | `string` | no | Current declaration property. | Consumers listed above. |
| `planID` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: sourceWorkspaceID, sourceProjectID, sourceVersionID, destinationWorkspaceID, destinationFolderID, targetSchemaVersion, planID
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `state/stage discriminant` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `state/stage discriminant`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CliDiagnosticCode`
- Source: `xyops/cli/types.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/diagnostics.ts`
  - `xyops/cli/client/job-observation-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CliDiagnostic`
- Source: `xyops/cli/types.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/diagnostics.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `CliDiagnosticCode` | yes | Current declaration property. | Consumers listed above. |
| `endpoint` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `status` | `number` | no | Current declaration property. | Consumers listed above. |
| `nextAction` | `string` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `Diagnostic` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: status, diagnostic
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsClient`
- Source: `xyops/cli/types.ts`
- Category: Type alias
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/types.ts`
- Related types:
  - Types in `xyops/cli/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `readEvent` | `<T>(` | yes | Current declaration property. | Consumers listed above. |
| `params` | `EventParameters` | yes | Current declaration property. | Consumers listed above. |
| `envelopeGuard` | `ResponseSchema<VoiceflowEnvelope<T>>` | yes | Current declaration property. | Consumers listed above. |
| `executeEvent` | `<T>(` | yes | Current declaration property. | Consumers listed above. |
| `params` | `EventParameters` | yes | Current declaration property. | Consumers listed above. |
| `envelopeGuard` | `ResponseSchema<VoiceflowEnvelope<T>>` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Plugin

### `NativePluginJob`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/plugin/stdin_job.ts`
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationHandlers`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInput`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/stdin_job.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInputChunk`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/stdin_job.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginOperation`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/types.ts`
  - `xyops/plugin/operations.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginParameters`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/job_validation.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginStage`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/diagnostics.ts`
  - `xyops/plugin/process_entrypoint.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginValidationCode`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/validation_fault.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowEnvelope`
- Source: `xyops/plugin/contracts.ts`
- Category: Envelope
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/cli/validation.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/plugin/types.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsPluginData`
- Source: `xyops/plugin/contracts.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsPluginResponse`
- Source: `xyops/plugin/contracts.ts`
- Category: Protocol response
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/wire_protocol.ts`
- Producers:
  - Declaration and export: `xyops/plugin/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginStage`
- Source: `xyops/plugin/diagnostics.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/diagnostics.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationHandlers`
- Source: `xyops/plugin/operation_dispatch.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/operation_dispatch.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/operation_dispatch.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInput`
- Source: `xyops/plugin/stdin_job.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/types.ts`
- Producers:
  - Declaration and export: `xyops/plugin/stdin_job.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/stdin_job.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInputChunk`
- Source: `xyops/plugin/stdin_job.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/types.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/stdin_job.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/plugin/stdin_job.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginOperation`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/operations.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginParameters`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `NativePluginJob`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/plugin/stdin_job.ts`
  - `xyops/plugin/process_entrypoint.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `params` | `PluginParameters` | yes | Current declaration property. | Consumers listed above. |
| `operation` | `PluginOperation` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `operation` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `operation`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowEnvelope`
- Source: `xyops/plugin/types.ts`
- Category: Envelope
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/client/index.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/validation.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/wire_protocol.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsPluginData`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `voiceflow` | `VoiceflowEnvelope` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsPluginResponse`
- Source: `xyops/plugin/types.ts`
- Category: Protocol response
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/wire_protocol.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `xy` | `1` | yes | Current declaration property. | Consumers listed above. |
| `complete` | `true` | yes | Current declaration property. | Consumers listed above. |
| `code` | `0 | string` | yes | Current declaration property. | Consumers listed above. |
| `data` | `XYOpsPluginData` | no | Current declaration property. | Consumers listed above. |
| `description` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: data, description
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginValidationCode`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/validation_fault.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationHandlers`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/plugin/process_entrypoint.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `check_session` | `CheckSessionHandler` | yes | Current declaration property. | Consumers listed above. |
| `list_workspaces` | `ListWorkspacesHandler` | yes | Current declaration property. | Consumers listed above. |
| `list_projects` | `ListProjectsHandler` | yes | Current declaration property. | Consumers listed above. |
| `list_versions` | `ListVersionsHandler` | yes | Current declaration property. | Consumers listed above. |
| `list_folders` | `ListFoldersHandler` | yes | Current declaration property. | Consumers listed above. |
| `create_folder` | `CreateFolderHandler` | yes | Current declaration property. | Consumers listed above. |
| `plan_migration` | `PlanMigrationHandler` | yes | Current declaration property. | Consumers listed above. |
| `execute_migration` | `ExecuteMigrationHandler` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInputChunk`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/stdin_job.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginInput`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/stdin_job.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginStage`
- Source: `xyops/plugin/types.ts`
- Category: Type alias
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/process_entrypoint.ts`
  - `xyops/plugin/diagnostics.ts`
  - `xyops/plugin/contracts.ts`
- Producers:
  - Declaration and export: `xyops/plugin/types.ts`
- Related types:
  - Types in `xyops/plugin/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `PluginValidationFault`
- Source: `xyops/plugin/validation_fault.ts`
- Category: Error
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/contracts.ts`
  - `xyops/plugin/wire_protocol.ts`
  - `xyops/plugin/diagnostics.ts`
- Producers:
  - Declaration and export: `xyops/plugin/validation_fault.ts`
- Related types:
  - Types in `xyops/plugin/validation_fault.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Migration workflow

### `MigrationParameterName`
- Source: `xyops/migration-parameters.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/plugin/job_validation.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/cli/state.ts`
- Producers:
  - Declaration and export: `xyops/migration-parameters.ts`
- Related types:
  - Types in `xyops/migration-parameters.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SerializedSecretEntry`
- Source: `xyops/migration-parameters.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/migration-parameters.ts`
- Related types:
  - Types in `xyops/migration-parameters.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `key` | `string` | yes | Current declaration property. | Consumers listed above. |
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |
| `type` | `"projectId" | "" | "url"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `type` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `type`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SerializedEventParameterValue`
- Source: `xyops/migration-parameters.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/migration-parameters.ts`
- Related types:
  - Types in `xyops/migration-parameters.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SerializedEventParameters`
- Source: `xyops/migration-parameters.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/migration-parameters.ts`
- Related types:
  - Types in `xyops/migration-parameters.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationParameterSelection`
- Source: `xyops/migration-parameters.ts`
- Category: Configuration
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/migration-parameters.ts`
- Related types:
  - Types in `xyops/migration-parameters.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `sourceWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceProjectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceVersionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationFolderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `targetSchemaVersion` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: targetSchemaVersion
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationRuntimeDependencies`
- Source: `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/control.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExecuteMigrationInput`
- Source: `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts`
  - `xyops/voiceflow/execute_migration/effect-runner.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `token` | `string` | yes | Current declaration property. | Consumers listed above. |
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `selection` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `secretFileContents` | `unknown` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: secretFileContents
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RunMigrationWorkflow`
- Source: `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/runtime.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EffectResult`
- Source: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Category: Effect
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"event"` | yes | Current declaration property. | Consumers listed above. |
| `event` | `MigrationWorkflowEvent` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settled"` | yes | Current declaration property. | Consumers listed above. |
| `result` | `Envelope<ExecuteResult>` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"noop"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EffectHandler`
- Source: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Category: Effect
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/control.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `K` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EffectHandlerMap`
- Source: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Category: Effect
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Related types:
  - Types in `xyops/voiceflow/execute_migration/effect-runner/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExecuteResult`
- Source: `xyops/voiceflow/execute_migration/index.ts`
- Category: Result
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/migration/execution.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/execute_migration/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationRuntimeDependencies`
- Source: `xyops/voiceflow/execute_migration/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/control.ts`
  - `xyops/voiceflow/execute_migration/effect-runner.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute_migration/index.ts`
  - Re-export target: `./effect-runner` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/execute_migration/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationStage`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `TerminalMigrationStage`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `WorkflowIdentity`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `selection` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowFailure`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/failure-mapping.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `MigrationStage | TerminalMigrationStage` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowSuccess`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `exportStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `exportBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importBytes` | `number` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowContext`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `auth` | `AuthContext` | no | Current declaration property. | Consumers listed above. |
| `artifact` | `ExportArtifact` | no | Current declaration property. | Consumers listed above. |
| `plan` | `MigrationPlan` | no | Current declaration property. | Consumers listed above. |
| `archive` | `ArchiveCandidate` | no | Current declaration property. | Consumers listed above. |
| `imported` | `ImportedReceipt` | no | Current declaration property. | Consumers listed above. |
| `secrets` | `readonly SecretEntry[]` | no | Current declaration property. | Consumers listed above. |
| `terminalFailure` | `MigrationWorkflowFailure` | no | Current declaration property. | Consumers listed above. |
| `terminalSuccess` | `MigrationWorkflowSuccess` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: auth, artifact, plan, archive, imported, secrets, terminalFailure, terminalSuccess
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowState`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: State
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/failure-mapping.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `context` | `MigrationWorkflowContext` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `MigrationStage | TerminalMigrationStage` | yes | Current declaration property. | Consumers listed above. |
| `code` | `string` | no | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | no | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: code, retryable, diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ArchivePreflightEvent`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"archive-not-needed"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"archive-required"` | yes | Current declaration property. | Consumers listed above. |
| `archive` | `ArchiveCandidate` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretResolutionEvent`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"secret-resolution-empty"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-resolution-completed"` | yes | Current declaration property. | Consumers listed above. |
| `secrets` | `readonly SecretEntry[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowEvent`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"start"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"authentication-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `auth` | `AuthContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"export-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `artifact` | `ExportArtifact` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"plan-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `plan` | `MigrationPlan` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"plan-mismatch"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"archive-renamed"` | yes | Current declaration property. | Consumers listed above. |
| `archive` | `ArchiveCandidate` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"archive-durability-confirmed"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"archive-durability-unknown"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"import-succeeded"` | yes | Current declaration property. | Consumers listed above. |
| `imported` | `ImportedReceipt` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"import-failed"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"import-unknown"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-input-resolved"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-completed"` | yes | Current declaration property. | Consumers listed above. |
| `remaining` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-failed"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-unknown"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"dependency-failure"` | yes | Current declaration property. | Consumers listed above. |
| `failure` | `MigrationWorkflowFailure` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"timeout"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"cancellation"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"late-event"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowEffect`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Effect
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"authenticate"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"export"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"plan"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"load-archive-candidates"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"rename"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"confirm-archive-durability"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"import"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"resolve-secrets"` | yes | Current declaration property. | Consumers listed above. |
| `phase` | `"input" | "resolution"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"create-next-secret"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"abort-active-operation"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle-success"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle-failure"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationWorkflowTransition`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Transition
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `MigrationWorkflowState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly MigrationWorkflowEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `TransitionMigrationWorkflow`
- Source: `xyops/voiceflow/execute-migration-state-machine.ts`
- Category: Transition
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/execute-migration-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/execute-migration-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Voiceflow core

### `ApiKeyDiagnostic`
- Source: `xyops/voiceflow/api_key.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/api_key.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/api_key.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ApiKeyStatus`
- Source: `xyops/voiceflow/api_key.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/api_key.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/api_key.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ArchiveClock`
- Source: `xyops/voiceflow/archive.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/archive.ts`
- Related types:
  - Types in `xyops/voiceflow/archive.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `now` | `() => Date` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ArchiveCandidate`
- Source: `xyops/voiceflow/archive.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/archive.ts`
- Related types:
  - Types in `xyops/voiceflow/archive.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `project` | `ProjectRecord` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `AuthContext`
- Source: `xyops/voiceflow/auth.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/export.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/api_key.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/auth.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/auth.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationFaultDetails`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `domain` | `DiagnosticDomain` | no | Current declaration property. | Consumers listed above. |
| `stage` | `string` | no | Current declaration property. | Consumers listed above. |
| `context` | `unknown` | no | Current declaration property. | Consumers listed above. |
| `causes` | `readonly DiagnosticCause[]` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: domain, stage, context, causes
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationFault`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/auth.ts`
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/import/input.ts`
  - `xyops/voiceflow/http/body.ts`
  - `xyops/voiceflow/http/index.ts`
  - `xyops/voiceflow/export.ts`
  - `xyops/voiceflow/api_key.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Envelope`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Envelope
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/list_workspaces.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/list_versions.ts`
  - `xyops/voiceflow/create_folder.ts`
  - `xyops/voiceflow/list_projects.ts`
  - `xyops/voiceflow/list_folders.ts`
  - `xyops/voiceflow/check_session.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ErrorCode`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Failure`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/cli/client/job-response.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ImportedReceipt`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/import/input.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationPlan`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/migration/planning.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/cli/migration/execution.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationSelection`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Configuration
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/dependencies.ts`
  - `xyops/voiceflow/planning/plan-id.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationError`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Success`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Warning`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/warnings.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `WarningCode`
- Source: `xyops/voiceflow/contracts.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/contracts.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/contracts.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DebugWriter`
- Source: `xyops/voiceflow/debug.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/debug.ts`
- Related types:
  - Types in `xyops/voiceflow/debug.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RecordValue`
- Source: `xyops/voiceflow/guards.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/import/input.ts`
  - `xyops/voiceflow/export.ts`
  - `xyops/voiceflow/logux/rename-project.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/guards.ts`
- Related types:
  - Types in `xyops/voiceflow/guards.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `VoiceflowOperation`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/migration-parameters.ts`
  - `xyops/plugin/operation_dispatch.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/migration/index.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ErrorCode`
- Source: `xyops/voiceflow/types.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/contracts.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `WarningCode`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/contracts.ts`
  - `xyops/cli/schemas/voiceflow-envelope.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Warning`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/warnings.ts`
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `WarningCode` | yes | Current declaration property. | Consumers listed above. |
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationError`
- Source: `xyops/voiceflow/types.ts`
- Category: Error
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `ErrorCode` | yes | Current declaration property. | Consumers listed above. |
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `Diagnostic` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Success`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `true` | yes | Current declaration property. | Consumers listed above. |
| `operation` | `VoiceflowOperation` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `result` | `T` | yes | Current declaration property. | Consumers listed above. |
| `warnings` | `readonly Warning[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `operation` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `operation`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Failure`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/contracts.ts`
  - `xyops/cli/client/job-response.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `false` | yes | Current declaration property. | Consumers listed above. |
| `operation` | `VoiceflowOperation` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `error` | `OperationError` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `operation` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `operation`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Envelope`
- Source: `xyops/voiceflow/types.ts`
- Category: Envelope
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/list_folders.ts`
  - `xyops/voiceflow/check_session.ts`
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/create_folder.ts`
  - `xyops/voiceflow/list_projects.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationSelection`
- Source: `xyops/voiceflow/types.ts`
- Category: Configuration
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/planning/plan-id.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/migration/selection.ts`
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `sourceWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceProjectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceVersionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationWorkspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationFolderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `targetSchemaVersion` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: targetSchemaVersion
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationPlan`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/plan_migration.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/cli/types.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/cli/migration/planning.ts`
  - `xyops/cli/migration/execution.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `selection` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |
| `labels` | `Readonly<{` | yes | Current declaration property. | Consumers listed above. |
| `sourceProject` | `string` | yes | Current declaration property. | Consumers listed above. |
| `sourceVersion` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationWorkspace` | `string` | yes | Current declaration property. | Consumers listed above. |
| `destinationFolder` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ImportedReceipt`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/import/input.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/contracts.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `importStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `projectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | no | Current declaration property. | Consumers listed above. |
| `versionID` | `string` | no | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: assistantID, versionID, workspaceID, folderID
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExistingSecret`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |
| `visibility` | `"masked" | "restricted"` | yes | Current declaration property. | Consumers listed above. |
| `hasValue` | `boolean` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `AuthContext`
- Source: `xyops/voiceflow/types.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/auth.ts`
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/export.ts`
  - `xyops/voiceflow/api_key.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `token` | `string` | yes | Current declaration property. | Consumers listed above. |
| `creatorID` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ConfigSecret`
- Source: `xyops/voiceflow/types.ts`
- Category: Configuration
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/secrets.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/secrets.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `key` | `string` | yes | Current declaration property. | Consumers listed above. |
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |
| `type` | `"projectId" | "" | "url"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `type` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `type`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEntry`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ApiKeyDiagnostic`
- Source: `xyops/voiceflow/types.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/api_key.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `message` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `code` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `code`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ApiKeyStatus`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/api_key.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `apiKeyRetrieved` | `true` | yes | Current declaration property. | Consumers listed above. |
| `postImport` | `never` | no | Current declaration property. | Consumers listed above. |
| `apiKeyRetrieved` | `false` | yes | Current declaration property. | Consumers listed above. |
| `postImport` | `{` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `ApiKeyDiagnostic` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: postImport
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RequestBytesInput`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/http/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `url` | `string` | yes | Current declaration property. | Consumers listed above. |
| `init` | `RequestInit` | no | Current declaration property. | Consumers listed above. |
| `maxBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `timeoutMs` | `number` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: init
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `HttpBytes`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/check_session.ts`
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/http/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `status` | `number` | yes | Current declaration property. | Consumers listed above. |
| `headers` | `Headers` | yes | Current declaration property. | Consumers listed above. |
| `bytes` | `ArrayBuffer` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `status` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `status`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExportArtifact`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/export.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `status` | `number` | yes | Current declaration property. | Consumers listed above. |
| `bytes` | `ArrayBuffer` | yes | Current declaration property. | Consumers listed above. |
| `filename` | `string` | yes | Current declaration property. | Consumers listed above. |
| `contentType` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `status` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `status`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Option`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/index.ts`
  - `xyops/cli/prompt.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `value` | `string` | yes | Current declaration property. | Consumers listed above. |
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `WorkspaceRecord`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/index.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `EnvironmentRecord`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/catalog/index.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/catalog/options.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |
| `draftVersionID` | `string` | no | Current declaration property. | Consumers listed above. |
| `publishedVersionID` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: draftVersionID, publishedVersionID
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ProjectRecord`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/archive.ts`
  - `xyops/voiceflow/catalog/index.ts`
  - `xyops/voiceflow/catalog/rename-barrier.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/planning/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | no | Current declaration property. | Consumers listed above. |
| `environments` | `readonly EnvironmentRecord[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: folderID
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderRecord`
- Source: `xyops/voiceflow/types.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/catalog/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `label` | `string` | yes | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `parentID` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: parentID
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ExecuteResult`
- Source: `xyops/voiceflow/types.ts`
- Category: Result
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/execute_migration/index.ts`
  - `xyops/cli/migration/execution.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/cli/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/types.ts`
- Related types:
  - Types in `xyops/voiceflow/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `planID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `exportStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `exportBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importStatus` | `number` | yes | Current declaration property. | Consumers listed above. |
| `importBytes` | `number` | yes | Current declaration property. | Consumers listed above. |
| `selected` | `MigrationSelection` | yes | Current declaration property. | Consumers listed above. |
| `imported` | `ImportedReceipt` | yes | Current declaration property. | Consumers listed above. |
| `apiKeyRetrieved` | `boolean` | no | Current declaration property. | Consumers listed above. |
| `postImport` | `ApiKeyStatus["postImport"]` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: apiKeyRetrieved, postImport
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Voiceflow REST

### `ExportArtifact`
- Source: `xyops/voiceflow/export.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/export.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/export.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `HttpBytes`
- Source: `xyops/voiceflow/http/index.ts`
- Category: Type alias
- Boundary: Voiceflow REST
- Consumers:
  - `xyops/voiceflow/import/index.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/check_session.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/http/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/http/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RequestBytesInput`
- Source: `xyops/voiceflow/http/index.ts`
- Category: Type alias
- Boundary: Voiceflow REST
- Consumers:
  - `xyops/voiceflow/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/http/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/http/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Voiceflow catalog

### `EnvironmentRecord`
- Source: `xyops/voiceflow/catalog/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/catalog/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderRecord`
- Source: `xyops/voiceflow/catalog/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/catalog/options.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/catalog/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Option`
- Source: `xyops/voiceflow/catalog/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/cli/prompt.ts`
  - `xyops/cli/state.ts`
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/catalog/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ProjectRecord`
- Source: `xyops/voiceflow/catalog/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/secrets.ts`
  - `xyops/voiceflow/archive.ts`
  - `xyops/voiceflow/catalog/options.ts`
  - `xyops/voiceflow/catalog/rename-barrier.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/execute_migration/effect-runner/requirements.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/catalog/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `WorkspaceRecord`
- Source: `xyops/voiceflow/catalog/index.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/planning/index.ts`
  - `xyops/voiceflow/catalog/record-parsers.ts`
  - `xyops/voiceflow/catalog/options.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/index.ts`
  - Re-export target: `../types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/catalog/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RawCatalogRow`
- Source: `xyops/voiceflow/catalog/record-parsers.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/record-parsers.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/record-parsers.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogParseResult`
- Source: `xyops/voiceflow/catalog/record-parsers.ts`
- Category: Result
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/record-parsers.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/record-parsers.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `true` | yes | Current declaration property. | Consumers listed above. |
| `value` | `T` | yes | Current declaration property. | Consumers listed above. |
| `ok` | `false` | yes | Current declaration property. | Consumers listed above. |
| `reason` | `"invalid-row"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ConfirmProjectRename`
- Source: `xyops/voiceflow/catalog/rename-barrier.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/rename-barrier.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/rename-barrier.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameDurabilityContext`
- Source: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/catalog/rename-barrier.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/rename-durability-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `projectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameDurabilityState`
- Source: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Category: State
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/catalog/rename-barrier.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/rename-durability-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"READY"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"ATTEMPTING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `limit` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"WAITING_TO_RETRY"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `nextRetryDeadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `limit` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CONFIRMED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `project` | `Readonly<{` | yes | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `FailureCode` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"EXHAUSTED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `true` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CANCELLED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameDurabilityContext` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `false` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameDurabilityEvent`
- Source: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Category: Event
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/rename-durability-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"start-attempt"` | yes | Current declaration property. | Consumers listed above. |
| `attempt` | `number` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `limit` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"catalog-result"` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `project` | `Readonly<{` | no | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |
| `matches` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transient-failure"` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"permanent-failure"` | yes | Current declaration property. | Consumers listed above. |
| `code` | `FailureCode` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"retry-timer"` | yes | Current declaration property. | Consumers listed above. |
| `attemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `nextAttemptID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"timer-failure"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"cancel"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: project
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameDurabilityTransition`
- Source: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Category: Transition
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/rename-durability-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/rename-durability-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `RenameDurabilityState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Voiceflow Logux transport

### `LoguxFrame`
- Source: `xyops/voiceflow/logux/connection.ts`
- Category: Protocol frame
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/create-folder.ts`
  - `xyops/voiceflow/logux/rename-project.ts`
  - `xyops/voiceflow/logux/frame-contract.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/connection.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/connection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `LoguxTransportEvent`
- Source: `xyops/voiceflow/logux/connection.ts`
- Category: Event
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/rename-project.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/connection.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/connection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"connection-opened"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"frame"` | yes | Current declaration property. | Consumers listed above. |
| `frame` | `LoguxFrame` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connection-interrupted"` | yes | Current declaration property. | Consumers listed above. |
| `reason` | `"close" | "timeout"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-failure"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `LoguxSubscriptionPolicy`
- Source: `xyops/voiceflow/logux/connection.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/connection.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/connection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `frame` | `LoguxFrame` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `LoguxConnectionInput`
- Source: `xyops/voiceflow/logux/connection.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/connection.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/connection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `token` | `string` | yes | Current declaration property. | Consumers listed above. |
| `origin` | `string` | yes | Current declaration property. | Consumers listed above. |
| `subscription` | `LoguxSubscriptionPolicy` | no | Current declaration property. | Consumers listed above. |
| `timeoutMs` | `number` | no | Current declaration property. | Consumers listed above. |
| `webSocket` | `typeof WebSocket` | no | Current declaration property. | Consumers listed above. |
| `onEvent` | `(event: LoguxTransportEvent) => void` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: subscription, timeoutMs, webSocket
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `LoguxConnection`
- Source: `xyops/voiceflow/logux/connection.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
  - `xyops/voiceflow/logux/rename-project.ts`
  - `xyops/voiceflow/logux/create-folder.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/connection.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/connection.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `send` | `(frame: LoguxFrame) => void` | yes | Current declaration property. | Consumers listed above. |
| `cleanup` | `() => void` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `LoguxFrame`
- Source: `xyops/voiceflow/logux/frame-contract.ts`
- Category: Protocol frame
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/connection.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/rename-project.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
  - `xyops/voiceflow/logux/create-folder.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/frame-contract.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/frame-contract.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `TraceFields`
- Source: `xyops/voiceflow/logux/frame-contract.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-secret.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/frame-contract.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/frame-contract.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretFailureCause`
- Source: `xyops/voiceflow/logux/frame-contract.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/frame-contract.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/frame-contract.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"dependency-failure"` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"dependency-failed"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Row`
- Source: `xyops/voiceflow/logux/index.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/index.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/index.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Voiceflow Logux state machines

### `CatalogRow`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogErrorCode`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: Error
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogState`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"CONNECTING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CONNECTED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"SUBSCRIBING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"COLLECTING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `seenTypes` | `ReadonlySet<string>` | yes | Current declaration property. | Consumers listed above. |
| `rows` | `readonly CatalogRow[]` | yes | Current declaration property. | Consumers listed above. |
| `byteCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"COMPLETED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `seenTypes` | `ReadonlySet<string>` | yes | Current declaration property. | Consumers listed above. |
| `rows` | `readonly CatalogRow[]` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `Exclude<CatalogErrorCode` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"TIMED_OUT"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `CatalogContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"DEPENDENCY_TIMEOUT"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `true` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogEvent`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: Event
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/logux/catalog-frames.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"connection-established"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connected"` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"subscription-synced"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"catalog-action"` | yes | Current declaration property. | Consumers listed above. |
| `operationID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `channel` | `string` | yes | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `type` | `string` | yes | Current declaration property. | Consumers listed above. |
| `rows` | `readonly CatalogRow[]` | yes | Current declaration property. | Consumers listed above. |
| `byteCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"error-frame"` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-failure"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connection-interrupted"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-timeout"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: workspaceID
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogEffect`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: Effect
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"send-subscription"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"close-socket"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogTransition`
- Source: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Category: Transition
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/catalog-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/catalog-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `CatalogState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly CatalogEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CreatedFolder`
- Source: `xyops/voiceflow/logux/create-folder.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/create-folder.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/create-folder.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `id` | `string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CreateFolder`
- Source: `xyops/voiceflow/logux/create-folder.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/plugin/operations.ts`
  - `xyops/cli/state.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/create-folder.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/create-folder.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderContext`
- Source: `xyops/voiceflow/logux/folder-state-machine.ts`
- Category: Context
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/folder-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/folder-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `channel` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderName` | `string` | yes | Current declaration property. | Consumers listed above. |
| `origin` | `string` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderState`
- Source: `xyops/voiceflow/logux/folder-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-folder.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/folder-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/folder-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"CONNECTING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CONNECTED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"SUBSCRIBING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"SUBSCRIBED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"MUTATION_SENT"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"COMPLETED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `folder` | `Readonly<{ id: string` | yes | Current declaration property. | Consumers listed above. |
| `name` | `string }>` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `FolderFailureCode` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"UNKNOWN_OUTCOME"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `FolderContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `true` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderEvent`
- Source: `xyops/voiceflow/logux/folder-state-machine.ts`
- Category: Event
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-folder.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/folder-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/folder-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"connection-established"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connected"` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"subscription-synced"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"mutation-sent"` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"mutation-synced"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"folder-completed"` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `origin` | `string` | no | Current declaration property. | Consumers listed above. |
| `channel` | `string` | no | Current declaration property. | Consumers listed above. |
| `workspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | no | Current declaration property. | Consumers listed above. |
| `folderName` | `string` | no | Current declaration property. | Consumers listed above. |
| `kind` | `"error-frame"` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-failure"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connection-interrupted"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-timeout"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: origin, channel, workspaceID, folderID, folderName
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderEffect`
- Source: `xyops/voiceflow/logux/folder-state-machine.ts`
- Category: Effect
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-folder.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/folder-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/folder-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"send-subscription"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"send-mutation"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"close-socket"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `FolderTransition`
- Source: `xyops/voiceflow/logux/folder-state-machine.ts`
- Category: Transition
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/folder-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/folder-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `FolderState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly FolderEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameProject`
- Source: `xyops/voiceflow/logux/rename-project.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-project.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-project.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameState`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/rename-project.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"CONNECTING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CONNECTED" | "SUBSCRIBING" | "SUBSCRIBED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"MUTATION_SENT"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `patchObserved` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"MUTATION_ACKNOWLEDGED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `patchObserved` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"CATALOG_RECONCILING"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `retryCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `retryLimit` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `patchObserved` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"COMPLETED"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `patchObserved` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"BYPASSED_NO_COLLISION"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED" | "UNKNOWN_OUTCOME"` | yes | Current declaration property. | Consumers listed above. |
| `context` | `RenameStateContext` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameStateContext`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `workspaceID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `projectID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `folderID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `requestedName` | `string` | yes | Current declaration property. | Consumers listed above. |
| `origin` | `string` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameEvent`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: Event
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/rename-project.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"connection-established"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connected"` | yes | Current declaration property. | Consumers listed above. |
| `subscriptionSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"subscription-synced"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"mutation-sent"` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"mutation-synced"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"project-patch"` | yes | Current declaration property. | Consumers listed above. |
| `matches` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"catalog-retry"` | yes | Current declaration property. | Consumers listed above. |
| `retryCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"catalog-result"` | yes | Current declaration property. | Consumers listed above. |
| `matches` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `retryCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `retryLimit` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"error-frame"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | no | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-failure"` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `string` | no | Current declaration property. | Consumers listed above. |
| `kind` | `"connection-interrupted"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-timeout"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic, diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameEffect`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: Effect
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/rename-project.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"send-subscription"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"send-mutation"` | yes | Current declaration property. | Consumers listed above. |
| `syncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"start-catalog-retry"` | yes | Current declaration property. | Consumers listed above. |
| `retryCount` | `number` | yes | Current declaration property. | Consumers listed above. |
| `deadline` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"close-socket"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `RenameTransition`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: Transition
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `RenameState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly RenameEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `BypassRename`
- Source: `xyops/voiceflow/logux/rename-state-machine.ts`
- Category: Type alias
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/rename-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/rename-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretState`
- Source: `xyops/voiceflow/logux/secret-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-secret.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/secret-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/secret-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"CONNECTING" | "CONNECTED" | "SUBSCRIBING" | "SUBSCRIBED"` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"MUTATION_SENT"` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"COMPLETED"` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"FAILED" | "UNKNOWN_OUTCOME"` | yes | Current declaration property. | Consumers listed above. |
| `assistantID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `code` | `"DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEffect`
- Source: `xyops/voiceflow/logux/secret-state-machine.ts`
- Category: Effect
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-secret.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/secret-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/secret-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"send-subscription"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"send-mutation"` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"close-socket"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"settle"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretTransition`
- Source: `xyops/voiceflow/logux/secret-state-machine.ts`
- Category: Transition
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/secret-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/secret-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `state` | `SecretState` | yes | Current declaration property. | Consumers listed above. |
| `accepted` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `effects` | `readonly SecretEffect[]` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEvent`
- Source: `xyops/voiceflow/logux/secret-state-machine.ts`
- Category: Event
- Boundary: Logux WebSocket
- Consumers:
  - `xyops/voiceflow/logux/create-secret.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/secret-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/secret-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `kind` | `"connection-established"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connected"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"subscription-synced"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"mutation-sent"` | yes | Current declaration property. | Consumers listed above. |
| `mutationSyncID` | `number` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"secret-done"` | yes | Current declaration property. | Consumers listed above. |
| `actionID` | `string` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"error-frame"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-failure"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"connection-interrupted"` | yes | Current declaration property. | Consumers listed above. |
| `kind` | `"transport-timeout"` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `kind` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `kind`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CreateSecretState`
- Source: `xyops/voiceflow/logux/secret-state-machine.ts`
- Category: State
- Boundary: Logux WebSocket
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/voiceflow/logux/secret-state-machine.ts`
- Related types:
  - Types in `xyops/voiceflow/logux/secret-state-machine.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `state/stage discriminant` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `state/stage discriminant`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Secrets

### `ExistingSecret`
- Source: `xyops/voiceflow/secrets.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/index.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/secrets.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/secrets.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ConfigSecret`
- Source: `xyops/voiceflow/secrets.ts`
- Category: Configuration
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/secrets.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/secrets.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/secrets.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SecretEntry`
- Source: `xyops/voiceflow/secrets.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/types.ts`
  - `xyops/cli/types.ts`
  - `xyops/voiceflow/logux/update-secret.ts`
  - `xyops/voiceflow/logux/create-secret.ts`
  - `xyops/voiceflow/logux/index.ts`
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/secrets.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/voiceflow/secrets.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Diagnostics

### `OutcomeState`
- Source: `xyops/diagnostics/create.ts`
- Category: State
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/outcome.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/create.ts`
- Related types:
  - Types in `xyops/diagnostics/create.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `state/stage discriminant` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `state/stage discriminant`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DispatchOutcomeInput`
- Source: `xyops/diagnostics/outcome.ts`
- Category: Type alias
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/diagnostics/outcome.ts`
- Related types:
  - Types in `xyops/diagnostics/outcome.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `dispatched` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `confirmedFailure` | `boolean` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Result`
- Source: `xyops/diagnostics/result.ts`
- Category: Result
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/diagnostics/result.ts`
- Related types:
  - Types in `xyops/diagnostics/result.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `ok` | `true` | yes | Current declaration property. | Consumers listed above. |
| `value` | `T` | yes | Current declaration property. | Consumers listed above. |
| `ok` | `false` | yes | Current declaration property. | Consumers listed above. |
| `error` | `E` | yes | Current declaration property. | Consumers listed above. |

##### Type risks

- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DiagnosticDomain`
- Source: `xyops/diagnostics/types.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/create.ts`
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DiagnosticPrimitive`
- Source: `xyops/diagnostics/types.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SafeContextObject`
- Source: `xyops/diagnostics/types.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SafeContextValue`
- Source: `xyops/diagnostics/types.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/redact.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `SafeContext`
- Source: `xyops/diagnostics/types.ts`
- Category: Context
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/create.ts`
  - `xyops/cli/diagnostics.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DiagnosticCause`
- Source: `xyops/diagnostics/types.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/create.ts`
  - `xyops/voiceflow/contracts.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `domain` | `DiagnosticDomain | string` | yes | Current declaration property. | Consumers listed above. |
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `context` | `SafeContext` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `Diagnostic` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `Diagnostic`
- Source: `xyops/diagnostics/types.ts`
- Category: Diagnostic
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/diagnostics/create.ts`
  - `xyops/voiceflow/types.ts`
  - `xyops/plugin/diagnostics.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/client/job-response.ts`
  - `xyops/cli/diagnostics.ts`
- Producers:
  - Declaration and export: `xyops/diagnostics/types.ts`
- Related types:
  - Types in `xyops/diagnostics/types.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `domain` | `DiagnosticDomain` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `nextAction` | `string` | yes | Current declaration property. | Consumers listed above. |
| `context` | `SafeContext` | yes | Current declaration property. | Consumers listed above. |
| `causes` | `readonly DiagnosticCause[]` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `Diagnostic` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Schemas

### `DiagnosticCauseDTO`
- Source: `xyops/cli/schemas/diagnostics.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/schemas/diagnostics.ts`
- Related types:
  - Types in `xyops/cli/schemas/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `domain` | `"core" | "plugin" | "cli" | "logux" | "transport" | "protocol"` | yes | Current declaration property. | Consumers listed above. |
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `context` | `Readonly<Record<string` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `DiagnosticDTO` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `DiagnosticDTO`
- Source: `xyops/cli/schemas/diagnostics.ts`
- Category: Diagnostic
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/diagnostics.ts`
- Producers:
  - Declaration and export: `xyops/cli/schemas/diagnostics.ts`
- Related types:
  - Types in `xyops/cli/schemas/diagnostics.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `code` | `string` | yes | Current declaration property. | Consumers listed above. |
| `domain` | `"core" | "plugin" | "cli" | "logux" | "transport" | "protocol"` | yes | Current declaration property. | Consumers listed above. |
| `stage` | `string` | yes | Current declaration property. | Consumers listed above. |
| `retryable` | `boolean` | yes | Current declaration property. | Consumers listed above. |
| `nextAction` | `string` | yes | Current declaration property. | Consumers listed above. |
| `context` | `Readonly<Record<string` | yes | Current declaration property. | Consumers listed above. |
| `causes` | `readonly DiagnosticCauseDTO[]` | yes | Current declaration property. | Consumers listed above. |
| `diagnostic` | `DiagnosticDTO` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: diagnostic
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `stage` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `stage`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `ParsedNativePluginJob`
- Source: `xyops/plugin/schemas/native_plugin_job.ts`
- Category: Schema
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - `xyops/plugin/job_validation.ts`
- Producers:
  - Declaration and export: `xyops/plugin/schemas/native_plugin_job.ts`
- Related types:
  - Types in `xyops/plugin/schemas/native_plugin_job.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `OperationParameterString`
- Source: `xyops/plugin/schemas/operation_parameter.ts`
- Category: Schema
- Boundary: Plugin stdin / Plugin stdout
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/plugin/schemas/operation_parameter.ts`
- Related types:
  - Types in `xyops/plugin/schemas/operation_parameter.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `CatalogRecord`
- Source: `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- Category: Schema
- Boundary: Voiceflow domain
- Consumers:
  - `xyops/voiceflow/catalog/record-parsers.ts`
- Producers:
  - Declaration and export: `xyops/voiceflow/catalog/schemas/catalog_record.ts`
- Related types:
  - Types in `xyops/voiceflow/catalog/schemas/catalog_record.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Group: Configuration

### `MigrationFileConfigInput`
- Source: `xyops/cli/config.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - No additional in-repository consumer found by static name search.
- Producers:
  - Declaration and export: `xyops/cli/config.ts`
- Related types:
  - Types in `xyops/cli/config.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Optional properties: none detected in the declaration shape.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationFileConfig`
- Source: `xyops/cli/config.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/migration/secret-input.ts`
  - `xyops/cli/migration/selection.ts`
- Producers:
  - Declaration and export: `xyops/cli/config.ts`
- Related types:
  - Types in `xyops/cli/config.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| `sourceWorkspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourceFolderID` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourceProjectID` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourcePath` | `string` | no | Current declaration property. | Consumers listed above. |
| `destinationWorkspaceID` | `string` | no | Current declaration property. | Consumers listed above. |
| `destinationFolderID` | `string` | no | Current declaration property. | Consumers listed above. |
| `destinationPath` | `string` | no | Current declaration property. | Consumers listed above. |
| `sourceVersionID` | `string` | no | Current declaration property. | Consumers listed above. |
| `targetSchemaVersion` | `string` | no | Current declaration property. | Consumers listed above. |

##### Type risks

- Optional properties: sourceWorkspaceID, sourceFolderID, sourceProjectID, sourcePath, destinationWorkspaceID, destinationFolderID, destinationPath, sourceVersionID, targetSchemaVersion
- Union/object variants require comparison of shared and variant-specific properties.
- Weak/overlapping union shape: review literal members and variant payloads.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: yes
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsConfig`
- Source: `xyops/cli/config.ts`
- Category: Configuration
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/types.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/client/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/config.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/config.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsEventConfig`
- Source: `xyops/cli/config.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/types.ts`
- Producers:
  - Declaration and export: `xyops/cli/config.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/config.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `XYOpsEventReference`
- Source: `xyops/cli/config.ts`
- Category: Event
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/client/index.ts`
  - `xyops/cli/client/polling.ts`
  - `xyops/cli/types.ts`
  - `xyops/cli/migration/selection.ts`
- Producers:
  - Declaration and export: `xyops/cli/config.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/config.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: possible; candidate is `none identified`.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `none identified`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

### `MigrationState`
- Source: `xyops/cli/state.ts`
- Category: State
- Boundary: CLI internal
- Consumers:
  - `xyops/cli/types.ts`
  - `xyops/cli/migration/index.ts`
- Producers:
  - Declaration and export: `xyops/cli/state.ts`
  - Re-export target: `./types` (resolve original declaration during group review).
- Related types:
  - Types in `xyops/cli/state.ts` and imported types used by this declaration.

##### Properties

| Property | Type | Required? | Meaning | Used by |
|---|---|---:|---|---|
| *(none extracted; scalar, union, function, or re-export type)* | — | — | Review declaration body. | — |

##### Type risks

- Re-export only; analyze the original declaration instead.
- Impossible combinations: not determined from this declaration alone; trace constructors and consumers in the group pass.
- Repeated fields: compare with related types before normalization.
- Missing discriminant: candidate `state/stage discriminant` is present.
- Boundary concerns: preserve existing public and wire contracts.

##### Union candidate

- Candidate: no
- Suggested discriminant: `state/stage discriminant`
- Possible variants: current union members or state/event/effect branches; enumerate from source in Pass 3.

## Pass 2 Summary

- Exported type declarations/re-exports analyzed: **221**
- State types: **13**
- Event types: **20**
- Effect types: **9**
- Optional properties detected: **91**
- Discriminated-union candidates: **69**
- Wire-boundary type entries: **72**
- Highest-risk groups: Migration workflow; CLI job observation; Logux state machines; plugin and diagnostics boundaries.
- Types that must remain separate: CLI/XYOps protocol types, Plugin stdin/stdout types, Voiceflow REST types, Logux frame types, and internal state-machine types.
- Types safe to normalize in Pass 3: candidates only after each group verifies consumers, producers, and wire compatibility.

## Pass 3 Progress

### 1. Migration workflow

- Files changed:
  - `xyops/voiceflow/execute-migration-state-machine.ts`
- Types added:
  - `MigrationWorkflowEventMap`
  - `MigrationWorkflowEffectMap`
  - `EventFromMap`
  - Stage-specific workflow state/context mappings
- Optional properties removed:
  - Success event payloads were already required and remain required.
  - Active state variants now require data accumulated by their stage.
- Guards removed:
  - No external protocol, terminal-state, late-event, or correlation guards removed.
- Guards retained and why:
  - Terminal-state guard prevents late events.
  - Stage checks preserve out-of-order event rejection.
  - Plan-ID correlation preserves plan mismatch behavior.
  - Failure and unknown-outcome routing preserves retryability and settlement.
- Tests run:
  - TypeScript check passed.
  - Oxlint passed.
  - Focused migration/CLI/API-key tests: 28 passed.
  - BDD22: 14 scenarios passed.
  - BDD23: 12 scenarios passed.
  - BDD27: 9 scenarios passed.
- Behavior changes: none observed; effect ordering and event payload contracts remain unchanged.
- Remaining optional properties:
  - `MigrationWorkflowContext` retains optional fields as a compatibility view for existing consumers.
  - Terminal diagnostic fields remain optional because absence is a meaningful no-diagnostic state.
  - `MigrationWorkflowFailure.diagnostic` remains optional for failures without safe diagnostic text.
- Candidate follow-up:
  - Remove compatibility-view optionals only after effect-runner consumers are migrated to stage-narrowed contexts.

## Command Inventory

Commands are recorded separately from events and effects. A command requests
work; an event records an observed fact; an effect describes work the runtime
must perform.

### CLI commands

- `xyops/cli/migration/index.ts`
  - `run`
  - CLI migration orchestration command.
- `xyops/cli/migration/selection.ts`
  - `selectSourceSelection`
  - `selectDestinationSelection`
  - Interactive resource-selection commands.
- `xyops/cli/migration/execution.ts`
  - `confirmAndExecuteMigration`
  - `executeConfirmedMigration`
  - Confirmed migration execution commands.
- `xyops/cli/migration/secret-input.ts`
  - `readSecretsForMigration`
  - Project-secret input command.

### Plugin commands

- `xyops/plugin/operation_dispatch.ts`
  - `dispatchOperation`
  - Plugin operation command dispatcher.
- `xyops/plugin/operations.ts`
  - Operation-specific command handler definitions.
- `xyops/plugin/entrypoint.ts`
  - Plugin job command entrypoint.
- `xyops/plugin/process_entrypoint.ts`
  - Process-level stdin command entrypoint.

### Voiceflow domain commands

- `xyops/voiceflow/check_session.ts`
  - `main`
  - Session-check command.
- `xyops/voiceflow/list_workspaces.ts`
  - `main`
  - Workspace-listing command.
- `xyops/voiceflow/list_projects.ts`
  - `main`
  - Project-listing command.
- `xyops/voiceflow/list_versions.ts`
  - `main`
  - Version-listing command.
- `xyops/voiceflow/list_folders.ts`
  - `main`
  - Folder-listing command.
- `xyops/voiceflow/create_folder.ts`
  - `main`
  - Folder-creation command.
- `xyops/voiceflow/plan_migration.ts`
  - `main`
  - Migration-planning command.
- `xyops/voiceflow/execute_migration/index.ts`
  - `main`
  - `executeConfirmedMigration`
  - Migration-execution commands.

### Voiceflow REST and transport commands

- `xyops/voiceflow/export.ts`
  - `exportVersion`
  - Export request command.
- `xyops/voiceflow/import/index.ts`
  - `importVersion`
  - Import request command.
- `xyops/voiceflow/logux/create-folder.ts`
  - `createFolder`
  - Logux folder-creation command.
- `xyops/voiceflow/logux/rename-project.ts`
  - `renameProject`
  - Logux project-rename command.
- `xyops/voiceflow/logux/update-secret.ts`
  - `updateSecret`
  - Logux secret-mutation command.
- `xyops/voiceflow/catalog/rename-barrier.ts`
  - `confirmProjectRename`
  - Rename-durability confirmation command.

### Migration workflow command boundary

- `xyops/voiceflow/execute_migration/effect-runner/runtime.ts`
  - `runMigrationWorkflow`
  - Workflow orchestration command boundary; it consumes reducer effects and
    dispatches resulting events.
- `xyops/voiceflow/execute-migration-state-machine.ts`
  - `start` event is the current workflow-start command representation.
  - This should be reviewed before creating a separate command type.

### Command extraction map

| Domain | Current command source | Command boundary | Events produced | Effects emitted | Target review |
|---|---|---|---|---|---|
| Migration workflow | `execute_migration/index.ts`, effect-runner runtime | Plugin/Voiceflow operation | Workflow events | Workflow effects | Extract command input separately from reducer events. |
| Client job observation | `cli/client/index.ts` | XYOps CLI | Observation events | Polling/stream effects | Distinguish dispatch, poll, and stream commands. |
| Logux catalog | `logux/index.ts` | Voiceflow Logux | Catalog events | Socket/send/settlement effects | Keep transport commands separate from catalog facts. |
| Logux folder | `logux/create-folder.ts` | Logux WebSocket | Folder events | Subscribe/send/cleanup effects | Preserve correlation IDs. |
| Logux rename | `logux/rename-project.ts` | Logux WebSocket | Rename events | Patch/send/cleanup effects | Preserve action and sync IDs. |
| Logux secret | `logux/update-secret.ts` | Logux WebSocket | Secret events | Patch/send/cleanup effects | Preserve assistant and action IDs. |
| Rename durability | `catalog/rename-barrier.ts` | Voiceflow catalog | Durability events | Load/sleep/timeout effects | Preserve retry and deadline behavior. |
| CLI configuration | `cli/config.ts`, migration selection | CLI internal | Parsed configuration facts | Prompt/read-file effects | Separate configuration modes without changing file shape. |
| Plugin wire | `plugin/process_entrypoint.ts`, operation dispatch | Plugin stdin/stdout | Protocol response facts | Operation execution effects | Keep wire DTOs separate from domain commands. |
| Diagnostics | `diagnostics/result.ts`, plugin/CLI adapters | Boundary-specific | Diagnostic results | None or settlement effects | Keep diagnostic commands out of domain event unions. |

### Command risks

- Commands and events currently share some function names such as `main`,
  `execute`, and `start`; do not infer that these are interchangeable types.
- `start` is currently represented as a workflow event and may need an explicit
  command boundary in Pass 3.
- REST requests, Logux mutations, polling, and settlement are commands/effects
  with different retry and cleanup semantics; they must remain separate.
- Existing plugin operation parameters are wire contracts and must not be
  replaced by internal command types without adapters.

# Pass 2 — State-machine type analysis

## Scope and authority

Analyzed the seven requested reducers against the latest source. `xyops/voiceflow/logux/connection.ts` was excluded as instructed: it owns transport events/behavior, not domain state. Source and tests were read only; no source or test files were modified.

| Machine | State / event / effect / transition | Constructor | Reducer | Effect runner | Tests |
|---|---|---|---|---|---|
| CLI job observation | `JobObservationState`, `JobObservationEvent`, `JobObservationEffect`, `JobObservationTransition` | `createJobObservationState` | `transitionJobObservation` | `cli/client/index.ts:startJobObservation` | `tests/xyops_streaming.test.ts` |
| Migration workflow | `MigrationWorkflowState`, `MigrationWorkflowEvent`, `MigrationWorkflowEffect`, `MigrationWorkflowTransition` | `createMigrationWorkflow` | `transitionMigrationWorkflow` | `execute_migration/effect-runner/runtime.ts` | `tests/vf_migration_workflow_state_machine.test.ts` |
| Rename durability | `RenameDurabilityState`, `RenameDurabilityEvent`, no reducer effect type, `RenameDurabilityTransition` | `createRenameDurabilityState` | `transitionRenameDurability` | `catalog/rename-barrier.ts` | `tests/vf_rename_durability.test.ts` |
| Logux catalog | `CatalogState`, `CatalogEvent`, `CatalogEffect`, `CatalogTransition` | `createCatalogState` | `transitionCatalogState` | `logux/index.ts:syncCatalog` | `tests/vf_logux_state_machine.test.ts` |
| Logux folder | `FolderState`, `FolderEvent`, `FolderEffect`, `FolderTransition` | `createFolderState` | `transitionFolderState` | `logux/create-folder.ts` | `tests/vf_logux_state_machine.test.ts` |
| Logux rename | `RenameState`, `RenameEvent`, `RenameEffect`, `RenameTransition` | `createRenameState`, `bypassRename` | `transitionRenameState` | `logux/rename-project.ts` | `tests/vf_logux_state_machine.test.ts` |
| Logux secret | `SecretState`, `SecretEvent`, `SecretEffect`, `SecretTransition` | `createSecretState` | `transitionSecretStateWithEffects` | `logux/create-secret.ts` | `tests/vf_logux_state_machine.test.ts` |

## CLI job observation

Initial state is `DISPATCHED(jobID)`. Terminal states are `SUCCEEDED`, `FAILED`, and `UNKNOWN_OUTCOME`; terminal effect is `settle`. Stream failure falls back to polling attempt `0`; poll timeout and observation failures become unknown outcome. `jobID` is retained in state, but polling events have no job ID. Late events are ignored after terminal. The client owns stream/poll cleanup and settlement.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `DISPATCHED` | `jobID` | none | matching `execute-dispatched`, `polling-started` | start stream/poll | `STREAMING`, `POLLING` | no |
| `STREAMING` | `jobID` | none | `stream-failed`, `stream-succeeded`, `polling-started` | start poll, settle | `POLLING`, `SUCCEEDED` | no |
| `POLLING` | `jobID`, `attempt` | none | `job-active`, `job-succeeded`, `job-failed`, `observation-failed`, `poll-timeout` | settle on terminal | `POLLING`, `SUCCEEDED`, `FAILED`, `UNKNOWN_OUTCOME` | no |
| `SUCCEEDED` | `jobID` | none | none | none | none | yes |
| `FAILED` | `jobID`, `diagnosticCode` | none | none | none | none | yes |
| `UNKNOWN_OUTCOME` | `jobID`, `diagnosticCode` | none | none | none | none | yes |

| Event kind | Payload fields | Required fields | Optional fields | Producer | Accepted states | Result |
|---|---|---|---|---|---|---|
| `execute-dispatched` | `jobID` | `jobID` | none | client | matching dispatched | start stream |
| `stream-failed` | none | none | none | stream runner | streaming | start polling |
| `polling-started` | none | none | none | client | dispatched/streaming | start polling |
| `stream-succeeded` | none | none | none | stream runner | streaming | succeeded/settle |
| `job-active` | `attempt` | `attempt` | none | polling | polling | update attempt |
| `job-succeeded` | none | none | none | polling | polling | succeeded/settle |
| `job-failed` | none | none | none | polling | polling | failed/settle |
| `observation-failed` | `diagnosticCode` | diagnostic code | none | polling/client | polling | unknown/settle |
| `poll-timeout` | none | none | none | polling | polling | unknown/settle |

| Effect kind | Payload | Handler/protocol | Returned event | Failure/cleanup |
|---|---|---|---|---|
| `start-stream` | job ID | SSE reader | stream success/failure | reader/client cleanup |
| `start-polling` | job ID, attempt | REST polling | active/success/failure/timeout | poll lifecycle |
| `settle` | none | local promise settlement | none | final result |

Potential invalid combinations: attempt monotonicity is not enforced; polling-started has no job correlation; stale callbacks rely on runner ownership. Tests cover stream fallback, polling success, terminal ignores, and transitions.

## Migration workflow

Initial stage is `AUTHENTICATION`; identity always contains `operationID`, `planID`, and `selection`. Stages are `AUTHENTICATION`, `EXPORT`, `PLANNING`, `ARCHIVE_PREFLIGHT`, `ARCHIVE`, `IMPORT`, `SECRET_INPUT`, `SECRET_RESOLUTION`, and `SECRET_CREATION`. Terminal stages are `COMPLETED`, `FAILED`, `UNKNOWN_OUTCOME`, and `CANCELLED`. Terminal effects are `settle-success`, `settle-failure`; cancellation also emits `abort-active-operation`.

| Stage | Required data | Entered by | Exited by | Effect |
|---|---|---|---|---|
| `AUTHENTICATION` | identity | constructor | authentication-succeeded | authenticate |
| `EXPORT` | auth | authentication-succeeded | export-succeeded | export |
| `PLANNING` | auth, artifact | export-succeeded | plan-succeeded/mismatch | plan |
| `ARCHIVE_PREFLIGHT` | auth, artifact, plan | matching plan-succeeded | archive-required/not-needed | load candidates |
| `ARCHIVE` | auth, artifact, plan, archive | archive-required | archive-renamed/durability result | rename/confirm durability |
| `IMPORT` | auth, artifact, plan | archive not needed/confirmed | import success/fail/unknown | import |
| `SECRET_INPUT` | auth, artifact, plan, imported | import-succeeded | secret-input-resolved | resolve input |
| `SECRET_RESOLUTION` | auth, artifact, plan, imported | input resolved | empty/completed | resolve resolution |
| `SECRET_CREATION` | auth, artifact, plan, imported, secrets | nonempty resolution | secret-completed/fail/unknown | create next secret |
| terminals | terminal success/failure context | terminal event | none | settle/abort |

### Migration state optionals

| Field | Classification | Current meaning |
|---|---|---|
| `context.auth` | real absence | absent before authentication; required from export |
| `context.artifact` | real absence | absent before export; required from planning |
| `context.plan` | real absence | absent before matching plan |
| `context.archive` | conditional branch | only archive-required path |
| `context.imported` | real absence | required after import |
| `context.secrets` | conditional branch | only nonempty secret resolution |
| `context.terminalFailure` | conditional branch | failed/unknown/cancelled only |
| `context.terminalSuccess` | conditional branch | completed only |
| active `code`, `retryable`, `diagnostic` | potential invalid state | generic transition copies terminal metadata into active states |
| terminal failure `diagnostic` | real absence | optional diagnostic |
| `secret-completed.remaining` | missing type guarantee | reducer trusts external count; zero completes, nonzero loops |

### Migration event map

| Event kind | Payload | Accepted states | Result / unknown-outcome impact |
|---|---|---|---|
| `start` | none | authentication | authenticate |
| `authentication-succeeded` | auth | authentication | export |
| `export-succeeded` | artifact | export | plan |
| `plan-succeeded` | planID, plan | planning | matching → archive preflight; mismatch → failed |
| `plan-mismatch` | none | planning | failed |
| `archive-required` | archive | archive preflight | archive/rename |
| `archive-not-needed` | none | archive preflight | import |
| `archive-renamed` | archive | archive | confirm durability |
| `archive-durability-confirmed` | none | archive | import |
| `archive-durability-unknown` | failure | archive | unknown outcome |
| `import-succeeded` | imported | import | secret input |
| `import-failed` | failure | nonterminal via generic failure | failed |
| `import-unknown` | failure | import | unknown outcome |
| `secret-input-resolved` | none | secret input | secret resolution |
| `secret-resolution-empty` | none | secret resolution | completed |
| `secret-resolution-completed` | secrets | secret resolution | secret creation |
| `secret-completed` | remaining | secret creation | zero → completed; otherwise next secret |
| `secret-failed`/`secret-unknown` | failure | secret creation | unknown outcome |
| `dependency-failure`/`timeout` | failure or none | nonterminal | failed |
| `cancellation` | none | nonterminal | cancelled + abort |
| `late-event` | none | any nonterminal | ignored |

Migration effects are typed in `MigrationWorkflowEffectMap`; handlers live in `effect-runner/handlers`. REST, local computation, Logux, timer/retry, abort, and settlement effects remain distinct. Runtime classifies import, archive durability, and secret dependency errors into unknown-outcome events before dispatch. Tests cover required payloads, archive branches, secret branches, remaining counts, unknown import, and structured failures.

## Rename durability

Initial `READY`; terminal `CONFIRMED`, `FAILED`, `EXHAUSTED`, `CANCELLED`. Context carries project/workspace/folder/name. `ATTEMPTING` carries attempt ID/count, limit, deadline; `WAITING_TO_RETRY` adds next retry deadline. The reducer has no effect type: `catalog/rename-barrier.ts` performs catalog lookup, timer/sleep, retry scheduling, exhaustion, and settlement outside the reducer.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `READY` | context | none | start-attempt, cancel | runner work | attempting/cancelled | no |
| `ATTEMPTING` | context, attempt, attemptID, limit, deadline | none | matching catalog result/failures, cancel | external lookup | confirmed/failed/waiting/cancelled | no |
| `WAITING_TO_RETRY` | context, attempt, attemptID, next deadline, limit, deadline | none | matching retry timer, timer failure, start-attempt, cancel | external timer | attempting/failed/cancelled | no |
| `CONFIRMED` | context, project identity | none | none | none | none | yes |
| `FAILED` | context, code, diagnostic, retryable | none | none | none | none | yes |
| `EXHAUSTED` | context, diagnostic, retryable true | none | none | none | none | yes |
| `CANCELLED` | context, diagnostic, retryable false | none | none | none | none | yes |

| Event kind | Payload | Accepted states | Result |
|---|---|---|---|
| `start-attempt` | attempt, attemptID, limit, deadline | ready/waiting | attempting |
| `catalog-result` | attemptID, optional project, matches | matching attempting | matching project → confirmed; otherwise ignored |
| `transient-failure` | attemptID, diagnostic | matching attempting | intentionally ignored; runner decides retry |
| `permanent-failure` | code, diagnostic, retryable | attempting | failed |
| `retry-timer` | attemptID, next ID, deadline | matching waiting | attempting |
| `timer-failure` | diagnostic | waiting | retryable failed |
| `cancel` | none | nonterminal | cancelled |

Potential invalid events/states: transient failure is a no-op in the reducer; start-attempt does not validate attempt monotonicity; deadline/limit enforcement is external. Tests cover exact identity, five-attempt bound, and superseded attempt responses.

## Logux catalog

Initial `CONNECTING`; terminal `COMPLETED`, `FAILED`, `TIMED_OUT`. Context contains operation ID, channel, requested types. The runner is `logux/index.ts:syncCatalog`; transport frames are normalized before domain events.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `CONNECTING` | context | none | connection-established | none | connected | no |
| `CONNECTED` | context | none | connected | subscription on transition | subscribing | no |
| `SUBSCRIBING` | context, subscription sync ID | none | matching subscription-synced | none | collecting | no |
| `COLLECTING` | context, sync ID, seen types, rows, byte count | none | scoped catalog action; failures; timeout/interruption | close/settle on terminal | collecting/completed/failed/timed out | no |
| `COMPLETED` | context, seen types, rows | none | none | none | none | yes |
| `FAILED` | context, code, diagnostic, retryable | none | none | none | none | yes |
| `TIMED_OUT` | context, timeout code/diagnostic, retryable true | none | none | none | none | yes |

`catalog-action` is accepted only when operation ID, channel, and optional workspace scope match; duplicate/unrequested types are ignored while byte count is updated. Row bound >100,000 fails and closes. Error frame/transport failure closes and settles. Connection interruption settles without an explicit close effect. No distinct unknown-outcome state; failures are marked retryable where appropriate.

| Event kind | Required fields | Optional fields | Producer | Accepted states | Result |
|---|---|---|---|---|---|
| `connection-established` | none | none | transport | connecting | connected |
| `connected` | subscriptionSyncID | none | frame adapter | connected | subscribing + send subscription |
| `subscription-synced` | syncID | none | frame adapter | matching subscribing | collecting |
| `catalog-action` | operationID, channel, type, rows, byteCount | workspaceID | frame normalizer | collecting | append/ignore/complete/fail bound |
| `error-frame` | code, diagnostic | none | frame adapter | nonterminal | failed + close/settle |
| `transport-failure` | diagnostic | none | connection | nonterminal | failed + close/settle |
| `connection-interrupted` | none | none | connection | nonterminal | failed + settle |
| `transport-timeout` | none | none | timer | nonterminal | timed out + close/settle |

Effects: `send-subscription` is a Logux WebSocket action; `close-socket` is cleanup; `settle` is local settlement. Tests cover scoped collection, duplicate/out-of-scope actions, row bound, and transport behavior.

## Logux folder

Initial `CONNECTING`; terminal `COMPLETED`, `FAILED`, `UNKNOWN_OUTCOME`. Runner is `logux/create-folder.ts`. Correlation uses workspace/channel, origin/action ID, subscription/mutation sync IDs, folder name, and completion folder ID/name.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `CONNECTING` | context | none | connection-established/failure/timeout | cleanup on failure | connected/failed/unknown | no |
| `CONNECTED` | context | none | connected/failure/timeout | none | subscribing | no |
| `SUBSCRIBING` | context, subscription sync ID | none | matching subscription sync | none | subscribed | no |
| `SUBSCRIBED` | context, subscription sync ID | none | mutation-sent | send mutation | mutation sent | no |
| `MUTATION_SENT` | context, both sync IDs | none | matching mutation sync; scoped folder completion | close/settle on terminal | completed/failed/unknown | no |
| `COMPLETED` | context, folder ID/name | none | none | none | none | yes |
| `FAILED` | context, code, diagnostic, retryable | none | none | none | none | yes |
| `UNKNOWN_OUTCOME` | context, code, diagnostic, retryable true | none | none | none | none | yes |

`folder-completed` optional fields (`origin`, `channel`, `workspaceID`, `folderID`, `folderName`) are protocol omission/legacy tolerance; the reducer requires scoped channel/workspace and requires ID/name before completion. Timeout is unknown. Interruption before mutation is failed; after mutation is unknown. Effects are send-subscription, send-mutation, close-socket, settle. Tests cover matching completion and interruption/timeout classification.

## Logux rename

Initial `CONNECTING`; `bypassRename` creates terminal `BYPASSED_NO_COLLISION`. Terminals are `COMPLETED`, `BYPASSED_NO_COLLISION`, `FAILED`, `UNKNOWN_OUTCOME`. Runner is `logux/rename-project.ts`. Correlation uses context identity/origin, subscription and mutation sync IDs, action ID, patch observation, and catalog retry count/limit/deadline.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `CONNECTING` | context | none | connection-established/failure/timeout | cleanup on failure | connected/failed/unknown | no |
| `CONNECTED` | context, subscription sync ID | none | connected | send subscription | subscribing | no |
| `SUBSCRIBING` | context, subscription sync ID | none | matching subscription sync | none | subscribed | no |
| `SUBSCRIBED` | context, subscription sync ID | none | mutation-sent | send mutation | mutation sent | no |
| `MUTATION_SENT` | context, both sync IDs, action ID, patchObserved | none | mutation sync, project patch, failure/timeout | close/settle on ack | acknowledged/failed/unknown | no |
| `MUTATION_ACKNOWLEDGED` | context, mutation sync ID, action ID, patchObserved | none | project patch, catalog result | retry or settle | completed/reconciling | no |
| `CATALOG_RECONCILING` | context, retry count/limit/deadline, patchObserved | none | catalog result/retry | start catalog retry or settle | completed/reconciling | no |
| `COMPLETED` | context, patchObserved | none | none | none | none | yes |
| `BYPASSED_NO_COLLISION` | context | none | none | none | none | yes |
| `FAILED` | context, code | diagnostic optional | none | none | none | yes |
| `UNKNOWN_OUTCOME` | context, code | diagnostic optional | none | none | none | yes |

`catalog-result.matches=false` starts reconciliation; true completes. `project-patch` only sets evidence when true. Timeout and post-dispatch close are unknown; pre-dispatch close is failed. Effects are subscription, mutation, retry, close, settle. Tests cover IDs, acknowledgement, durability, close classification, and bypass.

## Logux secret

Initial `CONNECTING`; terminals `COMPLETED`, `FAILED`, `UNKNOWN_OUTCOME`. Runner is `logux/create-secret.ts`; authoritative reducer is `transitionSecretStateWithEffects`, while `transitionSecretState` discards effects. Correlation uses assistant/action ID; `secret-done.actionID` is checked.

| State | Required fields | Optional fields | Accepted events | Effects | Next states | Terminal |
|---|---|---|---|---|---|---|
| `CONNECTING` | assistantID, actionID | none | connection-established | none | connected | no |
| `CONNECTED` | assistantID, actionID | none | connected | send subscription | subscribing | no |
| `SUBSCRIBING` | assistantID, actionID | none | subscription-synced | none | subscribed | no |
| `SUBSCRIBED` | assistantID, actionID | none | mutation-sent | send mutation | mutation sent | no |
| `MUTATION_SENT` | assistantID, actionID, mutationSyncID | none | matching secret-done, mutation-synced, failure/timeout | close/settle on terminal | completed/failed/unknown | no |
| `COMPLETED` | assistantID, actionID | none | none | none | none | yes |
| `FAILED` | assistantID, actionID, dependency code | none | none | none | none | yes |
| `UNKNOWN_OUTCOME` | assistantID, actionID, dependency code | none | none | none | none | yes |

Potential invalid event: `mutation-synced` is accepted in `MUTATION_SENT` without comparing `event.syncID` to `state.mutationSyncID`. `error-frame` and `transport-failure` have no diagnostic/correlation payload. Timeout is unknown; interruption after mutation is unknown, before mutation failed. Effects are subscription, mutation, close, settle. Tests cover action ID matching and secret failure evidence; direct lifecycle coverage is partial.

## Cross-machine accepted/ignored events

| Machine | Accepted-event rule | Important ignored/late events |
|---|---|---|
| Job observation | state-specific; terminal none | stale dispatch ID; stream/poll events in wrong mode |
| Migration | stage-specific; terminal none | stage-incompatible successes; explicit late-event |
| Rename durability | ready/waiting/attempting-specific | stale attempt IDs; false catalog result; transient failure no-op |
| Catalog | connection/subscription/collection-specific | wrong operation/channel/workspace, duplicate/unrequested type, wrong sync |
| Folder | lifecycle plus exact sync/correlation | wrong sync IDs; unscoped completion |
| Rename | lifecycle plus sync/action and catalog evidence | false patch; wrong sync; catalog result before acknowledgement |
| Secret | lifecycle plus action ID | mismatched secret action; mutation sync currently unchecked |

## Candidate type maps — do not implement in Pass 2

### Candidate event maps

- Separate job commands (`execute-dispatched`, `polling-started`) from stream/poll facts; add job correlation to polling facts only after runner ownership is confirmed.
- Keep migration workflow events separate from commands such as start/cancel.
- Keep transport events, parsed frames, and domain events separate for every Logux machine.
- Keep rename durability timer events separate from catalog result events.

### Candidate effect maps

- Preserve distinct SSE, polling, REST, Logux WebSocket, timer, local computation, abort, and settlement effects.
- `MigrationWorkflowEffectMap` is already a useful effect registry; `resolve-secrets` correctly carries `phase`.
- Rename durability runner effects should not be added to the reducer until `rename-barrier.ts` ownership is confirmed.

### Candidate state unions

- Migration active states could remove inherited optional `code`, `retryable`, and `diagnostic`; terminal success/failure remain separate.
- Rename grouped connection states could split if consumers need state-specific guarantees.
- Secret grouped connection states could split if sync guarantees are tightened.
- Do not merge failed and unknown outcomes, bypassed rename and completed, or any of the five Logux domain machines.

Each candidate: **Existing type:** current union; **Proposed discriminant:** current `kind`/`stage`; **Proposed variants:** state-specific required payloads; **Optional fields removed:** only active failure metadata or proven-missing correlation; **Consumers affected:** reducer runners/tests; **Wire contract affected:** none for internal reducers, but frame adapters must not be silently changed; **Safe to implement:** not yet, pending consumer verification.

## Summary and Pass 3 readiness

- **States documented:** every variant in all seven state unions, including terminal states and grouped variants.
- **Events documented:** every event kind; optional protocol fields were identified as absence, compatibility, or missing guarantee where applicable.
- **Effects documented:** every declared effect; rename durability has no reducer effect type and runner work remains external.
- **Correlation fields:** job/operation/plan IDs, action/origin IDs, channels/workspaces, subscription/mutation sync IDs, attempt IDs, retry bounds/deadlines.
- **Unknown-outcome paths:** job observation, migration archive/import/secrets, folder post-dispatch interruption/timeout, rename timeout/post-dispatch interruption, secret timeout/post-dispatch interruption.
- **Retry paths:** stream→poll fallback, rename durability external retry, rename catalog reconciliation, and retryable failures outside reducers.
- **Cleanup paths:** close socket, settle, abort active operation, timer/sleep ownership, and stream/poll cleanup.
- **Potential invalid states/events:** active migration failure metadata, unchecked secret mutation sync, uncorrelated polling facts, optional terminal diagnostics, transient rename no-op, and trusted secret remaining count.
- **Types that must remain separate:** transport/frame/domain layers, REST/SSE/Logux/timer/settlement effects, and all seven domain reducers.
- **Safe for Pass 3:** only narrowly scoped internal invariant tightening after consumer verification; no candidate is implementation-ready solely from this pass.
- **Unresolved source behavior:** catalog interruption cleanup ownership; secret mutation sync correlation intent; migration secret creation’s apparent batch behavior; rename durability retry/exhaustion ownership.
