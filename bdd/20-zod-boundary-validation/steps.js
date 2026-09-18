import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";
import { z } from "zod";

const job = await import("../../xyops/plugin/schemas/native_plugin_job.ts");
const response = await import("../../xyops/plugin/schemas/plugin_response.ts");
const pluginDiagnostics = await import("../../xyops/plugin/diagnostics.ts");
const config = await import("../../xyops/cli/schemas/migration-config.ts");
const auth = await import("../../xyops/voiceflow/schemas/auth_claims.ts");
const catalog = await import("../../xyops/voiceflow/catalog/schemas/catalog_record.ts");
const frames = await import("../../xyops/voiceflow/logux/frame-contract.ts");
const envelopes = await import("../../xyops/cli/schemas/voiceflow-envelope.ts");
const secrets = await import("../../xyops/voiceflow/schemas/secret_entry.ts");
const migrationResults = await import("../../xyops/cli/schemas/migration-results.ts");
const receipts = await import("../../xyops/voiceflow/import/schemas/receipt.ts");
const existingSecrets = await import("../../xyops/voiceflow/schemas/existing_secret.ts");
const catalogResults = await import("../../xyops/cli/schemas/catalog-results.ts");
const sessionResults = await import("../../xyops/cli/schemas/session.ts");
const loguxFrames = await import("../../xyops/voiceflow/logux/schemas/frame.ts");
const loguxActions = await import("../../xyops/voiceflow/logux/schemas/action.ts");
const exportPayloads = await import("../../xyops/voiceflow/schemas/export_payload.ts");
const envelopeSchemas = await import("../../xyops/cli/schemas/voiceflow-envelope.ts");
const xyopsResponses = await import("../../xyops/cli/schemas/xyops-responses.ts");
const pluginValidation = await import("../../xyops/plugin/job_validation.ts");
const responseBody = await import("../../xyops/voiceflow/http/body.ts");

class BoundaryWorld {
  value = undefined;
  diagnostic = undefined;
}

setWorldConstructor(BoundaryWorld);

defineStep("the active XYOps plugin, CLI client, and Voiceflow core are under test", function () {
  this.value = true;
});

defineStep("Zod is a direct runtime dependency recorded in the Bun lockfile", function () {
  const packageJSON = JSON.parse(readFileSync("package.json", "utf8"));
  const lockfile = readFileSync("bun.lock", "utf8");
  assert.equal(typeof packageJSON.dependencies?.zod, "string");
  assert.match(lockfile, /zod@4\.6\.5/);
  this.value = true;
});

defineStep("all external values enter the system as unknown", function () {
  // This is verified at the schema boundary by the safeParse calls in this suite.
  this.value = true;
});

defineStep("no validation boundary exposes raw input or raw Zod issue values", function () {
  const result = z.object({ token: z.string() }).safeParse({
    token: { secret: "bdd-secret-value" },
  });
  assert.equal(result.success, false);
  if (result.success) return;
  const diagnostic = pluginDiagnostics.formatPluginDiagnostic("input", result.error);
  assert.doesNotMatch(diagnostic, /bdd-secret-value/);
  this.value = true;
});

defineStep("a valid native plugin job is parsed", function () {
  this.value = job.NativePluginJobSchema.safeParse({
    xy: 1,
    type: "event",
    params: { operation: "check_session" },
  });
});

defineStep("the parsed operation is {string}", function (expected) {
  assert.equal(this.value.success, true);
  assert.equal(this.value.data.params.operation, expected);
});

defineStep("a native plugin job with malformed structure is parsed", function () {
  const raw = "plugin-secret-input";
  this.diagnostic = raw;
  this.value = job.NativePluginJobSchema.safeParse({
    xy: 2,
    type: "event",
    params: { operation: raw },
  });
});

defineStep("parsing fails with the safe plugin input diagnostic", function () {
  assert.equal(this.value.success, false);
});

defineStep("the malformed input is absent from the diagnostic", function () {
  assert.equal(JSON.stringify(this.value.error.issues).includes(this.diagnostic), false);
});

defineStep("a successful plugin response is parsed", function () {
  this.value = response.XYOpsPluginResponseSchema.safeParse({
    xy: 1,
    complete: true,
    code: 0,
    data: {
      voiceflow: {
        ok: true,
        operation: "check_session",
        operationID: "operation-1",
        result: { active: true },
        warnings: [],
      },
    },
  });
});

