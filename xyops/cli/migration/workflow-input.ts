import type { MigrationFileConfig } from "../config";
import type { MigrationWorkflowData } from "../../migration-workflow-data";
import type { XYOpsWorkflowInput } from "../types";

type WorkflowConfig = MigrationWorkflowData["config"];
type WorkflowSelection = MigrationWorkflowData["selection"];

const assignDefined = <T extends Record<string, string | undefined>>(
  values: T,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

type ToWorkflowInput = (config: MigrationFileConfig | undefined) => XYOpsWorkflowInput;
// eslint-disable-next-line complexity
export const toWorkflowInput: ToWorkflowInput = (config) => {
  const workflowConfig: WorkflowConfig = assignDefined({
    source_workspace: config?.sourceWorkspaceID,
    source_folder: config?.sourceFolderID,
    source_project: config?.sourceProjectID,
    source_path: config?.sourcePath,
    source_version: config?.sourceVersionID,
    destination_workspace: config?.destinationWorkspaceID,
    destination_folder: config?.destinationFolderID,
    destination_path: config?.destinationPath,
    target_schema_version: config?.targetSchemaVersion,
  });
  const selection: WorkflowSelection = assignDefined({
    sourceWorkspaceID: config?.sourceWorkspaceID,
    sourceProjectID: config?.sourceProjectID,
    sourceVersionID: config?.sourceVersionID,
    destinationWorkspaceID: config?.destinationWorkspaceID,
    destinationFolderID: config?.destinationFolderID,
    targetSchemaVersion: config?.targetSchemaVersion,
  });
  return {
    schemaVersion: 1,
    stage: "CONFIGURED",
    config: workflowConfig,
    catalog: {},
    selection,
  };
};
