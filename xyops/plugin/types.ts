import type { Envelope } from "../voiceflow/contracts";
import type { supportedPluginOperations } from "./operations";

export type PluginOperation = (typeof supportedPluginOperations)[number];

export type PluginParameters = Readonly<Record<string, unknown>>;

export type NativePluginJob = Readonly<{
  readonly params: PluginParameters;
  readonly operation: PluginOperation;
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
  readonly description?: string;
}>;

export type PluginValidationCode =
  "INVALID_JSON" | "INVALID_INPUT" | "MISSING_SECRET" | "UNKNOWN_OPERATION";
type PluginEnvelope = Envelope<unknown>;

type CheckSessionHandler = (token: string) => Promise<PluginEnvelope>;

type ListWorkspacesHandler = (token: string) => Promise<PluginEnvelope>;

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
  readonly list_workspaces: ListWorkspacesHandler;
  readonly list_projects: ListProjectsHandler;
  readonly list_versions: ListVersionsHandler;
  readonly list_folders: ListFoldersHandler;
  readonly create_folder: CreateFolderHandler;
  readonly plan_migration: PlanMigrationHandler;
  readonly execute_migration: ExecuteMigrationHandler;
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
