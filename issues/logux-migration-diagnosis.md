# Voiceflow Migration / Logux Investigation Brief

## Purpose

This document captures the current migration failures and the evidence needed to reconstruct the Voiceflow Logux protocol from HAR/WebSocket captures. It is intended as context for an LLM or engineer analyzing captured frames, not as a proposed implementation.

## Current symptoms

1. A destination project collides with the source project name.
2. The plugin opens a Logux WebSocket and sends a project rename mutation.
3. Voiceflow sends a `logux/processed` action, but the plugin does not observe a `project.CRUD:PATCH` broadcast on that socket.
4. The rename operation times out with:

   ```text
   DEPENDENCY_TIMEOUT
   stage=archive rename acknowledgement timeout
   observed=project.CRUD:REPLACE,project.awareness.LOAD_VIEWERS,feature.LOAD_ALL,
   template.LOAD_ALL,workspace-folder.REPLACE,assistant.REPLACE,logux/processed
   ```

5. At other points, the renamed project appeared to succeed, but the imported project was created with Voiceflow's automatic `(1)` suffix.
6. One run returned `execute-outcome-unknown` from the XYOps stream even though the migration appeared to have created a project. This means the import result may have been applied while the result stream was lost; retrying could duplicate the import.
7. The deployed plugin version has varied during testing (`0.0.1`, `0.0.2`), so artifact/deployment provenance must be recorded for every capture.

## Important current behavior

The intended operation order is:

```text
load source catalog
  -> load destination catalog
  -> find exact destination workspace + folder collision
  -> rename collision through Logux
  -> confirm renamed state through catalog
  -> import HTTP request into destination workspace/folder
  -> create secrets
```

The active code does not relocate the renamed project to an Archive folder. The rename should preserve its existing folder.

## Logux processes involved

### 1. Catalog synchronization

Used by `loadProjects`, `loadFolders`, and other catalog reads.

Connection frame currently follows this shape:

```json
[
  "connect",
  4,
  "<creator>:<client>:<session>",
  0,
  {"token":"<JWT>","subprotocol":"1.9.0"}
]
```

After `connected`, the client sends a workspace subscription:

```json
[
  "sync",
  <positive-subscription-id>,
  {
    "channel":"workspace/<workspace-id>",
    "type":"logux/subscribe",
    "since":{"id":"0","time":0}
  },
  {"id":-1,"time":1}
]
```

Catalog wanted action types include:

```text
workspace.CRUD:REPLACE
project.CRUD:REPLACE
assistant.REPLACE
workspace-folder.REPLACE
```

The catalog projection currently combines `project.CRUD:REPLACE` with `assistant.REPLACE` to recover project folder IDs.

Observed catalog action types in the rename session:

```text
project.CRUD:REPLACE
project.awareness.LOAD_VIEWERS
feature.LOAD_ALL
template.LOAD_ALL
workspace-folder.REPLACE
assistant.REPLACE
logux/processed
```

Questions for HAR analysis:

- Does a fresh catalog subscription after rename return the new project name?
- Is the authoritative project name in `project.CRUD:REPLACE`, `assistant.REPLACE`, or another action?
- Is folder ownership authoritative in the project row or assistant row?
- Does a catalog subscription return a snapshot that can be stale relative to the mutation socket?
- Does the server require a particular `since` value or action ordering?

### 2. Project rename mutation

Current outgoing mutation shape:

```json
[
  "sync",
  0,
  {
    "type":"assistant.PATCH_ONE",
    "payload":{
      "id":"<colliding-project-id>",
      "patch":{"name":"<timestamped-archive-name>"},
      "context":{"workspaceID":"<destination-workspace-id>"}
    },
    "meta":{
      "origin":"<session-origin>",
      "actionID":"<locally-generated-action-id>"
    }
  },
  {"id":-2,"time":2}
]
```

Two sync-ID variants were tested:

- `0`, matching the existing create-secret protocol implementation.
- The positive workspace subscription ID, based on the BDD interpretation.

Both tests produced `logux/processed` without an observed `project.CRUD:PATCH` in the failing environment. The `0` variant is currently restored.

Expected but not observed in failing runs:

```json
{
  "type":"project.CRUD:PATCH",
  "payload":{
    "workspaceID":"<destination-workspace-id>",
    "key":"<colliding-project-id>",
    "value":{"name":"<timestamped-archive-name>"}
  },
  "meta":{
    "origin":"<session-origin>",
    "actionID":"<server-or-response-action-id>"
  }
}
```

Questions for HAR analysis:

- What exact action type does the Voiceflow UI use to rename a project?
- Is the ID in `assistant.PATCH_ONE.payload.id` a project ID, assistant ID, or another resource ID?
- Does the UI send sync ID `0` or the subscription ID?
- What is the exact fourth frame element for the UI mutation?
- Is `context.workspaceID` required, named differently, or accompanied by another context field?
- Does the server emit `project.CRUD:PATCH`, `project.CRUD:REPLACE`, `assistant.REPLACE`, or only `logux/processed`?
- Is the response broadcast sent on the same WebSocket, a second socket, or only to other subscribers?
- Does the action need a client-generated action ID format other than UUID?
- Does the server require a specific origin format or a client/session ID with restricted characters?

### 3. `logux/processed`

Observed action shape is described as:

```json
{
  "id":"<timestamp> <origin> 0",
  "type":"logux/processed"
}
```

The important ambiguity is whether this means:

