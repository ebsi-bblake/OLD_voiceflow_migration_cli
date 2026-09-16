export type Option = Readonly<{ value: string; label: string }>;
export type MigrationSelection = Readonly<{
  sourceWorkspaceID: string;
  sourceProjectID: string;
  sourceVersionID: string;
  destinationWorkspaceID: string;
  destinationFolderID: string;
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
export type VoiceflowWarning = Readonly<{ code: string; message: string }>;
export type VoiceflowSuccess<T> = Readonly<{
  ok: true;
  operation: string;
  operationID: string;
  result: T;
  warnings: readonly VoiceflowWarning[];
}>;
export type VoiceflowFailure = Readonly<{
  ok: false;
  operation: string;
  operationID: string;
  error: Readonly<{ code: string; message: string; retryable: boolean }>;
}>;
export type VoiceflowEnvelope<T> = VoiceflowSuccess<T> | VoiceflowFailure;
export type ResponseGuard<T> = (value: unknown) => value is T;
export type XYOpsResponse = Readonly<{
  code: number | string;
  description?: string;
  id?: string;
  job?: unknown;
  data?: unknown;
}>;
export type NativePluginResponse = Readonly<{
  xy: 1;
  complete: true;
  code: number | string;
  data: Readonly<{ voiceflow: unknown }>;
}>;
export type XYOpsLaunchResponse = XYOpsResponse & Readonly<{ id: string }>;
export const XYOpsStreamEventType = {
  Start: "start",
  Update: "update",
  End: "end",
} as const;
export type XYOpsStreamEventType =
  (typeof XYOpsStreamEventType)[keyof typeof XYOpsStreamEventType];
export type XYOpsStreamEvent = Readonly<{
  type: XYOpsStreamEventType;
  data: Record<string, unknown>;
}>;
export type XYOpsStreamLimits = Readonly<{
  maxBytes?: number;
  maxFrameBytes?: number;
}>;
export type XYOpsStreamJob = (
  fetcher: typeof fetch,
  baseURL: string,
  apiKey: string,
  jobID: string,
  timeoutMs: number,
  limits?: XYOpsStreamLimits,
) => Promise<XYOpsStreamResult>;
export type XYOpsStreamResult =
  | Readonly<{
      kind: "success";
      jobID: string;
      code: number | string;
      data: Record<string, unknown>;
      requiresJobResponse: true;
    }>
  | Readonly<{
      kind: "failure";
      jobID: string;
      code: number | string;
      data: Record<string, unknown>;
      requiresJobResponse: true;
    }>;
// These are the states currently documented by XYOps; unknown server states remain strings and are ignored safely.
export const XYOpsJobState = {
  Active: "active",
  Complete: "complete",
} as const;
export type XYOpsJobState = (typeof XYOpsJobState)[keyof typeof XYOpsJobState];

export type XYOpsJob = Readonly<{
  id?: string;
  state?: string;
  progress?: number;
  completed?: boolean | number | null;
  code?: number | string;
  description?: string;
  output?: string | null;
  data?: unknown;
}>;
export type XYOpsJobResponse = XYOpsResponse &
  Readonly<{ job: XYOpsJob & Readonly<{ id: string }> }>;
export type XYOpsWaitJob = Readonly<{
  id: string;
  code: number | string;
  description?: string;
  output?: string | null;
  data?: unknown;
  completed?: boolean | number | null;
}>;
export type XYOpsWaitResponse = Readonly<{
  code: number | string;
  description?: string;
  job: XYOpsWaitJob;
}>;
export type ExecuteResult = Readonly<{
  planID: string;
  exportStatus: number;
  exportBytes: number;
  importStatus: number;
  importBytes: number;
  selected: MigrationSelection;
  imported: Readonly<{ projectID: string; [key: string]: unknown }>;
  apiKeyRetrieved?: boolean;
}>;
export type ConfigSecret = Readonly<{
  key: string;
  value: string;
  type: "projectId" | "" | "url";
}>;
export type SecretEntry = Readonly<{ name: string; value: string }>;
export type SecretEntries = readonly ConfigSecret[];
export type EventParameterValue = string | boolean | SecretEntries;
export type EventParameters = Readonly<Record<string, EventParameterValue>>;
export type XYOpsEventConfig = Readonly<{
  checkSession: XYOpsEventReference;
  listWorkspaces: XYOpsEventReference;
  listProjects: XYOpsEventReference;
  listVersions: XYOpsEventReference;
  listFolders: XYOpsEventReference;
  createFolder: XYOpsEventReference;
  planMigration: XYOpsEventReference;
  executeMigration: XYOpsEventReference;
}>;
export type XYOpsEventReference =
  | string
  | Readonly<{ id: string }>
  | Readonly<{ title: string }>;
export type XYOpsConfig = Readonly<{
  baseURL: string;
  apiKey: string;
  events: XYOpsEventConfig;
  httpTimeoutMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  streamMaxBytes: number;
  streamMaxFrameBytes: number;
}>;
export type MigrationState = Readonly<{
  sourceWorkspaceID?: string;
  sourceProjectID?: string;
  sourceVersionID?: string;
  destinationWorkspaceID?: string;
  destinationFolderID?: string;
  targetSchemaVersion?: string;
  planID?: string;
}>;
export const CliDiagnosticCode = {
  Configuration: "configuration",
  Network: "network",
  Timeout: "timeout",
  Http: "http",
  Api: "api",
  Envelope: "envelope",
  Job: "job",
  ExecuteOutcomeUnknown: "execute-outcome-unknown",
  InvalidInput: "invalid-input",
  Stream: "stream",
} as const;
export type CliDiagnosticCode =
  (typeof CliDiagnosticCode)[keyof typeof CliDiagnosticCode];
export type CliDiagnostic = Readonly<{
  code: CliDiagnosticCode;
  endpoint: string;
  retryable: boolean;
  status?: number;
  nextAction: string;
}>;
export type XYOpsClient = Readonly<{
  readEvent: <T>(
    eventReference: XYOpsEventReference,
    params: EventParameters,
    envelopeGuard: ResponseGuard<VoiceflowEnvelope<T>>,
  ) => Promise<VoiceflowEnvelope<T>>;
  executeEvent: <T>(
    eventReference: XYOpsEventReference,
    params: EventParameters,
    envelopeGuard: ResponseGuard<VoiceflowEnvelope<T>>,
  ) => Promise<VoiceflowEnvelope<T>>;
}>;
