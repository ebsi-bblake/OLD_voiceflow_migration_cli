import type { Envelope } from "../voiceflow/contracts";
import type { MigrationWorkflowData } from "../migration-workflow-data";
import type { supportedPluginOperations } from "./operations";

export type PluginOperation = (typeof supportedPluginOperations)[number];

export type PluginParameters = Readonly<Record<string, unknown>>;

export type NativePluginJob = Readonly<{
  readonly params: PluginParameters;
  readonly operation: PluginOperation;
  readonly input?: unknown;
  readonly workflowData?: unknown;
  readonly workflow?: Readonly<{
    readonly params?: PluginParameters;
  }>;
}>;

export type VoiceflowEnvelope = Envelope<unknown>;

export type XYOpsPluginData = Readonly<{
  readonly voiceflow: VoiceflowEnvelope;
}>;

export type XYOpsPluginResponse = Readonly<{
  readonly xy: 1;
  readonly complete: true;
  readonly code: 0 | string;
  readonly data?: XYOpsPluginData;
  readonly workflowData?: MigrationWorkflowData;
  readonly description?: string;
}>;

export type PluginValidationCode =
  "INVALID_JSON" | "INVALID_INPUT" | "MISSING_SECRET" | "UNKNOWN_OPERATION";
type PluginEnvelope = Envelope<unknown>;

type CheckSessionHandler = (token: string) => Promise<PluginEnvelope>;
type CheckSessionWorkflowHandler = (token: string, workflowData: unknown) => Promise<PluginEnvelope>;

type ListWorkspacesHandler = (token: string) => Promise<PluginEnvelope>;
type LoadWorkspacesHandler = (token: string, workflowData: unknown) => Promise<PluginEnvelope>;
type LoadSourceCatalogHandler = (token: string, workflowData: unknown) => Promise<PluginEnvelope>;
type ResolveSourceSelectionHandler = (workflowData: unknown) => Promise<PluginEnvelope>;
type ResolveSourceSchemaWorkflowHandler = (token: string, workflowData: unknown) => Promise<PluginEnvelope>;
type LoadDestinationCatalogHandler = (token: string, workflowData: unknown) => Promise<PluginEnvelope>;
type ResolveDestinationSelectionHandler = (workflowData: unknown) => Promise<PluginEnvelope>;
type PlanMigrationWorkflowHandler = (workflowData: unknown) => Promise<PluginEnvelope>;

type ListProjectsHandler = (
  token: string,
  sourceWorkspaceID: string,
) => Promise<PluginEnvelope>;

type ListVersionsHandler = (
  token: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
) => Promise<PluginEnvelope>;

type ListFoldersHandler = (
  token: string,
  destinationWorkspaceID: string,
) => Promise<PluginEnvelope>;

type CreateFolderHandler = (
  token: string,
  destinationWorkspaceID: string,
  folderName: string,
) => Promise<PluginEnvelope>;

type PlanMigrationHandler = (
  token: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
) => Promise<PluginEnvelope>;

type InitializeMigrationWorkflowHandler = (
  input: unknown,
) => Promise<PluginEnvelope>;
type InitializeExecutionWorkflowHandler = (
  input: unknown,
) => Promise<PluginEnvelope>;
type ExecuteMigrationWorkflowHandler = (
  token: string,
  workflowData: unknown,
  secretFileContents?: unknown,
) => Promise<PluginEnvelope>;
type CreateFolderWorkflowHandler = (
  token: string,
  workflowData: unknown,
) => Promise<PluginEnvelope>;

type ExecuteMigrationHandler = (
  token: string,
  planID: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
  confirmed?: boolean,
  secretFileContents?: unknown,
) => Promise<PluginEnvelope>;

export type OperationHandlers = Readonly<{
  readonly check_session: CheckSessionHandler;
  readonly check_session_workflow?: CheckSessionWorkflowHandler;
  readonly list_workspaces: ListWorkspacesHandler;
  readonly load_workspaces?: LoadWorkspacesHandler;
  readonly load_source_catalog?: LoadSourceCatalogHandler;
  readonly resolve_source_selection?: ResolveSourceSelectionHandler;
  readonly resolve_source_schema_workflow?: ResolveSourceSchemaWorkflowHandler;
  readonly load_destination_catalog?: LoadDestinationCatalogHandler;
  readonly resolve_destination_selection?: ResolveDestinationSelectionHandler;
  readonly plan_migration_workflow?: PlanMigrationWorkflowHandler;
  readonly list_projects: ListProjectsHandler;
  readonly list_versions: ListVersionsHandler;
  readonly list_folders: ListFoldersHandler;
  readonly create_folder: CreateFolderHandler;
  readonly plan_migration: PlanMigrationHandler;
  readonly execute_migration: ExecuteMigrationHandler;
  readonly initialize_migration_workflow?: InitializeMigrationWorkflowHandler;
  readonly initialize_execution_workflow?: InitializeExecutionWorkflowHandler;
  readonly execute_migration_workflow?: ExecuteMigrationWorkflowHandler;
  readonly create_folder_workflow?: CreateFolderWorkflowHandler;
}>;

export type PluginInputChunk = Uint8Array | string;
export type PluginInput = AsyncIterable<PluginInputChunk>;

export const PluginStage = {
  Input: "input",
  Secret: "secret",
  Dispatch: "dispatch",
  Response: "response",
} as const;
export type PluginStage = (typeof PluginStage)[keyof typeof PluginStage];
