import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const parameters = await import("../../xyops/migration-parameters.ts");
const state = await import("../../xyops/cli/state.ts");
const operations = await import("../../xyops/voiceflow/types.ts");

const selection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
};

class MigrationParameterWorld {
  payload = undefined;
  selection = selection;
}

setWorldConstructor(MigrationParameterWorld);

defineStep("the migration parameter contract is loaded", function () {
  assert.ok(parameters.MigrationParameterName);
  assert.ok(operations.VoiceflowOperation);
});

defineStep(
  "parameter names are defined by the MigrationParameterName constant object",
  function () {
    assert.equal(typeof parameters.MigrationParameterName, "object");
  },
);

defineStep(
  "operation names continue to use the VoiceflowOperation constant object",
  function () {
    assert.equal(operations.VoiceflowOperation.ListProjects, "list_projects");
    assert.equal(operations.VoiceflowOperation.PlanMigration, "plan_migration");
    assert.equal(operations.VoiceflowOperation.ExecuteMigration, "execute_migration");
  },
);

defineStep("MigrationParameterName contains:", function (table) {
  for (const { member, value } of table.hashes())
    assert.equal(parameters.MigrationParameterName[member], value);
});

defineStep("no serialized job parameter key is renamed or normalized", function () {
  this.payload = parameters.buildPlanMigrationParameters(this.selection);
  assert.deepEqual(Object.keys(this.payload), [
    "operation",
    "SOURCE_WORKSPACE_ID",
    "SOURCE_PROJECT_ID",
    "SOURCE_VERSION_ID",
    "DESTINATION_WORKSPACE_ID",
    "DESTINATION_FOLDER_ID",
  ]);
});

defineStep(
  "the constants are runtime values suitable for indexing serialized parameters",
  function () {
    const key = parameters.MigrationParameterName.sourceWorkspaceID;
    assert.equal(this.payload[key], "source-workspace");
  },
);

defineStep("an operation parameter payload is built with a required parameter", function () {
  this.payload = state.eventParametersFor(operations.VoiceflowOperation.ListProjects, {
    [parameters.MigrationParameterName.sourceWorkspaceID]: "source-workspace",
  });
});

defineStep("it uses a MigrationParameterName member", function () {
  assert.equal(this.payload.SOURCE_WORKSPACE_ID, "source-workspace");
  assert.equal(this.payload.SOURCE_WORKSPCE_ID, undefined);
});

defineStep("an operation parameter payload is built with an optional parameter", function () {
  this.payload = state.eventParametersFor(operations.VoiceflowOperation.PlanMigration, {
    [parameters.MigrationParameterName.targetSchemaVersion]: undefined,
  });
});

defineStep("an absent optional parameter is omitted", function () {
  assert.equal(this.payload.TARGET_SCHEMA_VERSION, undefined);
  assert.equal(Object.hasOwn(this.payload, "TARGET_SCHEMA_VERSION"), false);
});

defineStep("a misspelled parameter cannot be introduced through the typed contract", function () {
  assert.equal(Object.hasOwn(this.payload, "SOURCE_WORKSPCE_ID"), false);
});

defineStep("SOURCE_WORKSPACE_ID is present as a non-empty string", function () {
  this.selection = { ...selection, sourceWorkspaceID: " workspace-with-significant-spacing " };
});

defineStep("list_projects parameters are built using VoiceflowOperation.ListProjects", function () {
  this.payload = state.eventParametersFor(operations.VoiceflowOperation.ListProjects, {
    [parameters.MigrationParameterName.sourceWorkspaceID]: this.selection.sourceWorkspaceID,
  });
});

defineStep("the serialized workspace value is preserved without additional normalization", function () {
  assert.equal(this.payload.SOURCE_WORKSPACE_ID, " workspace-with-significant-spacing ");
});

defineStep("TARGET_SCHEMA_VERSION is absent", function () {
  this.selection = { ...selection, targetSchemaVersion: undefined };
});

defineStep("plan_migration parameters are built using VoiceflowOperation.PlanMigration", function () {
  this.payload = parameters.buildPlanMigrationParameters(this.selection);
});

defineStep("TARGET_SCHEMA_VERSION is omitted", function () {
  assert.equal(Object.hasOwn(this.payload, "TARGET_SCHEMA_VERSION"), false);
});

defineStep("execute_migration parameters are built using VoiceflowOperation.ExecuteMigration", function () {
  this.payload = parameters.buildExecuteMigrationParameters(this.selection, "plan-1");
});

defineStep("CONFIRMED is the literal boolean true", function () {
  assert.equal(this.payload.CONFIRMED, true);
  assert.equal(typeof this.payload.CONFIRMED, "boolean");
});

defineStep("the parameter contract is compiled", function () {
  assert.equal(parameters.MigrationParameterName.constructor, Object);
});

defineStep("it exposes the exact string values without enum reverse mappings", function () {
  assert.equal(parameters.MigrationParameterName["SOURCE_WORKSPACE_ID"], undefined);
});

defineStep("it does not add a protocol translation layer", function () {
  assert.equal(parameters.MigrationParameterName.sourceWorkspaceID, "SOURCE_WORKSPACE_ID");
});

defineStep("the external XYOps payload remains byte-for-byte compatible", function () {
  const payload = parameters.buildExecuteMigrationParameters(this.selection, "plan-1", [
    { key: "TOKEN", value: "secret-value", type: "" },
  ]);
  assert.deepEqual(payload.SECRET_FILE_CONTENTS, [
    { key: "TOKEN", value: "secret-value", type: "" },
  ]);
});
