import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { folderOptions, projectOptions, versionOptions, workspaceOptions } from "./catalog";
import { planID } from "./planning/plan-id";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type PlannedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "PLANNED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<PlannedResult>>;
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const readWorkflowData = (value: unknown): unknown => isRecord(value) && isRecord(value.voiceflow) ? value.voiceflow.result : value;
const labelFor = (options: readonly { value: string; label: string }[], value: string): string => {
  const option = options.find((candidate) => candidate.value === value);
  if (option === undefined) throw new OperationFault("NOT_FOUND");
  return option.label;
};
export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "DESTINATION_RESOLVED") throw new OperationFault("INVALID_ARGUMENT");
    const { catalog, selection, config } = parsed.data;
    const sourceWorkspaceOptions = workspaceOptions(catalog.workspaces);
    const sourceProjectOptions = projectOptions(selection.sourceWorkspaceID, catalog.sourceFolders)(catalog.sourceProjects);
    const sourceVersionOptions = versionOptions(selection.sourceWorkspaceID, selection.sourceProjectID)(catalog.sourceProjects);
    const destinationFolderOptions = folderOptions(selection.destinationWorkspaceID)(catalog.destinationFolders);
    const labels = {
      sourceWorkspace: labelFor(sourceWorkspaceOptions, selection.sourceWorkspaceID),
      sourceProject: labelFor(sourceProjectOptions, selection.sourceProjectID),
      sourceVersion: labelFor(sourceVersionOptions, selection.sourceVersionID),
      destinationWorkspace: labelFor(sourceWorkspaceOptions, selection.destinationWorkspaceID),
      destinationFolder: labelFor(destinationFolderOptions, selection.destinationFolderID),
    };
    const planIDValue = await planID(selection);
    return success("plan_migration_workflow", id, {
      schemaVersion: 1,
      stage: "PLANNED",
      config,
      catalog,
      selection,
      plan: { planID: planIDValue, selection, labels },
    });
  } catch (error) {
    return failure("plan_migration_workflow", id, error);
  }
};
