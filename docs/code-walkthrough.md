# Voiceflow migration code walkthrough

This guide follows the **active native XYOps plugin**. The files under
`windmill_agent_scripts/` are archived and should remain behaviorally aligned,
but they are not the deployed runtime.

The goal is to read the system in execution order and pause at each function to
ask: what input does it accept, what invariant does it establish, what effect
does it perform, and what failure can escape?

## 1. The complete runtime path

```text
xyops/plugin/entrypoint.ts
  -> readPluginJob(stdin)
  -> runNativePlugin(job)
      -> validatePluginJob(job)
      -> readVoiceflowJWT(environment)
      -> dispatchOperation(job, token)
          -> one of seven Voiceflow main functions
              -> auth
              -> catalog/planning
              -> HTTP or Logux effect
              -> Envelope
      -> mapVoiceflowEnvelope / mapPluginError
  -> stdout: one JSON response
```

The interactive CLI is a separate caller:

```text
xyops/cli/migration/index.ts
  -> readXYOpsConfig
  -> readEventWithRetry / pollJob
  -> readJobResponse / requireEnvelope
  -> interactive selections
  -> plan event
  -> explicit confirmation
  -> execute event
```

The most important current contract is that operation names are snake_case:
`check_session`, `list_workspaces`, `list_projects`, `list_versions`,
`list_folders`, `plan_migration`, and `execute_migration`. Event titles remain
`voiceflow_*`.

---

## 2. Plugin boundary: stdin to one response

### `xyops/plugin/entrypoint.ts`

- `reportProcessFailure(error)` writes a bounded diagnostic to stderr. It must
  never write protocol data or secrets.
- The entrypoint reads one job, invokes the process runner, and exits through
  the platform boundary.

**Review question:** What happens if stdin contains multiple JSON documents,
trailing bytes, or an empty document? The intended answer is controlled input
failure, not partial dispatch.

### `xyops/plugin/stdin_job.ts`

- `decodePluginChunk(chunk, decoder)` converts string or byte input into text.
- `readPluginInput(input)` concatenates chunks and enforces the input limit.
- `readPluginJob(input)` parses the complete input and passes the unknown value
  to validation.

**Review questions:**

- Is the byte limit measured in bytes rather than JavaScript characters?
- Is a UTF-8 character split between chunks decoded safely?
- Is the input promise fully awaited and rejected safely?

### `xyops/plugin/job_validation.ts`

- `requireOperationName(value)` requires a non-empty operation selector.
- `requireSupportedOperation(value)` converts the string into the closed
  `PluginOperation` union.
- `selectOperation(params)` reads `params.operation`.
- `isPluginEventJob(value)` checks the outer job shape.
- `isEventRecord(value)` and `isEventTypeRecord(value)` validate event metadata.
- `validatePluginJob(value)` validates the whole untrusted job and returns a
  `NativePluginJob`.
- `parsePluginJob(input)` parses JSON and translates malformed input into a
  validation fault.
- `readVoiceflowJWT(environment)` reads only `VOICEFLOW_JWT` from the process
  environment.

**Review questions:**

- Are `null`, numbers, arrays, and whitespace-only values rejected?
- Can a top-level `secrets` field override the environment secret?
- Does unknown operation input fail before any Voiceflow effect?

### `xyops/plugin/operation_dispatch.ts`

- `requireParameterString(value)` validates required string parameters.
- `trimParameter(value)` trims optional string parameters.
- `requiredParameter(job, name)` reads and validates a required job parameter.
- `optionalParameter(job, name)` reads an optional value with the operation's
  default behavior.
- `optionalSecretInput(job, name)` reads `SECRET_FILE_CONTENTS` without logging
  or normalizing secret values twice.
- `requiredConfirmation(job)` accepts only literal boolean `true`.
- `operationInvocations` maps each operation to its handler and exact parameter
  list.
- `invokeOperation(operation, invoke)` converts unexpected handler failures to
  an operation failure envelope.
- `dispatchOperation(job, token, handlers)` selects and invokes exactly one
  operation.

**Review questions:**

