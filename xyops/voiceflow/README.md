# Native XYOps Event Plugin for Voiceflow

The active deployment is a custom XYOps Event Plugin implemented in
`xyops/plugin/`. xySat launches its command-line process on the target server.
The plugin is not a Docker image or container runner.

## Plugin contract

The plugin reads one JSON event job from stdin and writes one JSON response to
stdout. stdout is reserved for the XYOps wire protocol; diagnostics must go to
stderr. The process accepts an XYOps event job with object-valued `params` and
an optional `secrets` object:

```json
{
  "xy": 1,
  "type": "event",
  "params": { "operation": "check_session" },
  "secrets": { "VOICEFLOW_JWT": "<provided-by-Secret-Vault>" }
}
```

The canonical operation selector is `params.operation`. Supported operations are:

```text
check_session
list_workspaces
list_projects
list_versions
list_folders
create_folder
plan_migration
execute_migration
```

The process returns one response envelope. A successful operation uses numeric
code `0`; a Voiceflow operation failure uses its stable error code and includes
the Voiceflow envelope under `data.voiceflow`:

```json
{
  "xy": 1,
  "complete": true,
  "code": 0,
  "data": {
    "voiceflow": {
      "ok": true,
      "operation": "check_session",
      "operationID": "<generated-operation-id>",
      "result": "<operation-result>",
      "warnings": []
    }
  }
}
```

Malformed input, missing secrets, and unsupported operations return a protocol
failure with a string `code` and safe `description`. These are repository
contract examples; a live XYOps response still requires the target-server test.

## Build the command-line artifact

Build the Node-compatible CommonJS bundle from the repository root. XYOps may
copy the result to an extensionless temporary path before invoking Node, so do
not use an ESM output format:

```sh
bun run build:plugin
```

The output is a command-line program for a target server with a compatible Node
runtime. Keep the generated artifact out of source control unless the
deployment process explicitly versions build outputs.

## Register the custom Event Plugin

In XYOps, register a **custom Event Plugin** for the target xySat server. Set
its command-line executable to:

```text
node /opt/xyops/voiceflow-event-plugin
```

Configure the plugin to provide the event job on stdin, accept the single JSON
response on stdout, and retain stderr as diagnostics. Do not add a wrapper that
writes non-protocol text to stdout.

Use the XYOps Secret Vault for `VOICEFLOW_JWT`. Bind that secret to each Event
execution under the `VOICEFLOW_JWT` name; never put it in the bundle, build
arguments, committed files, or ordinary `params`.

Point each of the eight Events at this one plugin registration:

| Event title | `params.operation` |
| --- | --- |
| `voiceflow_check_session` | `check_session` |
| `voiceflow_list_workspaces` | `list_workspaces` |
| `voiceflow_list_projects` | `list_projects` |
| `voiceflow_list_versions` | `list_versions` |
| `voiceflow_list_folders` | `list_folders` |
| `voiceflow_create_folder` | `create_folder` |
| `voiceflow_plan_migration` | `plan_migration` |
| `voiceflow_execute_migration` | `execute_migration` |

The remaining operation parameters are the IDs and migration values documented
by the CLI contract, including `SOURCE_WORKSPACE_ID`, `SOURCE_PROJECT_ID`,
`SOURCE_VERSION_ID`, `DESTINATION_WORKSPACE_ID`, `DESTINATION_FOLDER_ID`,
`TARGET_SCHEMA_VERSION`, `PLAN_ID`, and the literal boolean `CONFIRMED` for
execution. The local CLI can source these values and project secrets from the
single `--config=<path>` object described in [`../../docs/migration-config.md`](../../docs/migration-config.md).
Run the CLI with `--debug` to enable all named stderr diagnostics, or
`--debug=logux-secret,logux-rename` to select specific logger names. Selectors
also match child names and logger prefixes. The debug selector is passed through
to the Event as an internal `DEBUG` parameter and never appears in stdout.
That file's project `secrets` array is distinct from this plugin's
`VOICEFLOW_JWT` Secret Vault binding.

### Imported project secret reconciliation

The import response may identify the created project, assistant, and destination
version. When a destination version ID is available, existing secret metadata is
loaded from:

```text
GET /v1alpha1/assistant/load-creator/<destination-version-id>
Authorization: Bearer <JWT>
```

The response is a JSON object whose relevant fields are `assistant.id`,
`project._id`, `version._id`, and `secrets`. Each `secrets[]` entry contains
`id`, `assistantID`, `name`, `visibility` (`masked` or `restricted`), and
`hasValue`; secret values are never returned or logged. `secretOverrides` is a
separate array and must not be treated as project secrets.

The verified create lifecycle is:

```text
assistant subscribe → synced(subscription) →
secret.CREATE_ONE_STARTED → secret.ADD_ONE → secret.CREATE_ONE_DONE
```

The create mutation uses a distinct positive mutation sync ID. Completion is
correlated by the outgoing `meta.actionID`; `logux/processed` is not the
completion signal. Existing-name reconciliation must preserve the returned
secret ID and use the verified two-step update lifecycle:

```text
secret.PATCH_ONE_WITH_VALUE → secret.PATCH_ONE → synced(mutation)
```

Never send or record JWTs, cookies, secret values, exported project data, or raw
HTTP error bodies in diagnostics.

## Test the artifact

Run the native plugin unit test and type check locally:

```sh
bun run typecheck
bun run test -- tests/xyops_event_plugin.test.ts
bun run check
```

For a protocol-only smoke check that does not contact Voiceflow, send an
unsupported operation and confirm that one JSON response is produced with an
`UNKNOWN_OPERATION` code and no echoed input:

```sh
printf '%s\n' '{"xy":1,"type":"event","params":{"operation":"not-supported"}}' \
  | node dist/voiceflow-event-plugin.cjs
```

After registration, an operator must perform the live XYOps/xySat check with a
Secret Vault binding and an approved safe Voiceflow session. Local tests do not
prove live target-server registration, secret delivery, or Event job polling.
