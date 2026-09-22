import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { folderOptions, projectOptions, versionOptions, workspaceOptions } from "./catalog";
import { planID } from "./planning/plan-id";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type PlannedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "PLANNED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<PlannedResult>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
const labelFor = (options: readonly { value: string; label: string }[], value: string): string => {
  const option = options.find((candidate) => candidate.value === value);
  if (option === undefined) throw new OperationFault("NOT_FOUND");
  return option.label;
};

type PlannedLabels = Readonly<{
  sourceWorkspace: string;
  sourceProject: string;
  sourceVersion: string;
  destinationWorkspace: string;
  destinationFolder: string;
}>;
const destinationFolderLabel = (
  selection: { destinationFolderID?: string },
  creation: { requestedPath: string } | undefined,
  options: readonly { value: string; label: string }[],
): string => {
  if (selection.destinationFolderID !== undefined)
    return labelFor(options, selection.destinationFolderID);
  if (creation !== undefined) return creation.requestedPath;
  throw new OperationFault("NOT_FOUND");
};
const plannedLabels = (
  parsed: Extract<z.infer<typeof MigrationWorkflowDataSchema>, { stage: "DESTINATION_RESOLVED" }>,
): PlannedLabels => {
  const { catalog, selection, destinationFolderCreation } = parsed;
  const sourceWorkspaceOptions = workspaceOptions(catalog.workspaces);
  const sourceProjectOptions = projectOptions(selection.sourceWorkspaceID, catalog.sourceFolders)(catalog.sourceProjects);
  const sourceVersionOptions = versionOptions(selection.sourceWorkspaceID, selection.sourceProjectID)(catalog.sourceProjects);
  const destinationFolderOptions = folderOptions(selection.destinationWorkspaceID)(catalog.destinationFolders);
  return {
    sourceWorkspace: labelFor(sourceWorkspaceOptions, selection.sourceWorkspaceID),
    sourceProject: labelFor(sourceProjectOptions, selection.sourceProjectID),
    sourceVersion: labelFor(sourceVersionOptions, selection.sourceVersionID),
    destinationWorkspace: labelFor(sourceWorkspaceOptions, selection.destinationWorkspaceID),
    destinationFolder: destinationFolderLabel(selection, destinationFolderCreation, destinationFolderOptions),
  };
};
export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "DESTINATION_RESOLVED") throw new OperationFault("INVALID_ARGUMENT");
    const { catalog, selection, config, sourceSchemaVersion, destinationFolderCreation } = parsed.data;
    const labels = plannedLabels(parsed.data);
    const planIDValue = await planID(selection);
    const plan = {
      planID: planIDValue,
      ...(sourceSchemaVersion === undefined ? {} : { sourceSchemaVersion }),
      selection,
      labels,
      ...(destinationFolderCreation === undefined
        ? {}
        : { destinationFolderCreation }),
    };
    return success("plan_migration_workflow", id, {
      schemaVersion: 1,
      stage: "PLANNED",
      config,
      catalog,
      ...(sourceSchemaVersion === undefined ? {} : { sourceSchemaVersion }),
      selection,
      plan,
    });
  } catch (error) {
    return failure("plan_migration_workflow", id, error);
  }
};
