# Voiceflow Logux Invariants

This is the canonical inventory of Logux invariants used by the migration plugin. It separates protocol facts observed in Voiceflow traffic from implementation requirements that still need confirmation.

## 1. Session invariants

- Each operation opens one authenticated WebSocket session.
- The first client frame is a `connect` frame using protocol version `4`.
- The connect frame contains the Voiceflow JWT only in its token field.
- The session origin remains stable for the lifetime of that WebSocket.
- The origin has creator, client, and session components.
- JWTs, cookies, secret values, and raw sensitive payloads are never written to diagnostics.
- Socket cleanup is idempotent; duplicate terminal frames cannot settle an operation twice.

Observed connect tuple shape (zero-based positions):

```json
["connect", 4, "<origin>", 0, {"token":"<JWT>","subprotocol":"1.9.0"}]
```

```text
index 0 = frame kind: "connect"
index 1 = Logux protocol version: 4
index 2 = client/session origin
index 3 = captured numeric connection-state value: 0
index 4 = connection options and credentials
```

The value at index 3 is preserved as captured, but its formal Voiceflow/Logux meaning has not yet been independently verified. It must not be described as a sync ID or cursor without protocol evidence.

## 2. Frame and sync-ID invariants

- Preserve the tuple structure observed for each Logux frame kind; `connect` is five elements, while action `sync` frames are four elements:
  - `frame[0]`: frame kind
  - `frame[1]`: sync/request ID for `sync` frames; protocol version for the observed `connect` frame
  - `frame[2]`: action or action envelope for `sync` frames; origin for the observed `connect` frame
  - `frame[3]`: client metadata for `sync` frames; captured connection-state value for the observed `connect` frame
- For Voiceflow project rename and secret creation, action metadata (`origin`, `actionID`) is nested under `frame[2].meta`.
- Subscription sync IDs are positive numeric IDs.
- A subscription is complete only when the matching `synced` frame has the same sync ID.
- A mutation must not be sent before its subscription is complete.
- Mutation sync IDs and subscription sync IDs are client-local correlation identifiers; their exact allocation must match the Voiceflow operation being reproduced.
- `logux/processed` is a server transport-processing event. It must not be assumed to prove durable state without operation-specific evidence.
- Unrelated sync IDs, origins, action IDs, projects, workspaces, and channels must be ignored.

Captured frame-shape ledger (redacted):

```json
["connected",4,"server:<id>",[<server-time>,<server-time>],{"subprotocol":"1.9.0"}]
["sync",17,{"channel":"workspace/<workspace-id>","type":"logux/subscribe"},{"id":595,"time":713}]
["synced",17]
["sync",34,{"type":"assistant.PATCH_ONE","payload":{},"meta":{"origin":"<origin>","actionID":"<request-action-id>"}},{"id":9687,"time":9805}]
["sync",0,{"id":"<timestamp> <origin> 0","type":"logux/processed"},{"id":9905,"time":9905,"subprotocol":"1.9.0"}]
["sync",35,{"type":"project.CRUD:PATCH","payload":{},"meta":{"origin":"<origin>","actionID":"<response-action-id>"}},{"id":9813,"time":9931}]
["synced",35]
["error","wrong-format"]
```

The rename action metadata is inside `frame[2].meta`; a five-element rename frame with metadata at `frame[3]` is invalid and produces the observed `error` frame with `serverCode=wrong-format`.

## 3. Catalog synchronization invariants

- Workspace catalog reads subscribe to `workspace/<workspaceID>`.
- Catalog reads are scoped to the requested workspace.
- Project catalog state uses `project.CRUD:REPLACE`.
- Folder ownership is reconciled from `assistant.REPLACE` when required by the Voiceflow projection.
- Folder catalog state uses `workspace-folder.REPLACE`.
- A catalog response must not be treated as authoritative for another workspace.
- Missing or malformed catalog rows are not valid project state.

Observed catalog wanted actions:

```text
workspace.CRUD:REPLACE
project.CRUD:REPLACE
assistant.REPLACE
workspace-folder.REPLACE
```

