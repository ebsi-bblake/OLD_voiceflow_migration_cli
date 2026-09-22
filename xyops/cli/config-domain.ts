import { z } from "zod";
import { parseXYOpsURL } from "../voiceflow/urls";
import { MigrationFileConfigSchema, XYOpsEnvironmentSchema } from "./schemas/migration-config";
import type { MigrationExecutionMode, SecretEntries, XYOpsConfig, XYOpsEventConfig, XYOpsEventReference } from "./types";

export type Environment = z.infer<typeof XYOpsEnvironmentSchema>;
export type MigrationFileConfigInput = z.infer<typeof MigrationFileConfigSchema>;
export type MigrationFileConfig = Readonly<{
  sourceWorkspaceID?: string;
  sourceFolderID?: string;
  sourceProjectID?: string;
  sourcePath?: string;
  destinationWorkspaceID?: string;
  destinationFolderID?: string;
  destinationPath?: string;
  sourceVersionID?: string;
  targetSchemaVersion?: string;
  secrets?: string | SecretEntries;
}>;

export class ConfigDomainError extends Error {
  readonly nextAction: string;

  constructor(nextAction: string) {
    super(nextAction);
    this.name = "ConfigDomainError";
    this.nextAction = nextAction;
  }
}

export const DEFAULT_HTTP_TIMEOUT_MS = 15_000;
export const DEFAULT_POLL_INTERVAL_MS = 1_000;
export const DEFAULT_POLL_TIMEOUT_MS = 300_000;
export const DEFAULT_STREAM_MAX_BYTES = 1_048_576;
export const DEFAULT_STREAM_MAX_FRAME_BYTES = 256_000;
export const DEFAULT_XYOPS_BASE_URL = "http://localhost:5522";

const DEFAULT_EVENT_TITLES = {
  migrationWorkflow: "Voiceflow Migration Workflow",
  executionWorkflow: "Voiceflow Migration Execution Workflow",
  checkSession: "voiceflow_check_session",
  listWorkspaces: "voiceflow_list_workspaces",
  listProjects: "voiceflow_list_projects",
  listVersions: "voiceflow_list_versions",
  listFolders: "voiceflow_list_folders",
  createFolder: "voiceflow_create_folder",
  planMigration: "voiceflow_plan_migration",
  executeMigration: "voiceflow_execute_migration",
} as const;

const readTrimmedEnvironment = (environment: Environment, name: string): string | undefined =>
  environment[name]?.trim();

const requiredEnvironment = (environment: Environment, name: string): string => {
  const value = readTrimmedEnvironment(environment, name);
  if (!value) throw new ConfigDomainError(`${name} is not configured.`);
  return value;
};

type EventReferenceParser = (value: string, name: string) => XYOpsEventReference;
const parseEventId: EventReferenceParser = (value, name) => {
  if (!value) throw new ConfigDomainError(`${name} must include an event ID.`);
  return { id: value };
};
const parseEventTitle: EventReferenceParser = (value, name) => {
  if (!value) throw new ConfigDomainError(`${name} must include an event title.`);
  return { title: value };
};
const EVENT_REFERENCE_PARSERS: Readonly<Record<string, EventReferenceParser>> = {
  "": parseEventId,
  "id:": parseEventId,
  "title:": parseEventTitle,
};
const EVENT_REFERENCE_PREFIXES = ["id:", "title:"] as const;

const readEventReference = (
  environment: Environment,
  name: string,
  fallback: string,
): XYOpsEventReference => {
  const value = readTrimmedEnvironment(environment, name);
  if (!value) return { title: fallback };
  if (
    value.includes(":") &&
    !EVENT_REFERENCE_PREFIXES.some((prefix) => value.startsWith(prefix))
  )
    throw new ConfigDomainError(`${name} must use title:<event-title> or id:<event-id>.`);
  const prefix = EVENT_REFERENCE_PREFIXES.find((candidate) => value.startsWith(candidate)) ?? "";
  return EVENT_REFERENCE_PARSERS[prefix](value.slice(prefix.length).trim(), name);
};

const parseDuration = (raw: string, name: string): number => {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 3_600_000)
    throw new ConfigDomainError(`${name} must be a positive duration.`);
  return Math.floor(value);
};

const readDuration = (environment: Environment, name: string, fallback: number): number => {
  const raw = readTrimmedEnvironment(environment, name);
  return raw ? parseDuration(raw, name) : fallback;
};

const readMigrationMode = (environment: Environment): MigrationExecutionMode => {
  const value = readTrimmedEnvironment(environment, "XYOPS_MIGRATION_MODE") ?? "workflow";
  if (value === "events" || value === "workflow") return value;
  throw new ConfigDomainError("XYOPS_MIGRATION_MODE must be events or workflow.");
};