- Are parameter names still exactly aligned with the CLI and Event bindings?
- Are IDs trimmed once at this boundary and then treated as validated values?
- Does `execute_migration` require confirmation before authentication or any
  non-idempotent effect?

### `xyops/plugin/wire_protocol.ts`

- `mapVoiceflowEnvelope(envelope)` translates an operation envelope to the
  XYOps response shape.
- `createProtocolFailure(code, description)` creates safe protocol errors.
- `appendPluginDiagnostic(description, diagnostic)` adds bounded diagnostics.
- `mapPluginError(error, diagnostic)` translates faults into protocol output.

**Review question:** Is the output always one JSON object, newline terminated,
and free of raw input, JWTs, project IDs from error messages, and stack traces?

### `xyops/plugin/process_entrypoint.ts`

- `writeDiagnostic(output, diagnostic)` writes only to stderr.
- `buildPluginResponse(job, environment)` validates, authenticates the process
  boundary, dispatches, and maps the result.
- `runNativePlugin(input, environment, output)` reads one job and writes one
  response.

This is the imperative shell. Business decisions should not move here.

---

## 3. Shared Voiceflow contracts and guards

### `xyops/voiceflow/types.ts`

This is the domain vocabulary: envelopes, errors, warnings, selections,
plans, imported receipts, auth context, HTTP artifacts, catalog records, and
execute results.

Important current design issue: IDs are all plain `string`. This makes it easy
to accidentally pass a project ID where a folder ID is expected. A later
refactor could introduce branded types after runtime validation, for example
`WorkspaceID`, `ProjectID`, `FolderID`, and `VersionID`.

### `xyops/voiceflow/vf_contracts.ts`

- `OperationFault` is the expected domain failure type.
- `errorDetail(error)` extracts an error message.
- `safeUnexpectedErrorMessage(error)` removes sensitive material and bounds
  unexpected diagnostics.
- `readFailureStage(value)` preserves only a safe stage marker.
- `containsSensitiveWord(value)` detects suspicious diagnostic text.
- `toOperationError(error)` converts unknown failures to the stable error shape.
- `success(operation, operationID, result, warnings)` creates a success
  envelope.
- `failure(operation, operationID, error)` creates a failure envelope.

**Bug checkpoint:** the sensitive-word filter is heuristic. It protects against
common leaks, but URL/token redaction should happen at the boundary before
errors are constructed, not only when the final message is rendered.

### `xyops/voiceflow/vf_validation.ts`

- `isNonEmptyString(value)` checks type plus trimmed non-emptiness.
- `requireVoiceflowString(value)` trims and rejects missing values.

This is currently the main generic string policy. It does **not** enforce a
maximum length, control-character policy, field-specific character set, or
semantic ID shape.

### `xyops/voiceflow/guards.ts`

- `isRecord`, `isObject`, `isClaims`, and `isRawRow` establish object-shaped
  unknown values.
- `isRowArray` validates arrays of records.
- `isNumericFolderID` enforces the current numeric folder-ID contract.
- `isRetryableHttpStatus` classifies retryable HTTP responses.
- `isImportOutcomeUnknownStatus` protects the non-retryable import boundary.
- `isConfirmationGranted` enforces literal confirmation.
- `isValidCreatorID` validates the creator identity used in Logux channels.
- `hasControlCharacter` and `hasPathSeparator` support safe identity checks.

**Bug checkpoint:** folder IDs are assumed numeric in several places. That is
correct for current observed data, but it will reject a newly created folder if
Logux returns a non-numeric identifier. Resolve that from the captured UI
protocol before loosening the guard.

---

## 4. Authentication and HTTP effects

### `xyops/voiceflow/vf_auth.ts`

- `acquireVoiceflowToken(input)` accepts a string and removes an optional
  `Bearer` prefix.
- `decodeClaims(token)` decodes the JWT payload without claiming signature
  verification.
- `extractCreatorID(claims)` applies creator-ID claim precedence and validates
  the result.
- `resolveVoiceflowAuth(input)` composes those steps into `AuthContext`.

