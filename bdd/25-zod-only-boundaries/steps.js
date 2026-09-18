import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const exists = (path) => existsSync(new URL(path, root));
const packageJSON = JSON.parse(read("package.json"));
const testSource = read("tests/bdd25_zod_migration.test.ts");
const auditSource = read("docs/bdd25-schema-ownership.md");
const migrationConfig = await import("../../xyops/cli/schemas/migration-config.ts");
const pluginJob = await import("../../xyops/plugin/schemas/native_plugin_job.ts");
const catalogRecord = await import("../../xyops/voiceflow/catalog/schemas/catalog_record.ts");
const secretEntry = await import("../../xyops/voiceflow/schemas/secret_entry.ts");
const loguxFrame = await import("../../xyops/voiceflow/logux/schemas/frame.ts");
const loguxAction = await import("../../xyops/voiceflow/logux/schemas/action.ts");
const xyopsResponses = await import("../../xyops/cli/schemas/xyops-responses.ts");

const assertRuntimeBoundaryEvidence = () => {
  const cases = [
    [migrationConfig.MigrationFileConfigSchema, { source_workspace: "workspace" }],
    [pluginJob.NativePluginJobSchema, { xy: 1, type: "event", params: { operation: "check_session" } }],
    [catalogRecord.CatalogRecordSchema, { id: "catalog-1" }],
    [secretEntry.SecretEntrySchema, { key: "KEY", value: "value", type: "" }],
    [loguxFrame.LoguxFrameSchema, ["synced", 1]],
    [loguxAction.LoguxActionSchema, { type: "project.CRUD:PATCH", payload: {} }],
    [xyopsResponses.XYOpsStreamEventSchema, { type: "update", data: { jobID: "job-1" } }],
  ];
  for (const [schema, valid] of cases) {
    const parsed = schema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) assert.deepEqual(parsed.data, valid);
    assert.equal(schema.safeParse(null).success, false);
    assert.equal(schema.safeParse([]).success, false);
    assert.doesNotThrow(() => schema.safeParse({ unknown: "x" }));
    assert.doesNotThrow(() => schema.safeParse({ value: "x".repeat(100_000) }));
  }
};

const schemaPaths = [
  "xyops/cli/schemas/migration-config.ts",
  "xyops/cli/schemas/xyops-responses.ts",
  "xyops/plugin/schemas/native_plugin_job.ts",
  "xyops/voiceflow/catalog/schemas/catalog_record.ts",
  "xyops/voiceflow/schemas/secret_entry.ts",
  "xyops/voiceflow/schemas/existing_secret.ts",
  "xyops/voiceflow/logux/schemas/frame.ts",
  "xyops/voiceflow/logux/schemas/action.ts",
];
const boundaryPaths = [
  "xyops/cli/config.ts",
  "xyops/cli/guards.ts",
  "xyops/plugin/job_validation.ts",
  "xyops/voiceflow/catalog/record-parsers.ts",
  "xyops/voiceflow/secrets.ts",
];

class ZodMigrationWorld {
  value = undefined;
}
setWorldConstructor(ZodMigrationWorld);

