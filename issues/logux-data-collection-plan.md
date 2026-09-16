# Voiceflow Logux Data Collection Plan

## Goal

Collect evidence before changing the implementation. The goal is to identify the exact mutation, acknowledgement, durable-state event, and import visibility boundary used by Voiceflow.

Do not infer protocol semantics from labels, timing, or project counts alone.

## Evidence still missing

### A. Native Voiceflow UI rename: successful control

Perform a manual rename of an existing project in the Voiceflow UI with no migration running.

Capture:

- WebSocket URL and connection sequence
- `connect` frame and `connected` response
- workspace subscription frame and matching `synced` response
- exact outgoing rename action
- exact sync/request ID used for the rename action
- outgoing `meta.origin` and `meta.actionID`
- every incoming frame until the UI displays the new name
- `logux/processed` frame, including its complete action `id`
- any `project.CRUD:PATCH`, `project.CRUD:REPLACE`, `assistant.REPLACE`, or other state event
- socket close timing
- the UI's follow-up catalog/read requests

This is the highest-value missing capture. It establishes what Voiceflow itself considers a successful rename.

### B. Native Voiceflow UI rename: collision control

Rename a project to a name already used in the same workspace/folder, if the UI permits it. If not, capture the UI's collision behavior separately.

Capture:

- whether Voiceflow rejects, suffixes, or mutates the existing project
- all action types and payloads
- whether the old project and new project IDs remain stable
- folder IDs before and after

### C. Plugin rename: successful and failing runs

Capture the plugin WebSocket independently from the XYOps stream.

For each run record:

- deployed plugin version
- source commit used to build it
- event title/ID
- source workspace/project/version IDs
- destination workspace/folder IDs
- collision project ID
- generated archive name
- monotonic timestamps from socket open through close
- all redacted WebSocket frames in original array form

Capture at least:

1. rename with no collision
2. rename with exact collision
3. rename with a same-named project outside the destination folder
4. rename where `logux/processed` arrives but no patch is observed
5. rename where the catalog later shows the timestamped name
6. rename where the catalog continues showing the old name

### D. Fresh catalog read after rename

For the same collision run, open a new catalog session immediately after each of these events:

1. before the rename
2. after `logux/processed`
3. after socket close
4. after 250 ms, 1 s, 5 s, and 15 s

For every response preserve the raw rows needed to identify:

- project ID
- project name/label
- workspace ID
- folder ID
- assistant ID/name if separate
- server timestamps or revisions, if present

This determines whether the catalog is authoritative and how quickly it converges.

### E. Import HTTP request and response

Capture the migration import request only after the rename state is known.

Record:

- exact URL workspace path segment
- folder ID multipart field
- target schema version
- request start time relative to rename events
- response status
- response body identifiers: project ID, workspace ID, folder ID, name
- response headers useful for request correlation

Redact:

- JWTs and authorization headers
- exported project file contents
- secrets
- cookies

Run two controls:

1. import with no name collision
2. import after a manually completed rename with enough time for convergence

Then compare with the immediate-import case that creates `(1)`.

### F. XYOps job and stream traffic

Capture all client/server traffic for the execute job:

1. `/api/app/run_event/v1` request and response
2. returned job/launch ID
3. `/api/app/stream_job/v1` events, including timestamps
4. `/api/app/get_job/v1` response after stream completion or disconnect
5. worker/plugin output and stderr diagnostics
6. final job status and stored output

This is required to distinguish:

- plugin failure before import
- import request timeout
- import success with lost stream
- job still running
- malformed or missing terminal output

### G. Existing comparison operations

Capture known Logux operations implemented in the repository:

#### Folder creation

```text
connect
workspace subscription
workspace-folder.CREATE_ONE_STARTED
workspace-folder.CREATE_ONE_DONE
```

#### Secret creation

```text
connect
assistant subscription
secret.CREATE_ONE_STARTED
secret.CREATE_ONE_DONE
```

For both, capture the complete frames and compare:

- sync ID
- action ID format
- origin format
- request metadata
- completion action type
- whether completion is on the same socket

These comparisons may reveal the rename-specific protocol difference.

## Required correlation fields

Every captured frame/request must have these fields in the analysis table:

| Field | Requirement |
|---|---|
| run ID | locally assigned capture ID |
| process | catalog, rename, folder, secret, import, stream |
| direction | client -> server or server -> client |
| monotonic time | milliseconds from process start |
| wall-clock time | ISO timestamp if available |
| socket/request ID | distinguish concurrent connections |
| frame index | original WebSocket array index preserved |
| frame kind | `connect`, `connected`, `sync`, `synced`, `processed`, etc. |
| sync ID | exact `frame[1]`, including `0` |
| action type | exact `frame[2].type` |
| origin | redacted consistently, but equality preserved |
| action ID | equality preserved across request/response |
| workspace ID | exact ID |
| project/resource ID | exact ID |
| folder ID | exact ID |
| name | archive/source/import name |
| response | status or matching frame |

## Minimum capture set

A useful first collection does not require every scenario. Collect these five runs:

1. UI manual project rename, no collision.
2. Plugin project rename with exact collision.
3. Plugin rename followed by fresh catalog reads at timed intervals.
4. Plugin import with no collision.
5. Plugin import after rename, including the `(1)` case.

If possible, add folder creation and secret creation as comparison controls in the same authenticated session.

## Analysis questions to answer from the captures

1. Is the plugin's outgoing rename byte-for-byte equivalent to the UI rename action apart from IDs and names?
2. Does the UI receive `project.CRUD:PATCH`? If yes, on which socket and after which frame?
3. Is `logux/processed` correlated by origin, action ID, or the encoded action `id`?
4. Does the UI send an acknowledgement or follow-up sync after `logux/processed`?
5. Does a fresh catalog show the rename even when the mutation socket does not broadcast a patch?
6. Does the import service observe the catalog rename at the same time as Logux?
7. What exact event marks the end of the rename consistency window?
8. Does the import response identify the created project and actual workspace/folder?
9. When the stream fails, what is the stored XYOps job output?
10. Can an existing imported project be reconciled uniquely before retrying?

## Safety rules

- Never include JWTs, cookies, authorization headers, exported project data, secret values, or full multipart files in the analysis artifact.
- Preserve IDs and names when they are needed for correlation, or replace them consistently with stable placeholders.
- Do not retry an import with unknown outcome until the destination has been reconciled.
- Record the deployed artifact hash/version for every run.
- Do not change protocol code based on a single capture.
