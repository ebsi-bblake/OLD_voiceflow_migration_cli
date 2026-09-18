# Voiceflow migration configuration

The CLI accepts a JSON configuration file with `--config=<path>`:

```sh
voiceflow-cli --config=./migration.json
```

The file supplies migration selections that would otherwise be entered at the
interactive prompts. Values may be catalog names or canonical IDs; the CLI
resolves them against the authenticated Voiceflow account.

## Configuration shape

```json
{
  "source_workspace": "Source workspace",
  "source_folder": "Optional source folder",
  "source_project": "Source project",
  "source_version": "Published version",
  "destination_workspace": "Destination workspace",
  "destination_folder": "Destination folder",
  "target_schema_version": "13.1",
  "secrets": "./secrets.json"
}
```

Supported fields:

| Field | Required | Description |
| --- | --- | --- |
| `source_workspace` | Yes | Source workspace name or ID. |
| `source_folder` | No | Source folder name or ID when the source project is not at the workspace root. |
| `source_project` | Yes | Source project name or ID. |
| `source_path` | No | Alternative source path: `workspace / [folder /] project`. |
| `source_version` | Yes | Source version name or ID. |
| `destination_workspace` | Yes | Destination workspace name or ID. |
| `destination_folder` | Yes | Destination folder name or ID. |
| `destination_path` | No | Alternative destination path: `workspace / folder`. |
| `target_schema_version` | No | Target export schema version. Defaults to the interactive default (`13.1`) when omitted. |
| `secrets` | No | A secrets-file path or an inline array of secret entries. |

Use either the separate resource fields or the path forms for the relevant
selection. Do not use removed `_id` field names such as `source_workspace_id`;
unknown fields are rejected.

A minimal configuration can contain only the values that should be automated:
missing values continue through the interactive prompts. A complete
configuration skips the corresponding prompts.

## Secrets

`secrets` may point to a local or network-accessible JSON file:

```json
[
  { "key": "API_KEY", "value": "secret-value", "type": "" },
  { "key": "PROJECT_ID", "value": "project-id", "type": "projectId" },
  { "key": "BASE_URL", "value": "https://example.test", "type": "url" }
]
```

Each entry must contain exactly `key`, `value`, and `type`. Valid `type` values
are `""`, `"projectId"`, and `"url"`. Secret names must be non-blank and
unique. An inline empty array (`"secrets": []`) explicitly means that the
migration has no project secrets. Omitting `secrets` leaves secret collection
to the interactive flow; pressing Enter at the secrets-file prompt means no
secrets.

The deprecated `--secrets` command-line option is rejected. Secret values are
passed to the migration as ordered entries, never as an object map, and are
excluded from diagnostics.

`VOICEFLOW_JWT` is different from project secrets: it must be supplied through
the XYOps Secret Vault binding and must not be placed in this file.

## Example

```json
{
  "source_workspace": "Support Workspace",
  "source_project": "Customer Assistant",
  "source_version": "Production",
  "destination_workspace": "Production Workspace",
  "destination_folder": "Customer Imports",
  "target_schema_version": "13.1",
  "secrets": "./migration-secrets.json"
}
```

Keep files containing secret values outside source control and restrict their
permissions. Configuration and secret parsing failures return safe diagnostics;
raw file contents, paths, and secret values are not included in those
responses.
