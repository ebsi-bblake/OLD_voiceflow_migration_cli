# BDD25 schema ownership audit

Reviewed: current repository state

This is the repository-wide manual review record for the BDD25 acceptance gate. A
helper is retained only when it performs generic safe traversal or a domain policy;
structural contracts are owned by the schemas below.

## Ownership matrix

| Boundary | Owner | Consumer path | Result |
|---|---|---|---|
| CLI migration-file object | `MigrationFileConfigSchema` | `cli/config.ts:parseMigrationFileConfig` | `safeParse` data is mapped into the camel-case domain type |
| CLI XYOps responses and jobs | `xyops-responses.ts` schemas | `cli/client/http.ts`, `cli/client/job-response.ts`, `cli/client/streaming.ts` | response guards delegate to Zod schemas |
| CLI domain results/envelopes | `catalog-results.ts`, `migration-results.ts`, `voiceflow-envelope.ts`, `session.ts` | `cli/migration/*`, `cli/validation.ts` | schema-backed guards validate before policy functions |
| Plugin job and operation | `NativePluginJobSchema`, `PluginOperationSchema` | `plugin/job_validation.ts` | parsed job and parsed operation are passed onward |
| Voiceflow catalog rows | `CatalogRecordSchema` | `voiceflow/catalog/record-parsers.ts` | parsed rows are passed to identity/label policies |
| Voiceflow secrets | `SecretEntrySchema`, `ExistingSecretSchema` | `voiceflow/secrets.ts` | parsed entries are passed to duplicate and mapping policies |
| Import receipt and exported payload | `receipt.ts`, `export_payload.ts` | `voiceflow/import/*`, `voiceflow/export.ts` | schema parse precedes domain interpretation |
| Auth claims | `auth_claims.ts` | `voiceflow/auth.ts` | schema parse precedes creator-ID policy |
| Logux frames and actions | `logux/schemas/frame.ts`, `action.ts` | Logux adapters and frame contract | schema validation precedes operation-specific policy |

## Helper audit

- `xyops/cli/guards.ts`: no generic `isRecord` implementation remains. Shape
  predicates delegate to named Zod schemas. Remaining functions are status,
  completion, URL, parameter, and duration policies.
- `xyops/plugin/guards.ts`: removed; plugin validation uses Zod directly.
- `xyops/voiceflow/guards.ts`: retained only for generic record/row traversal and
  retryability, confirmation, creator-ID, and status policies. Catalog row shape is
  not validated there; it is owned by `CatalogRecordSchema`.
- `xyops/diagnostics/redact.ts`: its record check is bounded traversal, not a
  domain validator, and is required to safely recurse through untrusted DTOs.
- `voiceflow/export.ts`, `import/input.ts`, and Logux adapters: local record
  checks only select optional nested values after the owning envelope/action/frame
  schema has parsed the outer value. They do not establish a competing contract.

## Edge-case evidence

`tests/bdd25_zod_migration.test.ts` covers every listed schema family with null,
array/malformed, unknown-field, and oversized-value probes, plus boundary-specific
valid and invalid cases for configuration, plugin jobs, catalog records, and
secrets. Existing boundary suites cover omitted, empty, malformed, and valid
response variants.

## Verification gate

- `bun run bdd:25`
- `bun run check`
- `bun run verify:cli`

No schema ownership conflict was found in the reviewed consumer paths.