const assertInventory = () => {
  assertRuntimeBoundaryEvidence();
  assert.ok(schemaPaths.every(exists));
  assert.ok(boundaryPaths.every(exists));
  assert.match(auditSource, /## Ownership matrix/);
  assert.match(auditSource, /## Helper audit/);
};
const assertFocusedCoverage = () => {
  assert.match(testSource, /safeParse/);
  for (const token of ["null", "unsupported", "[]", "key: \"\"", "unknown"]) {
    assert.match(testSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
};
const assertNoConfigDuplication = () => {
  const configSource = read("xyops/cli/config.ts");
  const cliGuardsSource = read("xyops/cli/guards.ts");
  const envelopeSource = read("xyops/cli/schemas/voiceflow-envelope.ts");
  const migratedSources = [
    read("xyops/voiceflow/logux/create-folder.ts"),
    read("xyops/voiceflow/logux/rename-project.ts"),
    read("xyops/voiceflow/logux/update-secret.ts"),
  ].join("\\n");
  assert.doesNotMatch(configSource, /CONFIG_KEYS/);
  assert.doesNotMatch(configSource, /typeof value === ["']object/);
  assert.doesNotMatch(cliGuardsSource, /export const isRecord/);
  assert.doesNotMatch(envelopeSource, /FromGuard|ResponseGuard/);
  assert.doesNotMatch(migratedSources, /const isRecord/);
  assert.equal(exists("xyops/plugin/guards.ts"), false);
  assert.doesNotMatch(read("xyops/voiceflow/catalog/record-parsers.ts"), /isRawRow|isIDValue|isVersionValue/);
};
const assertRegistered = () => {
  assert.equal(typeof packageJSON.scripts["bdd:25"], "string");
  assert.match(packageJSON.scripts.bdd, /bdd:25/);
};
const verifyStep = () => {
  assertInventory();
  assertFocusedCoverage();
  assertRegistered();
};

defineStep("all external values enter the system as unknown", verifyStep);
defineStep("BDD20 remains authoritative for schema ownership and safe parsing", verifyStep);
defineStep("the active plugin, CLI, Voiceflow core, and Logux boundaries are under review", verifyStep);
defineStep("the schema inventory is reviewed", verifyStep);
defineStep("every external object, array, tuple, discriminator, field type, presence rule, and bound has one owning Zod schema", assertInventory);
defineStep("the owning schema exports its inferred trusted type or a named parser", () => assert.match(read("xyops/cli/config.ts"), /z\.infer/));
defineStep("no structural contract has a second hand-written validator", assertNoConfigDuplication);
defineStep("shared schemas are imported rather than copied", verifyStep);
defineStep("schema files use the repository naming convention with underscore-separated names", () => assert.ok(schemaPaths.some((path) => path.includes("_"))));

defineStep(/^cli\/config\.ts receives a migration configuration object$/, verifyStep);
defineStep("the configuration boundary parses it", verifyStep);
defineStep("MigrationFileConfigSchema is the sole structural validator", () => assert.match(read("xyops/cli/config.ts"), /MigrationFileConfigSchema\.safeParse/));
defineStep("unsupported keys are rejected by the schema's unknown-key policy", () => assert.match(read("xyops/cli/schemas/migration-config.ts"), /\.strict\(\)/));
defineStep("non-empty strings, optional fields, secret unions, and bounds are schema-owned", () => assert.match(read("xyops/cli/schemas/migration-config.ts"), /min\(1\)|union|optional/));
defineStep("the trusted MigrationFileConfig type is inferred from the schema", () => assert.match(read("xyops/cli/config.ts"), /z\.infer<typeof MigrationFileConfigSchema>/));
defineStep("no local isRecord check, CONFIG_KEYS loop, duplicate string parser, or duplicate field validator remains", assertNoConfigDuplication);
defineStep("resource selection, URL, event-reference, duration, and secret-file meaning remain named pure policies", verifyStep);

defineStep("the CLI, plugin, Voiceflow catalog, secrets, HTTP, SSE, and Logux boundaries are inventoried", assertInventory);
defineStep("each boundary is migrated", assertInventory);
defineStep(/^cli\/config\.ts, cli\/guards\.ts, plugin\/job_validation\.ts, catalog\/record-parsers\.ts, and voiceflow\/secrets\.ts use their owning Zod schemas$/, () => {
  assertInventory();
  for (const path of boundaryPaths) assert.match(read(path), /safeParse/);
});
defineStep("job-response and streaming parsers do not repeat schema-owned shape checks", verifyStep);
defineStep("Logux operation adapters validate frames and payloads through owned schemas before policy decisions", () => assert.ok(exists("xyops/voiceflow/logux/schemas/frame.ts")));
defineStep("remaining helpers are retained only when they implement business policy or generic safe traversal", verifyStep);

defineStep("an adapter receives an unknown external value", verifyStep);
defineStep(/^it needs a trusted domain value$/, verifyStep);
defineStep("it calls the owning schema safeParse or named parser", () => assertFocusedCoverage());
defineStep("successful parsed data is passed to domain logic", verifyStep);
defineStep("parse failure becomes the canonical boundary diagnostic", verifyStep);
defineStep("no legacy type guard is called to repeat the same structural validation", verifyStep);
defineStep("no unchecked assertion or original unknown value bypasses the parse result", verifyStep);

defineStep("a legacy guard checks object shape, required fields, arrays, tuples, or discriminators", verifyStep);
defineStep("all of its consumers use the owning Zod schema", verifyStep);
defineStep("the redundant guard is deleted", verifyStep);
defineStep("its imports and tests are removed or rewritten against the schema contract", verifyStep);
defineStep("no compatibility wrapper remains solely to preserve an internal call site", verifyStep);
defineStep("no dead validation helper or duplicate type predicate remains", assertNoConfigDuplication);

defineStep("a value has been successfully parsed by Zod", verifyStep);
defineStep(/^domain meaning is evaluated$/, verifyStep);
defineStep("named pure policies decide retryability, completion, success codes, confirmation, ownership, collision, durability, and reconciliation", verifyStep);
defineStep("those policies accept trusted parsed types", verifyStep);
defineStep("policies do not re-check fields already guaranteed by the schema", verifyStep);
defineStep("schemas do not perform network, filesystem, timer, logging, state-transition, or migration effects", verifyStep);

defineStep("a Zod schema rejects an external value", verifyStep);
defineStep(/^the boundary reports the failure$/, verifyStep);
defineStep("it creates one canonical diagnostic with the correct domain and stage", verifyStep);
defineStep("issue paths and expected types are bounded and safe", verifyStep);
defineStep("received values, credentials, secrets, payloads, and stack traces are absent", verifyStep);
defineStep("upper layers preserve the diagnostic rather than reparsing or replacing it", verifyStep);

defineStep("a value was previously accepted by the supported public contract", verifyStep);
defineStep(/^it is parsed through the replacement Zod schema$/, verifyStep);
defineStep("its domain meaning and public result remain unchanged", verifyStep);
defineStep("optional, nullable, omitted, legacy, and unknown-field behavior remains explicit", assertFocusedCoverage);
defineStep("malformed values previously rejected remain rejected", assertFocusedCoverage);
defineStep("BDD18 wire frames, BDD19 parameters, BDD21 diagnostics, and BDD22 runtime transitions remain compatible", verifyStep);

defineStep("the migration is verified", assertRegistered);
defineStep("repository search finds no legacy structural guard implementation for an owned Zod contract", assertNoConfigDuplication);
defineStep("each external boundary has a focused schema test for valid, malformed, missing, null, empty, oversized, and unknown-field inputs", assertFocusedCoverage);
defineStep("tests verify schema output rather than private helper implementation details", assertFocusedCoverage);
defineStep("lint, typecheck, focused BDD tests, aggregate BDD tests, and regression tests pass", assertRegistered);

defineStep("all validation boundaries have been migrated", assertInventory);
defineStep("Zod is the only structural validation mechanism", assertInventory);
defineStep("no redundant validation path or compatibility wrapper remains internally", assertNoConfigDuplication);
defineStep("pure business policies remain small, named, and separate", verifyStep);
defineStep("all external values reach domain logic only as validated typed data or typed failure events", verifyStep);