**Important limitation:** this authenticates the token's shape and extracts a
claim; it does not verify the JWT signature. That is documented and must not be
mistaken for full authentication.

### `xyops/voiceflow/vf_http/index.ts`

- `requireFetch` and `requireAbortController` validate runtime capabilities.
- `createHttpCapabilities()` collects the runtime implementations.
- `requestBytes(request)` is the public bounded HTTP operation.
- `executeTimedRequest(request)` owns the timeout lifecycle.
- `performRequest(request, signal, capabilities)` performs fetch, validates
  declared size, and reads the response.
- `validateDeclaredSize(response, maxBytes)` rejects oversized declared bodies.
- `readHttpBytes(response, maxBytes)` handles an absent or streamed body.
- `declaredExceedsLimit(declared, maxBytes)` is the pure size rule.
- `requestFault`, `nonOperationFault`, and `isAbortError` translate runtime
  failures into stable dependency faults.
- `isDomException`, `isAbortNamedError`, `isObjectValue`, `isNamedObject`, and
  `getErrorName` support portable abort detection.

**Bug checkpoints:**

- A server can omit or falsify `content-length`; the streamed byte limit is the
  real protection.
- A timeout abort and a caller cancellation are currently indistinguishable.
- There is no URL policy at this boundary; callers pass arbitrary strings.

### `xyops/voiceflow/vf_export.ts`

- `parseSourceVersionID(value)` validates the version identifier.
- `exportVersion(auth, sourceVersionID)` constructs the export URL, performs a
  bounded request, checks status, and returns an in-memory artifact.

### `xyops/voiceflow/vf_import/index.ts` and `input.ts`

- `requiredFolderID(value)` validates a non-empty numeric folder ID.
- `validFilename(value)` blocks path traversal and requires `.vf`.
- `primitiveID(value)` normalizes primitive response IDs.
- `nestedProjectID(row)` reads a nested project identifier.
- `receipt(value, status, bytes)` converts an untrusted import response into an
  allowlisted receipt.
- `importVersion(...)` validates destination fields, builds multipart form data,
  sends the import request, classifies unknown outcomes, and parses the receipt.

**Bug checkpoint:** the import operation currently requires a folder ID before
it can send the request. The requested folder-name feature must resolve/create a
folder before this function, then pass the resulting validated ID here.

---

## 5. Catalog and planning

### `xyops/voiceflow/vf_catalog/record-parsers.ts`

- `readID` and `normalizeOptionalID` normalize string/number IDs.
- `readLabel` applies Voiceflow's label aliases.
- `readEnvironmentRows` and `readObjectEnvironmentRows` support array and keyed
  environment representations.
- `readEnvironment`, `readEnvironments`, and `readOptionalVersion` project
  environment data.
- `parseWorkspace`, `parseProject`, and `parseFolder` validate raw rows.
- `projectIdentity` / `withProjectWorkspace` and
  `folderIdentity` / `numericFolderIdentity` enforce required relationships.
- `projectRows(parser)` drops malformed records and keeps valid projections.

**Review question:** dropping malformed rows is safe for discovery but can hide
an upstream schema regression. Consider a bounded warning/diagnostic count if
operators need to distinguish “empty catalog” from “all rows malformed.”

### `xyops/voiceflow/vf_catalog/options.ts`

- `normalizeIDAsync` creates the Promise boundary for ID validation.
- `projectOptionValues`, `sortOptionsByLabel`, and `buildOptions` create stable
  UI options.
- `selectProjectsInWorkspace` and `selectFoldersInWorkspace` enforce workspace
  ownership.
- `loadCatalogRows` partially applies a channel and wanted Logux action types.
- `loadWorkspaces`, `loadProjects`, and `loadFolders` fetch and parse catalog
  rows.
- `workspaceOptions`, `projectOptions`, `folderOptions`, and `versionOptions`
  produce validated display choices.
- `buildVersionOptions` emits draft/published choices.
- `listWorkspaces`, `listProjects`, `listFolders`, and `listVersions` are the
  public catalog operations.

