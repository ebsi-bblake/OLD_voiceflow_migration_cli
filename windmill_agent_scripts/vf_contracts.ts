export const VoiceflowOperation = {
  CheckSession: "check_session",
  ListWorkspaces: "list_workspaces",
  ListProjects: "list_projects",
  ListVersions: "list_versions",
  ListFolders: "list_folders",
  PlanMigration: "plan_migration",
  ExecuteMigration: "execute_migration",
} as const;
export type VoiceflowOperation =
  (typeof VoiceflowOperation)[keyof typeof VoiceflowOperation];

export const ErrorCode = {
  InvalidArgument: "INVALID_ARGUMENT",
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
  NotIdempotent: "NOT_IDEMPOTENT",
  ApiKeyRetrievalFailed: "API_KEY_RETRIEVAL_FAILED",
} as const;
export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];
export type Warning = { code: WarningCode; message: string };
export type OperationError = {
  code: ErrorCode;
  message: string;
  retryable: boolean;
};
export type Success<T> = {
  ok: true;
  operation: VoiceflowOperation;
  operationID: string;
  result: T;
  warnings: Warning[];
};
export type Failure = {
  ok: false;
  operation: VoiceflowOperation;
  operationID: string;
  error: OperationError;
};
export type Envelope<T> = Success<T> | Failure;
export type MigrationSelection = {
  sourceWorkspaceID: string;
  sourceProjectID: string;
  sourceVersionID: string;
  destinationWorkspaceID: string;
  destinationFolderID: string;
  targetSchemaVersion?: string;
};
export type MigrationPlan = {
  planID: string;
  selection: MigrationSelection;
  labels: {
    sourceWorkspace: string;
    sourceProject: string;
    sourceVersion: string;
    destinationWorkspace: string;
    destinationFolder: string;
  };
};
export type ConfigSecret = {
  type: "projectId" | "" | "url";
  key: string;
  value: string;
};
export type SecretEntry = { name: string; value: string };

export type ImportedReceipt = {
  importStatus: number;
  importBytes: number;
  projectID: string;
  assistantID?: string;
  workspaceID?: string;
  folderID?: string;
};

const messages: Record<ErrorCode, string> = {
  INVALID_ARGUMENT: "The supplied arguments are invalid.",
  AUTHENTICATION_FAILED: "Authentication failed.",
  VOICEFLOW_LOGIN_REQUIRED: "Voiceflow login is required.",
  NOT_FOUND: "The requested Voiceflow resource was not found.",
  DEPENDENCY_TIMEOUT: "The Voiceflow dependency timed out.",
  DEPENDENCY_FAILURE: "The Voiceflow dependency failed.",
  PLAN_MISMATCH: "The migration plan does not match the requested operation.",
  CONFIRMATION_REQUIRED: "User confirmation is required before migration.",
  IMPORT_OUTCOME_UNKNOWN:
    "Import outcome is unknown; reconcile before retrying.",
  INTERNAL_ERROR: "The operation could not be completed.",
};

export class OperationFault extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly retryable = false,
  ) {
    super(messages[code]);
  }
}

export function toOperationError(error: unknown): OperationError {
  if (error instanceof OperationFault) {
    return {
      code: error.code,
      message: messages[error.code],
      retryable: error.retryable,
    };
  }
  return {
    code: "INTERNAL_ERROR",
    message: messages.INTERNAL_ERROR,
    retryable: false,
  };
}

export function success<T>(
  operation: VoiceflowOperation,
  operationID: string,
  result: T,
  warnings: Warning[] = [],
): Success<T> {
  return { ok: true, operation, operationID, result, warnings };
}

export function failure(
  operation: VoiceflowOperation,
  operationID: string,
  error: unknown,
): Failure {
  return { ok: false, operation, operationID, error: toOperationError(error) };
}
