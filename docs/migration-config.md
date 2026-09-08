# Migration configuration

The CLI accepts a JSON configuration file with `--config=<path>`:

```sh
bun run xyops/cli/index.ts --config=xyops/cli/migration.example.json
```

The checked-in example in [`../xyops/cli/migration.example.json`](../xyops/cli/migration.example.json)
documents the supported snake_case fields:

- `source_workspace_id`
- `source_project_id`
- `source_version_id`
- `destination_workspace_id`
- `destination_folder_id`
- `target_schema_version`
- `secrets`: a filesystem path to a JSON array of `{ "key": string, "value": string, "type": "projectId" | "" | "url" }` entries

Configured values bypass their interactive prompts. Missing migration IDs remain interactive.
When `target_schema_version` is omitted, the imported artifact's schema version is used.

Configuration is validated before migration work begins. Unknown fields and blank values
are rejected. The configured secrets file must be readable and contain a JSON array of
unique entries with only `key`, `value`, and `type` fields. `type` must be either
`projectId`, an empty string, or `url`. Secret values and file
contents are not included in diagnostics.

The former `--secrets=<path>` option is unsupported. Project secrets belong in the
configuration object's `secrets` path; `VOICEFLOW_JWT` remains a separate XYOps/Windmill
secret binding and must not be placed in this file.

Keep local configuration files out of version control. The repository ignores
`xyops/cli/migration.local.json`; use that path for real credentials and IDs.