**Bug checkpoint:** `versionOptions` requires the project to exist in the
workspace, but the source and destination workspace relationship is only
validated later by planning. That is correct only if cross-workspace source /
destination behavior is intended.

### `xyops/voiceflow/vf_planning/index.ts`

- `normalizeMigrationSelection(input)` trims and validates all selection fields.
- `findLabel(options, value)` turns IDs into stable human-readable labels.
- `buildMigrationPlan(auth, input)` loads the relevant catalogs in parallel,
  validates every selected item, computes the plan ID, and returns the plan.

### `xyops/voiceflow/vf_planning/plan-id.ts`

- `formatPlanID(bytes)` turns SHA-256 bytes into a short hexadecimal ID.
- `planID(selection)` hashes canonical JSON for deterministic plan matching.

**Bug checkpoint:** adding a folder name versus a folder ID to the selection will
change the plan hash. Decide whether the plan records the requested name, the
resolved folder ID, or both. The safest model is to plan the intent and record
the resolved destination at execution, but that means folder creation is an
execution-time effect and the plan must explicitly permit it.

---

## 6. Logux transport

### `xyops/voiceflow/vf_logux/index.ts`

- `random8()` creates short client identifiers.
- `sendFrame(ws, frame)` serializes a Logux frame.
- `syncCatalog(auth, channel, wanted)` opens a socket, authenticates, subscribes,
  collects wanted action types, enforces frame/total/row limits, and settles
  once all requested types arrive.
- `isSupportedRequest(wanted)` restricts catalog subscriptions.
- `closeSocket(ws)` makes cleanup non-fatal.
- `createProjectSecrets(auth, assistantID, secrets)` creates secrets
  sequentially, avoiding concurrent mutation races.
- `settlePromise(...)` maps socket completion to Promise resolution/rejection.

### `xyops/voiceflow/vf_logux/frames.ts`

- `handleIncomingMessage` accepts text WebSocket messages.
- `handleTextMessage` measures bytes, applies limits, parses JSON, and dispatches.
- `parseJSON`, `parseFrame`, and `asFrame` form the tolerant parser boundary.
- `frameHandlers` handles `error` and `connected` control frames.
- `handleFrame` selects control-frame or catalog-action handling.
- `dispatchFrame` invokes the selected branch.
- `errorCodeForFrame` maps Logux errors.
- `handleActionFrame`, `parseActionFrame`, `readFrameAction`,
  `readActionPayload`, `objectPayload`, `readWantedActionType`, and
  `readActionValues` validate and project catalog actions.
- `parsedAction`, `dispatchAction`, `appendAction`, and
  `completeIfAllTypesSeen` collect rows and resolve when complete.
- `rowsExceedLimit`, `isString`, `isDefined`, and
  `hasSeenAllWantedTypes` are pure boundary predicates.

**Bug checkpoints:**

- Unknown/malformed frames are ignored. Confirm this is intentional and does
  not allow a connection to wait until timeout forever.
- `syncCatalog` uses a random request ID and action IDs. Confirm collisions are
  acceptable within the socket lifecycle.
- Socket errors after settlement must not create unhandled Promise behavior.

### `xyops/voiceflow/vf_logux/create-secret.ts`

- `createSecret(auth, assistantID, secret)` runs the authenticated
  subscribe-then-create lifecycle.
- `sendSubscription` subscribes to the assistant channel.
- `isSubscriptionComplete` recognizes the subscription acknowledgement.
- `sendCreateAction` emits `secret.CREATE_ONE_STARTED`.
- `randomActionNumber` creates Logux numeric action IDs.
- `parseFrame` and `isDoneFrame` validate the completion action.
- `isRecord` guards action metadata.

This is the closest existing mutation pattern for the requested folder feature,
but it cannot be copied blindly: folder channel, action name, payload, and
completion acknowledgement still need to come from a captured UI request.

---

## 7. Operation entrypoints

### Read-only operations

Each of these follows the same pattern:

1. Generate an operation ID.
2. Resolve auth.
3. Call one catalog function.
4. Return `success` or `failure`.

