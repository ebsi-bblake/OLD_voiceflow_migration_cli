import { main as checkSession } from "../voiceflow/check_session";
import { main as checkSessionWorkflow } from "../voiceflow/check-migration-workflow-session";
import { main as executeMigration } from "../voiceflow/execute_migration";
import { main as listFolders } from "../voiceflow/list_folders";
import { main as createFolder } from "../voiceflow/create_folder";
import { main as listProjects } from "../voiceflow/list_projects";
import { main as listVersions } from "../voiceflow/list_versions";
import { main as listWorkspaces } from "../voiceflow/list_workspaces";
import { main as loadWorkspaces } from "../voiceflow/load-migration-workspaces";
import { main as loadSourceCatalog } from "../voiceflow/load-migration-source-catalog";
import { main as resolveSourceSelection } from "../voiceflow/resolve-migration-source";
import { main as resolveSourceSchemaWorkflow } from "../voiceflow/resolve-source-schema-workflow";
import { main as loadDestinationCatalog } from "../voiceflow/load-migration-destination-catalog";
import { main as resolveDestinationSelection } from "../voiceflow/resolve-migration-destination";
import { main as planMigrationWorkflow } from "../voiceflow/plan-migration-workflow";
import { main as planMigration } from "../voiceflow/plan_migration";
import { main as initializeMigrationWorkflow } from "../voiceflow/initialize-migration-workflow";
import { main as initializeExecutionWorkflow } from "../voiceflow/initialize-execution-workflow";
import { main as executeMigrationWorkflow } from "../voiceflow/execute-migration-workflow";
import { main as createFolderWorkflow } from "../voiceflow/create-folder-workflow";
import { failure, OperationFault, type Envelope } from "../voiceflow/contracts";
import { createUUID } from "../voiceflow/uuid";
import type { NativePluginJob, OperationHandlers } from "./types";
import type { VoiceflowOperation } from "../voiceflow/types";
import { configureDebug } from "../voiceflow/debug";
import { MigrationParameterName } from "../migration-parameters";
import { OperationParameterStringSchema } from "./schemas/operation_parameter";
import { z } from "zod";
export type { OperationHandlers } from "./types";

type PluginEnvelope = Envelope<unknown>;
type DefaultOperationHandlers = OperationHandlers;
const defaultOperationHandlers: DefaultOperationHandlers = {
  check_session: checkSession,
  check_session_workflow: checkSessionWorkflow,
  list_workspaces: listWorkspaces,
  load_workspaces: loadWorkspaces,
  load_source_catalog: loadSourceCatalog,
  resolve_source_selection: resolveSourceSelection,
  resolve_source_schema_workflow: resolveSourceSchemaWorkflow,
  load_destination_catalog: loadDestinationCatalog,
  resolve_destination_selection: resolveDestinationSelection,
  plan_migration_workflow: planMigrationWorkflow,
  list_projects: listProjects,
  list_versions: listVersions,
  list_folders: listFolders,
  create_folder: createFolder,
  plan_migration: planMigration,
  execute_migration: executeMigration,
  initialize_migration_workflow: initializeMigrationWorkflow,
  initialize_execution_workflow: initializeExecutionWorkflow,
  execute_migration_workflow: executeMigrationWorkflow,
  create_folder_workflow: createFolderWorkflow,
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
  job.params[name] ?? job.workflow?.params?.[name];

type RequiredConfirmation = (job: NativePluginJob) => true;
const requiredConfirmation: RequiredConfirmation = (job) => {
  if (job.params[MigrationParameterName.confirmed] !== true)
    throw new OperationFault("CONFIRMATION_REQUIRED");
  return true;
};

const workflowDataInput = (job: NativePluginJob): unknown => {
  if (job.workflowData !== undefined) return job.workflowData;
  const input = z
    .looseObject({ data: z.unknown() })
    .safeParse(job.input);
  return input.success ? input.data.data : undefined;
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
  check_session_workflow: (job, token, handlers) => {
    const check = handlers.check_session_workflow;
    if (check === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return check(token, workflowDataInput(job));
  },
  list_workspaces: (_job, token, handlers) =>
    handlers["list_workspaces"](token),
  load_workspaces: (job, token, handlers) => {
    const load = handlers.load_workspaces;
    if (load === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return load(token, workflowDataInput(job));
  },
  load_source_catalog: (job, token, handlers) => {
    const load = handlers.load_source_catalog;
    if (load === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return load(token, workflowDataInput(job));
  },
  resolve_source_selection: (job, _token, handlers) => {
    const resolve = handlers.resolve_source_selection;
    if (resolve === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return resolve(workflowDataInput(job));
  },
  resolve_source_schema_workflow: (job, token, handlers) => {
    const resolve = handlers.resolve_source_schema_workflow;
    if (resolve === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return resolve(token, workflowDataInput(job));
  },
  load_destination_catalog: (job, token, handlers) => {
    const load = handlers.load_destination_catalog;
    if (load === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return load(token, workflowDataInput(job));
  },
  resolve_destination_selection: (job, _token, handlers) => {
    const resolve = handlers.resolve_destination_selection;
    if (resolve === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return resolve(workflowDataInput(job));
  },
  plan_migration_workflow: (job, _token, handlers) => {
    const plan = handlers.plan_migration_workflow;
    if (plan === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return plan(workflowDataInput(job));
  },
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
  initialize_migration_workflow: (job, _token, handlers) => {
    const initialize = handlers.initialize_migration_workflow;
    if (initialize === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    const input = z
      .looseObject({ data: z.unknown() })
      .safeParse(job.input);
    return initialize(input.success ? input.data.data : undefined);
  },
  initialize_execution_workflow: (job, _token, handlers) => {
    const initialize = handlers.initialize_execution_workflow;
    if (initialize === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    const input = z
      .looseObject({ data: z.unknown() })
      .safeParse(job.input);
    return initialize(input.success ? input.data.data : undefined);
  },
  execute_migration_workflow: (job, token, handlers) => {
    const execute = handlers.execute_migration_workflow;
    if (execute === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return execute(token, workflowDataInput(job), optionalSecretInput(job, MigrationParameterName.secretFileContents));
  },
  create_folder_workflow: (job, token, handlers) => {
    const create = handlers.create_folder_workflow;
    if (create === undefined)
      return Promise.reject(new OperationFault("INTERNAL_ERROR"));
    return create(token, workflowDataInput(job));
  },
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