## 4. Project rename invariants

### Selection

- Select only an exact collision where all of these match:
  - source project name
  - destination workspace ID
  - destination folder ID
- Retain the selected colliding project ID for the rename.
- A same-named project in another workspace or folder is unchanged.
- Generate `<source_name>_YYYYMMDD_HHmm` using the local runtime date/time.
- If that archive name exists in the destination folder, append `_1`, `_2`, and so on without overwriting another project.

### Mutation

The confirmed Voiceflow UI mutation shape is:

```json
[
  "sync",
  "<positive-mutation-sync-id>",
  {
    "type":"assistant.PATCH_ONE",
    "payload":{
      "id":"<colliding-project-id>",
      "patch":{"name":"<timestamped-name>"},
      "context":{"workspaceID":"<destination-workspace-id>"}
    },
    "meta":{
      "origin":"<session-origin>",
      "actionID":"<local-action-id>"
    }
  },
  {"id":<client-id>,"time":<client-time>}
]
```

The confirmed UI exchange used separate sync IDs for the mutation and resulting project broadcast:

```text
sync 34 assistant.PATCH_ONE
→ synced 34
→ logux/processed
→ sync 35 project.CRUD:PATCH
→ synced 35
→ logux/processed
```

- The mutation is sent only after the destination workspace subscription is synced.
- The workspace subscription capture uses no `since` field; do not add one to the rename subscription without direct evidence.
- The mutation changes the name only.
- The mutation does not change `folderID`.
- No Archive-folder lookup, creation, move, or folder patch belongs to this rename operation.
- The WebSocket rename operation completes on the matching mutation `synced` acknowledgement; import remains blocked until the separate catalog durability barrier confirms the resulting project state.

### Completion and durability

- The Voiceflow UI capture showed that the WebSocket mutation completion must be determined from the matching `synced` acknowledgement for the `assistant.PATCH_ONE` mutation, not inferred from a generic `logux/processed` frame.
- Voiceflow may broadcast the resulting state change as `project.CRUD:PATCH` with the project ID, workspace ID, and new name; this broadcast is observed evidence, not the WebSocket completion barrier.
- The project-broadcast action metadata is nested under `frame[2].meta` and uses a distinct action ID from the request action ID.
- The project-broadcast sync ID is distinct from the mutation sync ID.
- The catalog durability barrier, not the optional project broadcast, confirms that the rename is visible before import.
- If the WebSocket closes or times out after the mutation was sent, the rename result is unknown; do not blindly retry import.
- An explicit `error` frame with `frame[1] = "wrong-format"` proves the submitted frame was rejected; it is not a rename acknowledgement.
- Before import after an unknown rename result, reconcile the destination project by exact project ID, workspace ID, folder ID, and timestamped name.
- If reconciliation cannot confirm the rename, return a retryable dependency failure and do not import.

## 5. Secret creation invariants

The successful Voiceflow UI capture established this sequence:

```text
assistant subscription
→ synced(subscription-sync-id)
→ secret.CREATE_ONE_STARTED
→ secret.ADD_ONE
→ secret.CREATE_ONE_DONE
→ synced(0)
→ logux/processed
```

Observed request shape:

```json
[
  "sync",
  "<positive-mutation-sync-id>",
  {
    "type":"secret.CREATE_ONE_STARTED",
    "payload":{
      "context":{"assistantID":"<assistant-id>"},
      "data":{
        "name":"<secret-name>",
        "visibility":"masked|restricted",
        "defaultValue":"<secret-value>"
      }
    },
    "meta":{
      "origin":"<session-origin>",
      "actionID":"<request-action-id>"
    }
  },
  {"id":<client-id>,"time":<client-time>}
]
```