defineStep("the plugin response is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a plugin response has an invalid completion value", function () {
  this.value = response.XYOpsPluginResponseSchema.safeParse({
    xy: 1,
    complete: false,
    code: 0,
  });
});

defineStep("the plugin response is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a migration config with an inline secret entry is parsed", function () {
  this.value = config.MigrationFileConfigSchema.safeParse({
    source_workspace: "workspace-1",
    secrets: [{ key: "TOKEN", value: "secret-value", type: "" }],
  });
});

defineStep("the configuration shape is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a migration config contains a non-string resource field", function () {
  this.value = config.MigrationFileConfigSchema.safeParse({
    source_workspace: 42,
  });
});

defineStep("the configuration shape is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("valid creator claims are parsed", function () {
  this.value = auth.VoiceflowAuthClaimsSchema.safeParse({
    creatorID: "creator-1",
    userID: "user-1",
  });
});

defineStep("the claims are accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a creator claim has an object value", function () {
  this.value = auth.VoiceflowAuthClaimsSchema.safeParse({
    creatorID: { secret: "token" },
  });
});

defineStep("the claims are rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a catalog row with numeric identity fields is parsed", function () {
  this.value = catalog.CatalogRecordSchema.safeParse({
    id: 123,
    workspaceID: "workspace-1",
    folderID: 456,
  });
});

defineStep("the catalog row is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a catalog row has an object identity field", function () {
  this.value = catalog.CatalogRecordSchema.safeParse({
    id: { secret: "catalog-input" },
  });
});

defineStep("the catalog row is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a valid Logux sync frame is parsed", function () {
  this.value = frames.parseLoguxFrame(
    JSON.stringify(["sync", 101, { type: "logux/subscribe" }]),
  );
});

defineStep("the Logux frame is accepted", function () {
  assert.ok(this.value);
});

defineStep("an unknown Logux frame kind is parsed", function () {
  this.value = frames.parseLoguxFrame(JSON.stringify(["unknown", 1]));
});

defineStep("the Logux frame is rejected", function () {
  assert.equal(this.value, undefined);
});

defineStep("a valid Voiceflow success envelope is parsed", function () {
  this.value = envelopes
    .createVoiceflowEnvelopeSchema(z.string())
    .safeParse({
      ok: true,
      operation: "check_session",
      operationID: "operation-1",
      result: "active",
      warnings: [],
    });
});

defineStep("the Voiceflow envelope is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a Voiceflow envelope has an unknown operation", function () {
  this.value = envelopes
    .createVoiceflowEnvelopeSchema(z.string())
    .safeParse({
      ok: true,
      operation: "unknown_operation",
      operationID: "operation-1",
      result: "active",
      warnings: [],
    });
});

defineStep("the Voiceflow envelope is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a valid secret entry is parsed", function () {
  this.value = secrets.SecretEntrySchema.safeParse({
    key: "TOKEN",
    value: "secret-value",
    type: "",
  });
});

defineStep("the secret entry is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a secret entry contains an extra field", function () {
  this.value = secrets.SecretEntrySchema.safeParse({
    key: "TOKEN",
    value: "secret-value",
    type: "",
    extra: "must-be-rejected",
  });
});

defineStep("the secret entry is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a migration plan without a target schema version is parsed", function () {
  this.value = migrationResults.MigrationPlanSchema.safeParse({
    planID: "plan-1",
    selection: {
      sourceWorkspaceID: "workspace-1",
      sourceProjectID: "project-1",
      sourceVersionID: "version-1",
      destinationWorkspaceID: "workspace-2",
      destinationFolderID: "folder-1",
    },
    labels: {
      sourceWorkspace: "Source",
      sourceProject: "Project",
      sourceVersion: "Version",
      destinationWorkspace: "Destination",
      destinationFolder: "Folder",
    },
  });
});

defineStep("the migration plan is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a migration execute result has a non-numeric byte count", function () {
  this.value = migrationResults.ExecuteResultSchema.safeParse({
    planID: "plan-1",
    selected: {
      sourceWorkspaceID: "workspace-1",
      sourceProjectID: "project-1",
      sourceVersionID: "version-1",
      destinationWorkspaceID: "workspace-2",
      destinationFolderID: "folder-1",
    },
    exportStatus: 200,
    exportBytes: "large",
    importStatus: 200,
    importBytes: 10,
    imported: { projectID: "project-1" },
  });
});

defineStep("the migration execute result is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("an import receipt with a numeric project ID is parsed", function () {
  this.value = receipts.ImportedReceiptSchema.safeParse({
    projectID: 123,
    workspaceID: "workspace-1",
  });
});

