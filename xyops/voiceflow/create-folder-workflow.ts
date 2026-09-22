import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { resolveVoiceflowAuth } from "./auth";
import { failure, OperationFault, success } from "./contracts";
import { folderOptions, loadFolders } from "./catalog";
import { main as createFolder } from "./create_folder";
import { planID } from "./planning/plan-id";
import type { Envelope, FolderRecord } from "./types";
import { createUUID } from "./uuid";

const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
const normalize = (value: string): string =>
  value.normalize("NFC").trim().toLowerCase();
const normalizeFolderLabel = (value: string): string =>
  normalize(value.replace(/\s+\([^()]+\)$/u, ""));

type ExecutionReadyData = Extract<
  z.infer<typeof MigrationWorkflowDataSchema>,
  { stage: "EXECUTION_READY" }
>;
type FolderChoice = Readonly<{ value: string; label: string }>;
const findFolder = (
  requestedPath: string,
  choices: readonly FolderChoice[],
): FolderChoice | undefined => {
  const matches = choices.filter(
    (choice) => normalizeFolderLabel(choice.label) === normalize(requestedPath),
  );
  if (matches.length > 1) throw new OperationFault("CONFIGURATION");
  return matches[0];
};

const completedData = async (
  data: ExecutionReadyData,
  folderID: string,
  folderLabel: string,
): Promise<ExecutionReadyData> => {
  const selection = { ...data.selection, destinationFolderID: folderID };
  const nextPlanID = await planID(selection);
  const { destinationFolderCreation: _creation, ...planWithoutCreation } = data.plan;
  return {
    ...data,
    planID: nextPlanID,
    selection,
    plan: {
      ...planWithoutCreation,
      planID: nextPlanID,
      selection,
      labels: { ...data.plan.labels, destinationFolder: folderLabel },
    },
  };
};

const resolveCurrentFolder = async (
  token: string,
  workspaceID: string,
  requestedPath: string,
): Promise<FolderRecord | undefined> => {
  const auth = await resolveVoiceflowAuth(token);
  const folders = await loadFolders(auth, workspaceID);
  const choice = findFolder(requestedPath, folderOptions(workspaceID)(folders));
  return choice === undefined
    ? undefined
    : folders.find((folder) => folder.id === choice.value);
};

type ResolveCurrentFolder = (
  token: string,
  workspaceID: string,
  requestedPath: string,
) => Promise<FolderRecord | undefined>;
type CreateFolderOperation = typeof createFolder;
type CreateFolderDependencies = Readonly<{
  readonly resolveCurrentFolder: ResolveCurrentFolder;
  readonly createFolder: CreateFolderOperation;
}>;
const defaultCreateFolderDependencies: CreateFolderDependencies = {
  resolveCurrentFolder,
  createFolder,
};

const createAndVerifyFolder = async (
  token: string,
  data: ExecutionReadyData,
  requestedPath: string,
  dependencies: CreateFolderDependencies,
): Promise<FolderRecord> => {
  const creation = data.plan.destinationFolderCreation;
  if (creation === undefined) throw new OperationFault("INVALID_ARGUMENT");
  const response = await dependencies.createFolder(token, creation.workspaceID, requestedPath);
  if (!response.ok) {
    const appeared = await dependencies.resolveCurrentFolder(
      token,
      creation.workspaceID,
      requestedPath,
    );
    if (appeared !== undefined) return appeared;
    throw new OperationFault(
      response.error.code,
      response.error.retryable,
      "destination-folder-creation-uncertain",
    );
  }
  const auth = await resolveVoiceflowAuth(token);
  const folders = await loadFolders(auth, creation.workspaceID);
  const created = folders.find((folder) => folder.id === response.result.folder.value);
  if (created === undefined) throw new OperationFault("DEPENDENCY_FAILURE");
  return created;
};

type EnsureFolder = (
  token: string,
  data: ExecutionReadyData,
  dependencies: CreateFolderDependencies,
) => Promise<ExecutionReadyData>;
const ensureFolder: EnsureFolder = async (token, data, dependencies) => {
  const creation = data.plan.destinationFolderCreation;
  if (creation === undefined || data.selection.destinationFolderID !== undefined)
    return data;
  const existing = await dependencies.resolveCurrentFolder(
    token,
    creation.workspaceID,
    creation.requestedPath,
  );
  const folder = existing ?? (await createAndVerifyFolder(
    token,
    data,
    creation.requestedPath,
    dependencies,
  ));
  return completedData(data, folder.id, folder.label);
};

type Main = (
  token: string,
  workflowData: unknown,
  dependencies?: CreateFolderDependencies,
) => Promise<Envelope<unknown>>;
export const main: Main = async (token, input, dependencies = defaultCreateFolderDependencies) => {
  const operationID = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "EXECUTION_READY")
      throw new OperationFault("INVALID_ARGUMENT");
    return success(
      "create_folder_workflow",
      operationID,
      await ensureFolder(token, parsed.data, dependencies),
    );
  } catch (error) {
    return failure("create_folder_workflow", operationID, error);
  }
};