const readBaseURL = (environment: Environment): string => {
  const value = readTrimmedEnvironment(environment, "XYOPS_BASE_URL") || DEFAULT_XYOPS_BASE_URL;
  try {
    return parseXYOpsURL(value);
  } catch {
    throw new ConfigDomainError(
      "XYOPS_BASE_URL must be a valid HTTP URL without credentials or fragments.",
    );
  }
};

// eslint-disable-next-line complexity
export const mapXYOpsEnvironment = (environment: unknown): XYOpsConfig => {
  const parsed = XYOpsEnvironmentSchema.safeParse(environment);
  if (!parsed.success)
    throw new ConfigDomainError("The process environment contains invalid values.");
  const values = parsed.data;
  const events: XYOpsEventConfig = {
    checkSession: readEventReference(values, "XYOPS_EVENT_CHECK_SESSION", DEFAULT_EVENT_TITLES.checkSession),
    listWorkspaces: readEventReference(values, "XYOPS_EVENT_LIST_WORKSPACES", DEFAULT_EVENT_TITLES.listWorkspaces),
    listProjects: readEventReference(values, "XYOPS_EVENT_LIST_PROJECTS", DEFAULT_EVENT_TITLES.listProjects),
    listVersions: readEventReference(values, "XYOPS_EVENT_LIST_VERSIONS", DEFAULT_EVENT_TITLES.listVersions),
    listFolders: readEventReference(values, "XYOPS_EVENT_LIST_FOLDERS", DEFAULT_EVENT_TITLES.listFolders),
    createFolder: readEventReference(values, "XYOPS_EVENT_CREATE_FOLDER", DEFAULT_EVENT_TITLES.createFolder),
    planMigration: readEventReference(values, "XYOPS_EVENT_PLAN_MIGRATION", DEFAULT_EVENT_TITLES.planMigration),
    executeMigration: readEventReference(values, "XYOPS_EVENT_EXECUTE_MIGRATION", DEFAULT_EVENT_TITLES.executeMigration),
  };
  return {
    baseURL: readBaseURL(values),
    apiKey: requiredEnvironment(values, "XYOPS_API_KEY"),
    migrationMode: readMigrationMode(values),
    migrationWorkflow: readEventReference(
      values,
      "XYOPS_WORKFLOW_MIGRATION",
      DEFAULT_EVENT_TITLES.migrationWorkflow,
    ),
    executionWorkflow: readEventReference(
      values,
      "XYOPS_WORKFLOW_EXECUTION",
      DEFAULT_EVENT_TITLES.executionWorkflow,
    ),
    events,
    httpTimeoutMs: readDuration(values, "XYOPS_HTTP_TIMEOUT_MS", DEFAULT_HTTP_TIMEOUT_MS),
    pollIntervalMs: readDuration(values, "XYOPS_POLL_INTERVAL_MS", DEFAULT_POLL_INTERVAL_MS),
    pollTimeoutMs: readDuration(values, "XYOPS_POLL_TIMEOUT_MS", DEFAULT_POLL_TIMEOUT_MS),
    streamMaxBytes: readDuration(values, "XYOPS_STREAM_MAX_BYTES", DEFAULT_STREAM_MAX_BYTES),
    streamMaxFrameBytes: readDuration(values, "XYOPS_STREAM_MAX_FRAME_BYTES", DEFAULT_STREAM_MAX_FRAME_BYTES),
  };
};

type MigrationStringField = readonly [
  keyof Omit<MigrationFileConfigInput, "secrets">,
  keyof Omit<MigrationFileConfig, "secrets">,
];
const MIGRATION_STRING_FIELDS: readonly MigrationStringField[] = [
  ["source_workspace", "sourceWorkspaceID"],
  ["source_folder", "sourceFolderID"],
  ["source_project", "sourceProjectID"],
  ["source_path", "sourcePath"],
  ["source_version", "sourceVersionID"],
  ["destination_workspace", "destinationWorkspaceID"],
  ["destination_folder", "destinationFolderID"],
  ["destination_path", "destinationPath"],
  ["target_schema_version", "targetSchemaVersion"],
];

const parseConfiguredStrings = (value: MigrationFileConfigInput): MigrationFileConfig => {
  const mapped = MIGRATION_STRING_FIELDS.reduce<MigrationFileConfig>(
    (config, [input, output]) =>
      value[input] === undefined ? config : { ...config, [output]: value[input] },
    {},
  );
  return value.secrets === undefined ? mapped : { ...mapped, secrets: value.secrets };
};

export const parseMigrationFileConfig = (value: unknown): MigrationFileConfig => {
  const parsed = MigrationFileConfigSchema.safeParse(value);
  if (!parsed.success)
    throw new ConfigDomainError("The migration config contains invalid field values.");
  return parseConfiguredStrings(parsed.data);
};