- only transport/server processing,
- successful mutation application,
- successful action persistence but delayed projection, or
- successful action with no broadcast because the subscriber is not authorized for that resource.

The implementation must not assume `logux/processed` proves durable project state without a catalog read. However, the current timeout proves that waiting only for `project.CRUD:PATCH` is not sufficient in the observed environment.

### 4. Project state confirmation

The current investigative design uses fresh catalog WebSocket reads through `loadProjects` after Logux processing. It retries a bounded number of times and checks:

```text
workspaceID == destination workspace
project ID == colliding project ID
folderID == original destination folder
label == timestamped archive name
```

This is a read-after-write consistency check, not a confirmation of the exact mutation response.

Questions:

- Is this catalog boundary authoritative for the HTTP import service?
- How long does the import service continue to see the old name after Logux processing?
- Does the import service use a different database/cache/read model?
- What event or API response indicates that the old name is no longer authoritative?

### 5. Folder creation

The separate `createFolder` Logux process uses:

```text
connect
workspace subscription
workspace-folder.CREATE_ONE_STARTED
workspace-folder.CREATE_ONE_DONE
```

Its mutation currently uses sync ID `subscriptionID` in the existing implementation. This process is useful as a comparison capture because it has a known request/done lifecycle.

Mutation shape:

```json
[
  "sync",
  <subscription-id>,
  {
    "type":"workspace-folder.CREATE_ONE_STARTED",
    "payload":{
      "context":{"workspaceID":"<workspace-id>"},
      "data":{"name":"<folder-name>","scope":"assistant"}
    },
    "meta":{"origin":"<origin>","actionID":"<action-id>"}
  },
  {"id":-2,"time":2}
]
```

### 6. Secret creation

The separate `createSecret` process uses:

```text
connect
assistant subscription
secret.CREATE_ONE_STARTED
secret.CREATE_ONE_DONE
```

It currently sends the mutation with sync ID `0` and correlates completion using the outgoing `meta.actionID`.

This is a second useful comparison capture for determining whether project rename is using the wrong mutation ID, action ID, resource ID, or completion event.

### 7. HTTP import

Import is not Logux. It is an HTTP multipart request:

```text
POST /v1alpha1/assistant/import-file/<destination-workspace-id>
```

Multipart fields include:

```text
file
 targetSchemaVersion
folderID
```

The import service may have a separate consistency/read model from Logux. This is the likely explanation for seeing the automatic `<source-name> (1)` suffix even after a catalog read observes the timestamped rename.

Capture the exact import request and response, including:

- destination workspace path segment
- folder ID
- import response status
- response body fields identifying workspace, folder, and project
- request timing relative to the rename processed frame and catalog confirmation

Do not record JWTs, exported project data, or secret values.

### 8. XYOps execution stream

The CLI runs the migration through XYOps and reads:

```text
/api/app/stream_job/v1
```

A stream disconnect or missing terminal job result is reported as:

```text
execute-outcome-unknown
```

This is intentionally non-retryable because the import may already have succeeded. The job must be reconciled before another import attempt.

## Required HAR/WebSocket capture table

For every process, capture a separate table with these columns:

| Process | Socket/request | Direction | Timestamp | Frame/event | Request ID | Action type | Origin | Action ID | Workspace | Resource/project ID | Folder ID | Name | Raw payload redacted | Result |
|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|
| catalog | WebSocket | out/in | | | | | | | | | | | | |
| rename | WebSocket | out/in | | | | | | | | | | | |
| folder create | WebSocket | out/in | | | | | | | | | | | |
| secret create | WebSocket | out/in | | | | | | | | | | | |
| import | HTTP | out/in | | | | | | | | | | | |

For WebSocket frames, preserve the array indexes exactly. Do not flatten away the distinction between:

```text
frame[0] = frame kind
frame[1] = sync/request identifier
frame[2] = action or payload
frame[3] = client metadata
```

## Capture protocol

1. Start with a fresh browser session and a known workspace/project pair.
2. Capture a normal project rename in the Voiceflow UI, if the UI supports it.
3. Capture a catalog refresh immediately before and after the rename.
4. Capture a folder creation and a secret creation for comparison.
5. Capture the migration import with no collision.
6. Capture the migration import with one exact collision.
7. Capture the same-name project outside the destination folder.
8. Record all timestamps in one timezone and use a monotonic elapsed-time column.
9. Redact JWTs, cookies, authorization headers, exported project data, secret values, and file contents.
10. Record deployed plugin version, source commit, event title/ID, workspace IDs, folder IDs, and project IDs separately from redacted payloads.

## Acceptance criteria for the protocol reconstruction

The LLM/engineer should be able to answer from captured evidence:

1. Which socket subscribes to which channel?
2. Which frame actually performs the rename?
3. Which identifier correlates the mutation to its server response?
4. What event proves transport processing?
5. What event or read proves durable renamed state?
6. Which catalog projection is authoritative for the import service?
7. How long is the observed propagation delay between rename durability and import visibility?
8. Why does Voiceflow create `<source-name> (1)` in the failing sequence?
9. Why does the plugin sometimes report `execute-outcome-unknown` after a project appears to exist?
10. What exact request and response should the implementation reproduce?

## Current conclusion

The failing implementation is based on an incomplete protocol assumption: it waits for a `project.CRUD:PATCH` broadcast that is not present in the observed session. `logux/processed` is present, but its durability meaning is unresolved. The next implementation should be driven by HAR/WebSocket evidence from the Voiceflow UI and comparison operations, rather than additional timeout tuning.
