import type { Diagnostic } from "../diagnostics/types";

export const VoiceflowOperation = {
  CheckSession: "check_session",
  CheckSessionWorkflow: "check_session_workflow",
  ListWorkspaces: "list_workspaces",
  LoadWorkspaces: "load_workspaces",
  LoadSourceCatalog: "load_source_catalog",
  ResolveSourceSelection: "resolve_source_selection",
  ResolveSourceSchemaWorkflow: "resolve_source_schema_workflow",
  LoadDestinationCatalog: "load_destination_catalog",
  ResolveDestinationSelection: "resolve_destination_selection",
  PlanMigrationWorkflow: "plan_migration_workflow",
  ListProjects: "list_projects",
  ListVersions: "list_versions",
  ListFolders: "list_folders",
  CreateFolder: "create_folder",
  PlanMigration: "plan_migration",
  ExecuteMigration: "execute_migration",
  InitializeMigrationWorkflow: "initialize_migration_workflow",
  InitializeExecutionWorkflow: "initialize_execution_workflow",
  ExecuteMigrationWorkflow: "execute_migration_workflow",
  CreateFolderWorkflow: "create_folder_workflow",
} as const;

export type VoiceflowOperation =
  (typeof VoiceflowOperation)[keyof typeof VoiceflowOperation];

export const ErrorCode = {
  InvalidArgument: "INVALID_ARGUMENT",
  Configuration: "CONFIGURATION",
  AuthenticationFailed: "AUTHENTICATION_FAILED",
  VoiceflowLoginRequired: "VOICEFLOW_LOGIN_REQUIRED",
  NotFound: "NOT_FOUND",
  DependencyTimeout: "DEPENDENCY_TIMEOUT",
  DependencyFailure: "DEPENDENCY_FAILURE",
  PlanMismatch: "PLAN_MISMATCH",
  ConfirmationRequired: "CONFIRMATION_REQUIRED",
  ImportOutcomeUnknown: "IMPORT_OUTCOME_UNKNOWN",
  InternalError: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const WarningCode = {
  ApiKeyRetrievalFailed: "API_KEY_RETRIEVAL_FAILED",
} as const;
export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];
export type Warning = Readonly<{ code: WarningCode; message: string }>;
export type OperationError = Readonly<{
  code: ErrorCode;
  message: string;
  retryable: boolean;
  diagnostic?: Diagnostic;
}>;
export type Success<T> = {
  readonly ok: true;
  readonly operation: VoiceflowOperation;
  readonly operationID: string;
  readonly result: T;
  readonly warnings: readonly Warning[];
};
export type Failure = {
  readonly ok: false;
  readonly operation: VoiceflowOperation;
  readonly operationID: string;
  readonly error: OperationError;
};
export type Envelope<T> = Success<T> | Failure;
export type MigrationSelection = Readonly<{
  sourceWorkspaceID: string;
  sourceProjectID: string;
  sourceVersionID: string;
  destinationWorkspaceID: string;
  destinationFolderID: string;
  targetSchemaVersion?: string;
}>;
export type MigrationPlanIdentity = Readonly<{
  sourceWorkspaceID: string;
  sourceProjectID: string;
  sourceVersionID: string;
  destinationWorkspaceID: string;
  destinationFolderID?: string;
  targetSchemaVersion?: string;
}>;
export type MigrationPlan = Readonly<{
  planID: string;
  selection: MigrationSelection;
  labels: Readonly<{
    sourceWorkspace: string;
    sourceProject: string;
    sourceVersion: string;
    destinationWorkspace: string;
    destinationFolder: string;
  }>;
}>;
export type ImportedReceipt = Readonly<{
  importStatus: number;
  importBytes: number;
  projectID: string;
  assistantID?: string;
  versionID?: string;
  workspaceID?: string;
  folderID?: string;
}>;
export type ExistingSecret = Readonly<{
  id: string;
  assistantID: string;
  name: string;
  visibility: "masked" | "restricted";
  hasValue: boolean;
}>;
export type AuthContext = Readonly<{ token: string; creatorID: string }>;
export type ConfigSecret = Readonly<{
  key: string;
  value: string;
  type: "projectId" | "" | "url";
}>;
export type SecretEntry = Readonly<{ name: string; value: string }>;
export type ApiKeyDiagnostic = Readonly<{ code: string; message: string }>;
export type ApiKeyStatus =
  | { readonly apiKeyRetrieved: true; readonly postImport?: never }
  | {
      readonly apiKeyRetrieved: false;
      readonly postImport: {
        readonly apiKeyRetrieved: false;
        readonly diagnostic: ApiKeyDiagnostic;
      };
    };
export type RequestBytesInput = Readonly<{
  url: string;
  init?: RequestInit;
  maxBytes: number;
  timeoutMs: number;
}>;
export type HttpBytes = Readonly<{
  status: number;
  headers: Headers;
  bytes: ArrayBuffer;
}>;
export type ExportArtifact = Readonly<{
  status: number;
  bytes: ArrayBuffer;
  filename: string;
  contentType: string;
}>;
export type Option = Readonly<{ value: string; label: string }>;
export type WorkspaceRecord = Readonly<{ id: string; label: string }>;
export type EnvironmentRecord = Readonly<{
  label: string;
  draftVersionID?: string;
  publishedVersionID?: string;
}>;
export type ProjectRecord = Readonly<{
  id: string;
  label: string;
  workspaceID: string;
  folderID?: string;
  environments: readonly EnvironmentRecord[];
}>;
export type FolderRecord = Readonly<{
  id: string;
  label: string;
  workspaceID: string;
  parentID?: string;
}>;
export type ExecuteResult = Readonly<{
  planID: string;
  exportStatus: number;
  exportBytes: number;
  importStatus: number;
  importBytes: number;
  selected: MigrationSelection;
  imported: ImportedReceipt;
  apiKeyRetrieved?: boolean;
  postImport?: ApiKeyStatus["postImport"];
}>;
