# Migration configuration

The CLI accepts a JSON configuration file with `--config=<path>`:

```sh
bun run xyops/cli/index.ts --config=migration.json
```

The checked-in example in [`../migration.json`](../migration.json)
documents the supported snake_case fields. Resource fields accept either an exact catalog name or canonical ID:

- `source_workspace`
- `source_folder`
- `source_project`
- `source_path`: `workspace/folder/project` or `workspace/project`
- `source_version`
- `destination_workspace`
- `destination_folder`
- `destination_path`: `workspace/folder`
- `target_schema_version`
- `secrets`: an optional local/network path to a JSON array or an inline `SecretConfig[]` of `{ "key": string, "value": string, "type": "projectId" | "" | "url" }` entries

Configured values bypass their interactive prompts. Missing migration resources remain interactive.
Path segments are trimmed and matched case-insensitively using Unicode-normalized lookup keys;
original catalog names are preserved. Path configuration resolves workspace and project/folder
selection within the declared workspace. Nested paths are reserved for future Voiceflow support.
When `target_schema_version` is omitted, the imported artifact's schema version is used.

Configuration is validated before migration work begins. Unknown fields and blank values
are rejected. If a secrets path is supplied, the file must be readable and contain a JSON array of
unique entries with only `key`, `value`, and `type` fields. `type` must be either
`projectId`, an empty string, or `url`. Secret values and file
contents are not included in diagnostics.

The former `--secrets=<path>` option is unsupported. Project secrets belong in the
configuration object's `secrets` field; an empty array means no secrets. `VOICEFLOW_JWT` remains
a separate XYOps/Windmill secret binding and must not be placed in this file.

Keep local configuration files out of version control. The repository ignores
`xyops/cli/migration.local.json`; use that path for real credentials and IDs.
