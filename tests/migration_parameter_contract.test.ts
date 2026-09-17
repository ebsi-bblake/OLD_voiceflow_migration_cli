import { describe, expect, test } from "bun:test";
import {
  buildExecuteMigrationParameters,
  buildPlanMigrationParameters,
  MigrationParameterName,
} from "../xyops/migration-parameters";
import { eventParametersFor } from "../xyops/cli/state";

const _compileTimeContractExamples = (): void => {
  // @ts-expect-error Operation values are part of the external contract.
  eventParametersFor("list_projecs", {});
  // @ts-expect-error Serialized parameter keys are part of the external contract.
  eventParametersFor("list_projects", { SOURCE_WORKSPCE_ID: "wrong" });
};

const selection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
  targetSchemaVersion: "13.1",
} as const;

describe("migration parameter contract", () => {
  test("serializes the plan payload with the exact wire keys", () => {
    expect(buildPlanMigrationParameters(selection)).toEqual({
      operation: "plan_migration",
      SOURCE_WORKSPACE_ID: "source-workspace",
      SOURCE_PROJECT_ID: "source-project",
      SOURCE_VERSION_ID: "source-version",
      DESTINATION_WORKSPACE_ID: "destination-workspace",
      DESTINATION_FOLDER_ID: "destination-folder",
      TARGET_SCHEMA_VERSION: "13.1",
    });
  });

  test("serializes execute confirmation and preserves secret array shape", () => {
    const secrets = [{ key: "TOKEN", value: "secret-value", type: "" as const }];
    expect(buildExecuteMigrationParameters(selection, "plan-1", secrets)).toEqual({
      operation: "execute_migration",
      PLAN_ID: "plan-1",
      SOURCE_WORKSPACE_ID: "source-workspace",
      SOURCE_PROJECT_ID: "source-project",
      SOURCE_VERSION_ID: "source-version",
      DESTINATION_WORKSPACE_ID: "destination-workspace",
      DESTINATION_FOLDER_ID: "destination-folder",
      TARGET_SCHEMA_VERSION: "13.1",
      CONFIRMED: true,
      SECRET_FILE_CONTENTS: secrets,
    });
    expect(buildExecuteMigrationParameters(selection, "plan-1")).not.toHaveProperty(
      MigrationParameterName.secretFileContents,
    );
  });

  test("omits an absent optional schema version without normalizing configured values", () => {
    const result = buildPlanMigrationParameters({
      ...selection,
      targetSchemaVersion: undefined,
      sourceProjectID: " project-with-significant-spacing ",
    });
    expect(result).not.toHaveProperty(MigrationParameterName.targetSchemaVersion);
    expect(result[MigrationParameterName.sourceProjectID]).toBe(
      " project-with-significant-spacing ",
    );
    expect(Object.values(result)).not.toContain(undefined);
  });

  test.each([
    ["sourceWorkspaceID", { ...selection, sourceWorkspaceID: "" }],
    ["sourceProjectID", { ...selection, sourceProjectID: "   " }],
    ["planID", selection],
  ])("rejects missing required values (%s)", (name, invalidSelection) => {
    if (name === "planID") {
      expect(() => buildExecuteMigrationParameters(invalidSelection, " ")).toThrow();
      return;
    }
    expect(() => buildPlanMigrationParameters(invalidSelection)).toThrow();
  });

  test("keeps the contract names centralized and rejects no legacy aliases", () => {
    expect(MigrationParameterName).toEqual({
      operation: "operation",
      sourceWorkspaceID: "SOURCE_WORKSPACE_ID",
      sourceProjectID: "SOURCE_PROJECT_ID",
      sourceVersionID: "SOURCE_VERSION_ID",
      destinationWorkspaceID: "DESTINATION_WORKSPACE_ID",
      destinationFolderID: "DESTINATION_FOLDER_ID",
      targetSchemaVersion: "TARGET_SCHEMA_VERSION",
      planID: "PLAN_ID",
      secretFileContents: "SECRET_FILE_CONTENTS",
      confirmed: "CONFIRMED",
      debug: "DEBUG",
    });
    expect(buildPlanMigrationParameters(selection)).not.toHaveProperty("SOURCE_WORKSPACE");
  });
});
