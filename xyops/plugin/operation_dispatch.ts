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
import { MigrationParameterName } from "../migration-parameters";
import { OperationParameterStringSchema } from "./schemas/operation_parameter";
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

const parseParameterString = (value: unknown): string => {
  const parsed = OperationParameterStringSchema.safeParse(value);
  if (!parsed.success) throw new OperationFault("INVALID_ARGUMENT");
  return parsed.data;
};

type TrimParameter = (value: unknown) => string;
const trimParameter: TrimParameter = (value) => {
  const stringValue = parseParameterString(value);
  if (stringValue.trim() === "") throw new OperationFault("INVALID_ARGUMENT");
  return stringValue.trim();
};

type RequiredParameter = (
  job: NativePluginJob,
  name: MigrationParameterName,
) => string;
const requiredParameter: RequiredParameter = (job, name) =>
  trimParameter(job.params[name]);

type OptionalParameter = (
  job: NativePluginJob,
  name: MigrationParameterName,
) => string | undefined;
const optionalParameter: OptionalParameter = (job, name) => {
  const value = job.params[name];
  if (value === undefined) return undefined;
  return trimParameter(value);
};

type OptionalSecretInput = (
  job: NativePluginJob,
  name: MigrationParameterName,
) => unknown;
const optionalSecretInput: OptionalSecretInput = (job, name) =>
  job.params[name];

type RequiredConfirmation = (job: NativePluginJob) => true;
const requiredConfirmation: RequiredConfirmation = (job) => {
  if (job.params[MigrationParameterName.confirmed] !== true)
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
      requiredParameter(job, MigrationParameterName.sourceWorkspaceID),
    ),
  list_versions: (job, token, handlers) =>
    handlers["list_versions"](
      token,
      requiredParameter(job, MigrationParameterName.sourceWorkspaceID),
      requiredParameter(job, MigrationParameterName.sourceProjectID),
    ),
  list_folders: (job, token, handlers) =>
    handlers["list_folders"](
      token,
      requiredParameter(job, MigrationParameterName.destinationWorkspaceID),
    ),
  create_folder: (job, token, handlers) =>
    handlers["create_folder"](
      token,
      requiredParameter(job, MigrationParameterName.destinationWorkspaceID),
      requiredParameter(job, MigrationParameterName.destinationFolderID),
    ),
  plan_migration: (job, token, handlers) =>
    handlers["plan_migration"](
      token,
      requiredParameter(job, MigrationParameterName.sourceWorkspaceID),
      requiredParameter(job, MigrationParameterName.sourceProjectID),
      requiredParameter(job, MigrationParameterName.sourceVersionID),
      requiredParameter(job, MigrationParameterName.destinationWorkspaceID),
      requiredParameter(job, MigrationParameterName.destinationFolderID),
      optionalParameter(job, MigrationParameterName.targetSchemaVersion),
    ),
  execute_migration: (job, token, handlers) =>
    handlers["execute_migration"](
      token,
      requiredParameter(job, MigrationParameterName.planID),
      requiredParameter(job, MigrationParameterName.sourceWorkspaceID),
      requiredParameter(job, MigrationParameterName.sourceProjectID),
      requiredParameter(job, MigrationParameterName.sourceVersionID),
      requiredParameter(job, MigrationParameterName.destinationWorkspaceID),
      requiredParameter(job, MigrationParameterName.destinationFolderID),
      optionalParameter(job, MigrationParameterName.targetSchemaVersion),
      requiredConfirmation(job),
      optionalSecretInput(job, MigrationParameterName.secretFileContents),
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
  configureDebug(job.params[MigrationParameterName.debug]);
  return invokeOperation(job.operation, () =>
    operationInvocations[job.operation](job, token, handlers),
  );
};
