import type { MigrationFileConfig } from "../config";
import {
  ConfirmedMigrationHandoffSchema,
  type MigrationWorkflowConfig,
  type MigrationWorkflowData,
} from "../../migration-workflow-data";
import type { JSONValue, WorkflowMigrationPlan, XYOpsWorkflowInput } from "../types";

type WorkflowConfig = MigrationWorkflowConfig;
type WorkflowSelection = MigrationWorkflowData["selection"];

const assignDefined = <T extends Record<string, string | undefined>>(
  values: T,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );

type ToWorkflowInput = (config: MigrationFileConfig | undefined) => XYOpsWorkflowInput;
export type ToExecutionWorkflowInput = (
  plan: WorkflowMigrationPlan,
) => XYOpsWorkflowInput;

const toJSONValue = (value: unknown): JSONValue => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Workflow input is not JSON-safe");
  return JSON.parse(serialized) as JSONValue;
};

export const toExecutionWorkflowInput: ToExecutionWorkflowInput = (plan) =>
  toJSONValue(
    ConfirmedMigrationHandoffSchema.parse({
      schemaVersion: 1,
      confirmed: true,
      planID: plan.planID,
      plan,
    }),
  ) as XYOpsWorkflowInput;
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