- The assistant subscription must complete before secret creation.
- The secret mutation uses a distinct positive mutation sync ID, not `0`.
- `secret.ADD_ONE` is the state broadcast and contains the created secret metadata, not the secret value.
- `secret.CREATE_ONE_DONE` is the operation completion action.
- `secret.CREATE_ONE_DONE.meta.actionID` equals the outgoing request action ID in the captured UI traffic.
- The server response action is delivered with sync ID `0` in the captured UI traffic.
- `logux/processed` is not required to complete secret creation after `secret.CREATE_ONE_DONE` has matched.
- Secret values must never be logged or included in diagnostics.

## 6. Folder creation invariants

- Folder creation uses a workspace subscription.
- `workspace-folder.CREATE_ONE_STARTED` is sent only after subscription sync.
- The mutation is scoped by `context.workspaceID`.
- Completion must be correlated to the folder-create operation, not a generic processed event.
- The resulting folder ID must be extracted from the completion payload and validated before use.
- A folder in another workspace must never be reused.

Expected lifecycle:

```text
connect
→ workspace subscription
→ synced(subscription-sync-id)
→ workspace-folder.CREATE_ONE_STARTED
→ workspace-folder.CREATE_ONE_DONE
```

## 7. Import ordering invariants

- Export uses the source version.
- Import uses the destination workspace ID in the HTTP URL.
- Import uses the destination folder ID in the multipart form.
- Import must not begin while a required rename is unresolved.
- A source project is never moved as part of the timestamp rename.
- Import must not be retried after an unknown outcome until the destination is reconciled.
- The imported project should retain the original source name when the destination collision has been safely renamed.
- Voiceflow's automatic `(n)` suffix indicates the import service still observed a name collision at import time; it is evidence of a consistency/race problem, not a successful rename proof.

Import endpoint:

```text
POST /v1alpha1/assistant/import-file/<destination-workspace-id>
```

## 8. Secret and post-import ordering invariants

- Secret creation starts only after import returns a usable imported project/assistant ID.
- Secrets are created sequentially through the Logux secret lifecycle.
- A failed secret creation must not be reported as a fully successful migration.
- If import succeeded but secret creation failed, do not rerun the entire migration blindly; reconcile the imported project and retry only the safe follow-up operation.

## 9. Failure invariants

- Timeout before a mutation is sent: permanent operation failure for that stage; no downstream operation.
- Timeout after a mutation is sent: unknown side-effect outcome; reconcile before retrying.
- WebSocket error or close after mutation dispatch has the same ambiguity as a timeout unless the server explicitly proves the mutation was rejected.
- Import must not start after an unresolved rename or folder operation.
- Diagnostics include safe stage information and observed action types where useful.
- Diagnostics exclude JWTs, cookies, secret values, exported project data, and raw sensitive payloads.
- Every Promise created by an operation is returned, awaited, or explicitly handled.

## 10. Evidence status

### Confirmed from Voiceflow traffic

- Connect frame shape and subprotocol.
- Workspace/assistant subscription behavior.
- Positive mutation sync IDs for secret creation.
- `secret.CREATE_ONE_STARTED` request shape.
- `secret.ADD_ONE` broadcast.
- `secret.CREATE_ONE_DONE` completion shape and matching action ID.
- `logux/processed` appears separately from secret completion.
- Import can create `(1)` when the old name remains visible to the import service.
- Successful UI project rename uses `assistant.PATCH_ONE`, followed by `synced` for the mutation and a `project.CRUD:PATCH` state broadcast.
- Project-rename action metadata is nested under the action at `frame[2].meta`; client transport metadata remains at `frame[3]`.

### Confirmed from plugin diagnostics

- The plugin receives `secret.ADD_ONE` and `secret.CREATE_ONE_DONE` with matching action IDs when using the positive mutation sync ID.

### Still requiring direct evidence

- Whether the optional `project.CRUD:PATCH` broadcast is delivered consistently to non-UI workspace subscribers.
- Whether the workspace subscription shape varies by Voiceflow client version; the current rename capture uses no `since` field.
- Whether the catalog projection and import service use the same consistency boundary.
- The exact delay between durable rename visibility and import-service visibility.
- Safe reconciliation for an import whose HTTP/XYOps result is unknown.