Files:

- `vf_check_session.ts`: `sessionResult`, `main`.
- `vf_list_workspaces.ts`: `main`.
- `vf_list_projects.ts`: `main`.
- `vf_list_versions.ts`: `main`.
- `vf_list_folders.ts`: `main`.

### `vf_plan_migration.ts`

- `migrationSelection(...)` creates the typed selection.
- `main(...)` resolves the selection and delegates to
  `buildMigrationPlan`.

Planning is intended to be read-only. It should not create folders.

### `vf_execute_migration/index.ts`

- `migrationSelection(...)` creates the execution selection.
- `executeWarnings(apiKeyRetrieved)` builds non-idempotency/API-key warnings.
- `normalizeConfirmation` and `normalizeSchemaVersion` apply defaults.
- `executeConfirmedMigration(...)` runs authentication, plan verification,
  export, import, secret creation, API-key status, and result mapping.
- `addFailureStage` preserves a safe execution stage for unexpected errors.
- `secretInputKind` classifies secret input without exposing its contents.
- `parseSecretFileContents` parses optional secret input.
- `ensureMatchingPlan` prevents execution against a different selection.
- `main(...)` enforces literal confirmation and delegates execution.

**Known pending change:** remove the API-key status step and its types/tests.
The requested folder creation should occur after plan verification and before
import, because import needs the resulting folder ID.

A likely future execution sequence is:

```text
authenticate
  -> verify plan
  -> resolve destination folder
       existing folder ID: validate and use it
       folder name: create through verified Logux protocol, receive ID
  -> export
  -> import into resolved folder ID
  -> create secrets
  -> return result
```

Whether folder creation belongs before or after export is a safety decision.
Creating it immediately before import minimizes unused folders if export fails.
The plan/result should make the choice explicit.

---

## 8. CLI walkthrough

### Configuration: `xyops/cli/config.ts`

- Reads environment values and trims them.
- Parses `id:` and `title:` Event references.
- Validates positive durations.
- Parses and normalizes the XYOps base URL.
- Builds the seven Event references and runtime configuration.

### HTTP/job adapters: `xyops/cli/client/`

- `fetchJSON` performs bounded HTTP requests and validates response shape.
- `eventBody` creates the XYOps request body.
- `readEventWithRetry` retries safe read operations.
- `pollJob` waits for asynchronous completion.
- `readLaunchID`, `readJobResponse`, `readJobOutput`, and
  `readWaitResponseData` handle observed XYOps response variants.
- `requireSuccessfulJob` and `requireEnvelope` reject unsuccessful or malformed
  responses.
- Redaction helpers prevent secrets from entering CLI diagnostics.

### Migration orchestration: `xyops/cli/migration/index.ts`

- `selectSourceSelection` runs workspace/project/version selection.
- `selectDestinationSelection` runs destination workspace/folder selection.
- `readMigrationPlan` dispatches the plan Event.
- `confirmAndExecuteMigration` asks for literal confirmation and dispatches the
  execute Event.
- `readSecretFileContents` and `readSecretsForMigration` load optional secrets.
- `displayPlan`, `summarizeExecution`, and warning helpers produce operator
  output.
- `performMigration` sequences the complete interactive workflow.
- `run` is the public runner; `handleFailure` is the terminal error boundary.

The folder-name feature must change the CLI selection model as well as the
server/plugin parameter model. A prompt that returns a display label is not
enough: the request must distinguish an existing folder ID from a requested
new name.

---

## 9. String handling: recommended direction

Do not replace every string with a heavyweight abstraction. Introduce small,
field-specific boundary functions.

### Keep one generic primitive

Retain `requireVoiceflowString` for ordinary required text, but add limits and
explicit names where useful:

```ts
requireVoiceflowString(value, { field: "project ID", maxLength: 128 })
```

### Add field-specific policies

Recommended policies:

- `parseWorkspaceID`
- `parseProjectID`
- `parseVersionID`
- `parseFolderID`
- `parseFolderName`
- `parseSchemaVersion`
- `parseCreatorID`
- `parseEventOperation`