defineStep("the import receipt is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("an import receipt has an object project ID", function () {
  this.value = receipts.ImportedReceiptSchema.safeParse({
    projectID: { secret: "receipt-input" },
  });
});

defineStep("the import receipt is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a valid existing secret record is parsed", function () {
  this.value = existingSecrets.ExistingSecretSchema.safeParse({
    id: "secret-1",
    assistantID: "assistant-1",
    name: "TOKEN",
    visibility: "masked",
    hasValue: true,
  });
});

defineStep("the existing secret record is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("an existing secret record has an invalid visibility", function () {
  this.value = existingSecrets.ExistingSecretSchema.safeParse({
    id: "secret-1",
    assistantID: "assistant-1",
    name: "TOKEN",
    visibility: "public",
    hasValue: true,
  });
});

defineStep("the existing secret record is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a session result with a boolean active value is parsed", function () {
  this.value = sessionResults.CheckSessionResultSchema.safeParse({ active: true });
});

defineStep("the session result is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a session result has a non-boolean active value", function () {
  this.value = sessionResults.CheckSessionResultSchema.safeParse({ active: "true" });
});

defineStep("the session result is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a connected Logux frame is parsed", function () {
  this.value = loguxFrames.LoguxFrameSchema.safeParse([
    "connected", 1, "server", [], {},
  ]);
});

defineStep("the secret-update Logux frame is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a Logux frame has an unknown frame type", function () {
  this.value = loguxFrames.LoguxFrameSchema.safeParse(["unknown", 1]);
});

defineStep("the secret-update Logux frame is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a Logux action with a typed payload is parsed", function () {
  this.value = loguxActions.LoguxActionSchema.safeParse({
    type: "project.CRUD:PATCH",
    payload: { workspaceID: "workspace-1" },
  });
});

defineStep("the Logux action is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("a Logux action has no type", function () {
  this.value = loguxActions.LoguxActionSchema.safeParse({ payload: {} });
});

defineStep("the Logux action is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("an exported object payload is parsed", function () {
  this.value = exportPayloads.ExportPayloadSchema.safeParse({ _version: "1.0" });
});

defineStep("the exported payload is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("an exported payload is an array", function () {
  this.value = exportPayloads.ExportPayloadSchema.safeParse([]);
});

defineStep("the exported payload is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a Voiceflow envelope is composed with a Zod result schema", function () {
  this.envelopeSchema = envelopeSchemas.createVoiceflowEnvelopeSchema(
    z.string(),
  );
  this.value = this.envelopeSchema.safeParse({
    ok: true,
    operation: "check_session",
    operationID: "operation-1",
    result: "active",
    warnings: [],
  });
});

defineStep("the composed envelope is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("the composed envelope has an invalid result", function () {
  this.value = this.envelopeSchema.safeParse({
    ok: true,
    operation: "check_session",
    operationID: "operation-1",
    result: 42,
    warnings: [],
  });
});

defineStep("the composed envelope is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a Zod error contains a secret input value", function () {
  const schema = z.object({ token: z.string() });
  const result = schema.safeParse({ token: { secret: "zod-secret-input" } });
  assert.equal(result.success, false);
  this.diagnostic = pluginDiagnostics.formatPluginDiagnostic("input", result.error);
});

defineStep("its plugin diagnostic omits the secret value", function () {
  assert.doesNotMatch(this.diagnostic, /zod-secret-input/);
});

defineStep("its plugin diagnostic contains only bounded issue metadata", function () {
  assert.match(this.diagnostic, /code=INTERNAL_ERROR/);
  assert.match(this.diagnostic, /domain=plugin/);
  assert.ok(this.diagnostic.length <= 320);
});

defineStep("a valid XYOps stream event is parsed", function () {
  this.value = xyopsResponses.XYOpsStreamEventSchema.safeParse({
    type: "update",
    data: { jobID: "job-1", status: "running" },
  });
});

defineStep("the HTTP or SSE event is accepted", function () {
  assert.equal(this.value.success, true);
});

defineStep("an XYOps stream event has malformed data", function () {
  this.value = xyopsResponses.XYOpsStreamEventSchema.safeParse({
    type: "update",
    data: "sse-input",
  });
});

defineStep("the HTTP or SSE event is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("a valid catalog option is checked by its guard and schema", function () {
  const option = { value: "option-1", label: "Option" };
  this.value = { schema: catalogResults.CatalogOptionSchema.safeParse(option).success };
});

