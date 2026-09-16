# Standalone CLI packaging contract

This contract is the decision record for the standalone Voiceflow migration CLI.
Local build automation is defined by the phase-2 package scripts and validation command.

## Entry point and runtime

- Source entry point: `xyops/cli/index.ts`
- Product command: `voiceflow-cli`
- Distribution format: one native, single-file executable per target
- Runtime: the supported repository Bun version is embedded by `bun build --compile`
- Runtime dependencies: none; users do not need Bun, Node.js, npm, or the repository source

The executable must not contain API keys, JWTs, migration data, or any other
credentials. Configuration is supplied at runtime:

- `--config=<path>` supplies non-interactive migration IDs, schema version, and
  project secrets using the schema in `migration.json`.
- Environment variables supply XYOps connection configuration, including the
  required `XYOPS_API_KEY`; `XYOPS_BASE_URL` and `XYOPS_EVENT_*` are optional.
- Missing migration selections remain interactive.

## Release target matrix

| Platform | Bun target | Artifact name |
| --- | --- | --- |
| macOS ARM64 | `bun-darwin-arm64` | `voiceflow-cli-darwin-arm64` |
| macOS x64 | `bun-darwin-x64` | `voiceflow-cli-darwin-x64` |
| Linux ARM64 | `bun-linux-arm64` | `voiceflow-cli-linux-arm64` |
| Linux x64 | `bun-linux-x64` | `voiceflow-cli-linux-x64` |
| Windows x64 (baseline CPU) | `bun-windows-x64-baseline` | `voiceflow-cli-windows-x64.exe` |

These are the supported release targets. Other operating systems and
architectures are unsupported and must produce no silently substituted artifact.
The Windows artifact alone has an `.exe` suffix.

## Compatibility and status contract

A packaged executable has the same behavior as the Bun source entrypoint for
login-independent paths: `--help`, configuration validation, malformed input,
and diagnostics. It emits diagnostics without secrets and preserves the
existing exit-status policy:

- `0`: help, successful migration, or an explicit user abort
- `1`: configuration, validation, transport, or migration failure
- `2`: migration completed with the existing API-key-retrieval warning

Packaging verification must exercise `--help` and invalid configuration on each
artifact. It must not perform a real migration. Real migration execution is
covered by the existing CLI tests and is outside the packaging gate.
