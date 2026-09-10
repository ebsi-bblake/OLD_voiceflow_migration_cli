# Voiceflow migration on XYOps

The active deployment is the native XYOps Event Plugin under `xyops/plugin/`.

Versioning is independent: `package.json.version` is the CLI and GitHub release
version, while `package.json.pluginVersion` is the deployed XYOps plugin version.
It is a command-line executable launched by xySat on the target server. The
Voiceflow operation implementations remain under `xyops/voiceflow/`; the
Docker image/container runner is not the active deployment.

## Active source

- `xyops/voiceflow/` contains the Voiceflow contracts, transport adapters,
  catalog operations, planning, and migration runners.
- `xyops/plugin/` contains the native plugin contracts, stdin job validation,
  operation dispatcher, wire-protocol mapping, and process entrypoints.
- `xyops/plugin/process_entrypoint.ts` exports the testable process runner. The
  executable `xyops/plugin/entrypoint.ts` reads one JSON job from stdin and emits
  one XYOps JSON response on stdout. Diagnostics remain separate from the
  protocol output.
- `xyops/cli/index.ts` is the local interactive CLI. It calls configured
  XYOps Events rather than importing the Voiceflow implementation directly.

The native plugin supports these operations:

```text
check_session
list_workspaces
list_projects
list_versions
list_folders
plan_migration
execute_migration
```

## One plugin, seven XYOps Events

All seven Events point to the same registered native plugin. Each Event supplies
its operation through the `operation` parameter and retains the following title
mapping:

| Event title | `operation` |
| --- | --- |
| `voiceflow_check_session` | `check_session` |
| `voiceflow_list_workspaces` | `list_workspaces` |
| `voiceflow_list_projects` | `list_projects` |
| `voiceflow_list_versions` | `list_versions` |
| `voiceflow_list_folders` | `list_folders` |
| `voiceflow_plan_migration` | `plan_migration` |
| `voiceflow_execute_migration` | `execute_migration` |

The CLI sends Event requests through the XYOps REST API and uses the
`operation` parameter to select the Voiceflow operation. It can override an
Event by title or ID with `XYOPS_EVENT_*` environment variables. The Events
provide `VOICEFLOW_JWT` through their configured Secret Vault binding; the CLI
does not request or send that secret.

## Build and local use

### Nix development shell

The flake supports `x86_64-linux`, `aarch64-linux`, and `aarch64-darwin`.
Enter the shell and install the committed Bun lockfile dependencies:

```sh
nix develop
bun --version
node --version
bun install --frozen-lockfile
```

The exact Bun patch version follows the pinned nixpkgs revision in
`flake.lock`. From the shell, run the repository checks with:

```sh
bun run typecheck
bun run test
bun run check
```

Build the extensionless Node/CJS artifact from the project root:

```sh
bun run build:plugin
```

The configured XYOps command must invoke the copied artifact with Node, for
example `node /opt/xyops/voiceflow-event-plugin`.

The standalone migration CLI packaging contract is recorded in
[`docs/cli-packaging-contract.md`](docs/cli-packaging-contract.md). Its command
is `voiceflow-cli`, with native single-file artifacts for macOS ARM64/x64,
Linux ARM64/x64, and Windows x64. Build scripts are available locally, and
version tags matching `v*.*.*` build a GitHub Release through the phase-3
workflow. Release and rollback operations are documented in
[`docs/cli-release-operations.md`](docs/cli-release-operations.md). Linux
installation is documented in [`docs/cli-installation.md`](docs/cli-installation.md);
Apple, Windows, Homebrew, and WinGet distribution are deferred.

Run the repository's TypeScript type-check command:

```sh
bun run typecheck
```

Run the local CLI with an XYOps API key. Keep these values in a local,
gitignored `.env` file; never commit or share it:

```dotenv
XYOPS_API_KEY=your-xyops-api-key
XYOPS_BASE_URL=http://localhost:5522
```

The CLI does not load `.env` automatically. Load it into the current shell,
then run the CLI:

```sh
set -a
. ./.env
set +a
bun run xyops/cli/index.ts
```

`XYOPS_BASE_URL` is optional and defaults to `http://localhost:5522`. The
standalone executable uses the same environment variables:

```sh
voiceflow-cli
```

For non-interactive migration inputs, pass `--config=<path>` using the checked-in
shape in `migration.json`. See [`docs/migration-config.md`](docs/migration-config.md)
for the operator walkthrough and secret-file rollout policy. The file uses snake_case resource keys
(`source_workspace`, `source_project`, `source_version`, `destination_workspace`, and
`destination_folder`) that accept exact catalog names or canonical IDs. It may contain a
`secrets` path or inline `SecretConfig[]`; an empty array means no secrets. Unknown top-level
fields, blank configured values, blank or duplicate secret names, and extra secret entry fields
are rejected; secrets are never included in diagnostics. Configured values bypass their prompts,
so passing a complete config automates
the migration-selection steps. An omitted `target_schema_version` uses the
interactive default `13.1`. The former `--secrets` option is rejected.
`XYOPS_EVENT_*` variables accept `title:<event-title>` or `id:<event-id>`.
After confirmation, the CLI performs a real Voiceflow export and import.

See [`xyops/voiceflow/README.md`](xyops/voiceflow/README.md) for native plugin
build, target-server installation, registration, and test procedures.

## Archived Windmill sources

Windmill sources are retained in a separately committed archive and are not
part of the active XYOps tree or build:

- `windmill_agent_scripts/` — archived Windmill agent scripts.
- `archive/windmill_root/` — archived root modular and one-file Windmill
  implementations, entrypoints, and their historical tests.

There are no active root-level legacy files. Do not deploy files from either
archive path as the current XYOps implementation.

## Network and security notes

The runners use the internal Logux WebSocket at
`wss://realtime.empyrean.voiceflow.com/` for catalog discovery and HTTPS at
`realtime-http-api.empyrean.voiceflow.com` for Voiceflow export/import. The
worker needs outbound WSS and HTTPS access to those hosts.

Never print, persist, commit, or include in screenshots the JWT,
`exportBase64`, exported project data, XYOps API key, or other secrets. JWT
signature verification and post-import Voiceflow secret/API-key patching are
not implemented. Migrations are non-idempotent; an unknown import outcome
requires destination reconciliation before retrying.

## Deferred scope

Windmill deployment maintenance, parity work for archived implementations,
durable plan expiry/idempotency, import reconciliation automation, JWT
signature verification, and post-import secret patching remain outside the
active XYOps scope.