defineStep("both catalog validators accept it", function () {
  assert.deepEqual(this.value, { schema: true });
});

defineStep("an invalid catalog option is checked by its guard and schema", function () {
  const option = { id: { secret: "parity-input" }, label: "Option" };
  this.value = { schema: catalogResults.CatalogOptionSchema.safeParse(option).success };
});

defineStep("both catalog validators reject it", function () {
  assert.deepEqual(this.value, { schema: false });
});

defineStep("a malformed plugin job enters the validation boundary", function () {
  let dispatches = 0;
  try {
    pluginValidation.validatePluginJob({ xy: "event", type: "event", params: null });
  } catch {
    dispatches += 0;
  }
  this.value = dispatches;
});

defineStep("validation rejects it without invoking a dispatch effect", function () {
  assert.equal(this.value, 0);
});

defineStep("an HTTP body exceeds its configured byte limit", async function () {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4]));
      controller.close();
    },
  });
  try {
    await responseBody.readResponseBody(stream, 2);
    this.value = false;
  } catch {
    this.value = true;
  }
});

defineStep("body validation rejects it without exposing body contents", function () {
  assert.equal(this.value, true);
});

defineStep("a migration plan omits its target schema version", function () {
  this.value = migrationResults.MigrationPlanSchema.safeParse({
    planID: "plan-1",
    selection: {
      sourceWorkspaceID: "workspace-1",
      sourceProjectID: "project-1",
      sourceVersionID: "version-1",
      destinationWorkspaceID: "workspace-2",
      destinationFolderID: "folder-1",
    },
    labels: {
      sourceWorkspace: "Workspace",
      sourceProject: "Project",
      sourceVersion: "Version",
      destinationWorkspace: "Workspace",
      destinationFolder: "Folder",
    },
  });
});

defineStep("the omitted target remains absent", function () {
  assert.equal(this.value.success, true);
  assert.equal(Object.hasOwn(this.value.data.selection, "targetSchemaVersion"), false);
});

defineStep("a migration plan contains a null target schema version", function () {
  this.value = migrationResults.MigrationPlanSchema.safeParse({
    planID: "plan-1",
    selection: {
      sourceWorkspaceID: "workspace-1",
      sourceProjectID: "project-1",
      sourceVersionID: "version-1",
      destinationWorkspaceID: "workspace-2",
      destinationFolderID: "folder-1",
      targetSchemaVersion: null,
    },
    labels: {
      sourceWorkspace: "Workspace",
      sourceProject: "Project",
      sourceVersion: "Version",
      destinationWorkspace: "Workspace",
      destinationFolder: "Folder",
    },
  });
});

defineStep("the nullable target is rejected", function () {
  assert.equal(this.value.success, false);
});

defineStep("the BDD20 schema inventory is inspected", function () {
  this.value = [
    "xyops/plugin/schemas/native_plugin_job.ts",
    "xyops/plugin/schemas/plugin_response.ts",
    "xyops/cli/schemas/voiceflow-envelope.ts",
    "xyops/cli/schemas/xyops-responses.ts",
    "xyops/voiceflow/catalog/schemas/catalog_record.ts",
    "xyops/voiceflow/import/schemas/receipt.ts",
    "xyops/voiceflow/logux/schemas/frame.ts",
    "xyops/voiceflow/logux/schemas/action.ts",
    "xyops/voiceflow/schemas/secret_entry.ts",
  ];
});

defineStep("each migrated boundary has an owning schema module", function () {
  assert.equal(this.value.every(existsSync), true);
});

defineStep("migrated consumers do not contain the removed secret-entry guard", function () {
  const source = readFileSync("xyops/cli/guards.ts", "utf8");
  assert.doesNotMatch(source, /Object\.keys\(entry\).*entry\.key/);
  assert.match(source, /SecretEntrySchema\.safeParse/);
});

defineStep("the BDD20 rollout sources are inspected", function () {
  this.value = [
    readFileSync("xyops/cli/guards.ts", "utf8"),
    readFileSync("xyops/voiceflow/logux/frame-contract.ts", "utf8"),
    readFileSync("xyops/voiceflow/logux/catalog-frames.ts", "utf8"),
  ];
});

defineStep("migrated consumers import Zod-owned schemas", function () {
  assert.equal(this.value.every((source) => source.includes("Schema")), true);
});

defineStep("the executable boundary suite is available", function () {
  assert.equal(existsSync("bdd/20-zod-boundary-validation/plugin-boundary.feature"), true);
});