Each should return a normalized value or throw `OperationFault("INVALID_ARGUMENT")`.
Folder names should reject empty values, control characters, path separators,
and an agreed maximum length. IDs should have an agreed maximum length and
allowed character set based on observed Voiceflow values.

### Prefer branded validated values later

After behavior is stable, use opaque types so validated IDs cannot be mixed:

```ts
type FolderID = string & { readonly __brand: "FolderID" };
```

The constructor/parser, not callers, should establish the brand. Do not add
brands before the actual accepted ID formats are known.

### Never use `String(value)` as validation

`String(undefined)`, `String(null)`, and `String({})` produce misleading values.
Use `unknown` guards first; only stringify values after the boundary has proved
they are an accepted primitive.

---

## 10. URL handling: recommended direction

There are three categories of URL and they should not be handled identically.

### Fixed service endpoints

Centralize trusted origins and paths in one module:

```ts
const VOICEFLOW_IDENTITY_ORIGIN = "https://identity-api.empyrean.voiceflow.com";
const VOICEFLOW_REALTIME_ORIGIN = "https://realtime-http-api.empyrean.voiceflow.com";
const LOGUX_URL = "wss://realtime.empyrean.voiceflow.com/";
```

Keep these constants separate from user input. This makes host/protocol review
and environment changes easier.

### Path parameters

Use `new URL()` plus `url.pathname` or a small `joinURL` function, and encode
individual path segments exactly once. Do not interpolate untrusted IDs into a
whole URL before encoding them.

### User-configured XYOps base URL

`readBaseURL` should continue to parse with `new URL`, but should explicitly
allow only `http:` and `https:` and reject credentials, fragments, and perhaps
unexpected paths according to the deployment contract.

### Browser/login URL

Treat it as a display-only trusted constant. Do not derive it from a token or
return arbitrary server-provided URLs without validation.

### Useful future type split

A small `TrustedURL` / `HTTPURL` / `WebSocketURL` distinction can help, but only
if it prevents a real bug. First centralize construction and add tests for:

- spaces and Unicode IDs;
- slash and backslash characters;
- `?`, `#`, `%`, and `..` in IDs/names;
- invalid schemes such as `file:` or `javascript:`;
- credentials embedded in a configured base URL;
- trailing slash normalization.

---

## 11. Bug-hunt checklist

Use this checklist while walking the implementation:

- [ ] Every external `unknown` value is narrowed before use.
- [ ] Every ID is trimmed once, validated for the correct resource, and not
      silently converted from `null`/`undefined`.
- [ ] Folder ID and folder name are represented as distinct states.
- [ ] A folder is not created during read-only planning.
- [ ] Folder creation is idempotent or duplicate creation is explicitly handled.
- [ ] Folder creation acknowledgement is matched to the correct action ID.
- [ ] Import receives the folder ID returned by creation, not the folder label.
- [ ] Export/import/Logux timeouts close resources deterministically.
- [ ] An unknown import outcome is never blindly retried.
- [ ] Secret values and JWTs never enter logs, errors, plans, or results.
- [ ] Fixed URLs cannot be overridden by user input.
- [ ] Configured XYOps URLs have an allowed scheme and no embedded credentials.
- [ ] Operation IDs are snake_case at every runtime boundary.
- [ ] Event titles remain the external `voiceflow_*` names.
- [ ] The API-key fetch is removed consistently from active and archived paths.
- [ ] Tests cover empty strings, whitespace, malformed IDs, duplicate names,
      malformed Logux frames, timeout, acknowledgement mismatch, and partial
      folder-creation failure.

## 12. Current decision gates

Before implementing folder creation, obtain and record one redacted UI trace
for creating a folder named `Boaz` in a destination workspace. Capture:

- WebSocket URL and channel;
- connect/subscription frames;
- create action type;
- payload field names and workspace association;
- generated folder ID format;
- completion/acknowledgement frame;
- error frame for duplicate or invalid names.

Until those facts are known, the safe implementation boundary is the existing
folder-ID flow. The code should not guess the Logux mutation protocol.
