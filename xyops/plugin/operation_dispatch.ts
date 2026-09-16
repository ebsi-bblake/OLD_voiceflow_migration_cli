import { main as checkSession } from "../voiceflow/check_session";
import { main as executeMigration } from "../voiceflow/execute_migration";
import { main as listFolders } from "../voiceflow/list_folders";
import { main as createFolder } from "../voiceflow/create_folder";
import { main as listProjects } from "../voiceflow/list_projects";
import { main as listVersions } from "../voiceflow/list_versions";
import { main as listWorkspaces } from "../voiceflow/list_workspaces";
import { main as planMigration } from "../voiceflow/plan_migration";
import { failure, OperationFault, type Envelope } from "../voiceflow/contracts";
import { createUUID } from "../voiceflow/uuid";
import type { NativePluginJob, OperationHandlers } from "./types";
import type { VoiceflowOperation } from "../voiceflow/types";
import { configureDebug } from "../voiceflow/debug";
export type { OperationHandlers } from "./types";

type PluginEnvelope = Envelope<unknown>;
type DefaultOperationHandlers = OperationHandlers;
const defaultOperationHandlers: DefaultOperationHandlers = {
  check_session: checkSession,
  list_workspaces: listWorkspaces,
  list_projects: listProjects,
  list_versions: listVersions,
  list_folders: listFolders,
  create_folder: createFolder,
  plan_migration: planMigration,
  execute_migration: executeMigration,
};

const requireParameterString = (value: unknown): string => {
  if (typeof value !== "string") throw new OperationFault("INVALID_ARGUMENT");
  return value;
};

type TrimParameter = (value: unknown) => string;
const trimParameter: TrimParameter = (value) => {
  const stringValue = requireParameterString(value);
  if (stringValue.trim() === "") throw new OperationFault("INVALID_ARGUMENT");
  return stringValue.trim();
};

type RequiredParameter = (job: NativePluginJob, name: string) => string;
const requiredParameter: RequiredParameter = (job, name) =>
  trimParameter(job.params[name]);

type OptionalParameter = (
  job: NativePluginJob,
  name: string,
) => string | undefined;
const optionalParameter: OptionalParameter = (job, name) => {
  const value = job.params[name];
  if (value === undefined) return undefined;
  return trimParameter(value);
};

type OptionalSecretInput = (job: NativePluginJob, name: string) => unknown;
const optionalSecretInput: OptionalSecretInput = (job, name) =>
  job.params[name];

type RequiredConfirmation = (job: NativePluginJob) => true;
const requiredConfirmation: RequiredConfirmation = (job) => {
  if (job.params.CONFIRMED !== true)
    throw new OperationFault("CONFIRMATION_REQUIRED");
  return true;
};

type OperationInvocation = (
  job: NativePluginJob,
  token: string,
  handlers: OperationHandlers,
) => Promise<PluginEnvelope>;

type OperationInvocations = Readonly<
  Record<NativePluginJob["operation"], OperationInvocation>
>;
const operationInvocations: OperationInvocations = {
  check_session: (_job, token, handlers) => handlers["check_session"](token),
  list_workspaces: (_job, token, handlers) =>
    handlers["list_workspaces"](token),
  list_projects: (job, token, handlers) =>
    handlers["list_projects"](
      token,
      requiredParameter(job, "SOURCE_WORKSPACE_ID"),
    ),
  list_versions: (job, token, handlers) =>
    handlers["list_versions"](
      token,
      requiredParameter(job, "SOURCE_WORKSPACE_ID"),
      requiredParameter(job, "SOURCE_PROJECT_ID"),
    ),
  list_folders: (job, token, handlers) =>
    handlers["list_folders"](
      token,
      requiredParameter(job, "DESTINATION_WORKSPACE_ID"),
    ),
  create_folder: (job, token, handlers) =>
    handlers["create_folder"](
      token,
      requiredParameter(job, "DESTINATION_WORKSPACE_ID"),
      requiredParameter(job, "DESTINATION_FOLDER_ID"),
    ),
  plan_migration: (job, token, handlers) =>
    handlers["plan_migration"](
      token,
      requiredParameter(job, "SOURCE_WORKSPACE_ID"),
      requiredParameter(job, "SOURCE_PROJECT_ID"),
      requiredParameter(job, "SOURCE_VERSION_ID"),
      requiredParameter(job, "DESTINATION_WORKSPACE_ID"),
      requiredParameter(job, "DESTINATION_FOLDER_ID"),
      optionalParameter(job, "TARGET_SCHEMA_VERSION"),
    ),
  execute_migration: (job, token, handlers) =>
    handlers["execute_migration"](
      token,
      requiredParameter(job, "PLAN_ID"),
      requiredParameter(job, "SOURCE_WORKSPACE_ID"),
      requiredParameter(job, "SOURCE_PROJECT_ID"),
      requiredParameter(job, "SOURCE_VERSION_ID"),
      requiredParameter(job, "DESTINATION_WORKSPACE_ID"),
      requiredParameter(job, "DESTINATION_FOLDER_ID"),
      optionalParameter(job, "TARGET_SCHEMA_VERSION"),
      requiredConfirmation(job),
      optionalSecretInput(job, "SECRET_FILE_CONTENTS"),
    ),
};

type InvokeOperation = (
  operation: VoiceflowOperation,
  invoke: () => Promise<PluginEnvelope>,
) => Promise<PluginEnvelope>;
const invokeOperation: InvokeOperation = (operation, invoke) =>
  Promise.resolve()
    .then(invoke)
    .catch((error: unknown) => failure(operation, createUUID(), error));

type DispatchOperation = (
  job: NativePluginJob,
  token: string,
  handlers?: OperationHandlers,
) => Promise<PluginEnvelope>;
export const dispatchOperation: DispatchOperation = (
  job,
  token,
  handlers = defaultOperationHandlers,
) => {
  configureDebug(job.params.DEBUG);
  return invokeOperation(
    job.operation,
    () => operationInvocations[job.operation](job, token, handlers),
  );
};
