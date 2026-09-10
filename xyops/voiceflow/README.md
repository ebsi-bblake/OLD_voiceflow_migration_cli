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
That file's project `secrets` array is distinct from this plugin's
`VOICEFLOW_JWT` Secret Vault binding.

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
