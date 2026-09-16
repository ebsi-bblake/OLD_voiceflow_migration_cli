import { readFile } from "node:fs/promises";
import { resolveConfiguredFilePath } from "./file-path";
import { fail } from "./diagnostics";
import { isInvalidDuration } from "./guards";
import { parseXYOpsURL } from "../voiceflow/urls";
import { parseSecretEntries } from "../voiceflow/secrets";
import {
  parseResourceSelection,
  parseSchemaVersion,
} from "../voiceflow/validation";
import type {
  SecretEntries,
  XYOpsConfig,
  XYOpsEventConfig,
  XYOpsEventReference,
} from "./types";
export type {
  XYOpsConfig,
  XYOpsEventConfig,
  XYOpsEventReference,
} from "./types";

/** The file contract deliberately uses snake_case to match the CLI config file. */
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
  /** Local/network path to a JSON secret array, or an inline secret array. */
  secrets?: string | SecretEntries;
}>;

export const DEFAULT_HTTP_TIMEOUT_MS = 15_000;
export const DEFAULT_POLL_INTERVAL_MS = 1_000;
export const DEFAULT_POLL_TIMEOUT_MS = 300_000;
export const DEFAULT_STREAM_MAX_BYTES = 1_048_576;
export const DEFAULT_STREAM_MAX_FRAME_BYTES = 256_000;
export const DEFAULT_XYOPS_BASE_URL = "http://localhost:5522";

const DEFAULT_EVENT_TITLES = {
  checkSession: "voiceflow_check_session",
  listWorkspaces: "voiceflow_list_workspaces",
  listProjects: "voiceflow_list_projects",
  listVersions: "voiceflow_list_versions",
  listFolders: "voiceflow_list_folders",
  createFolder: "voiceflow_create_folder",
  planMigration: "voiceflow_plan_migration",
  executeMigration: "voiceflow_execute_migration",
} as const;

type Environment = Readonly<Record<string, string | undefined>>;

type ReadTrimmedEnvironment = (
  environment: Environment,
  name: string,
) => string;
const readTrimmedEnvironment: ReadTrimmedEnvironment = (environment, name) =>
  (environment[name] ?? "").trim();

type RequiredEnvironment = (environment: Environment, name: string) => string;
const requiredEnvironment: RequiredEnvironment = (environment, name) => {
  const value = readTrimmedEnvironment(environment, name);
  if (!value)
    throw fail("configuration", { nextAction: `${name} is not configured.` });
  return value;
};

type EventReferenceParser = (
  value: string,
  name: string,
) => XYOpsEventReference;
type ParseEventId = EventReferenceParser;
const parseEventId: ParseEventId = (value, name) => {
  if (!value)
    throw fail("configuration", {
      nextAction: `${name} must include an event ID.`,
    });
  return { id: value };
};
type ParseEventTitle = EventReferenceParser;
const parseEventTitle: ParseEventTitle = (value, name) => {
  if (!value)
    throw fail("configuration", {
      nextAction: `${name} must include an event title.`,
    });
  return { title: value };
};
const EVENT_REFERENCE_PARSERS: Readonly<Record<string, EventReferenceParser>> =
  {
    "": parseEventId,
    "id:": parseEventId,
    "title:": parseEventTitle,
  };
const EVENT_REFERENCE_PREFIXES = ["id:", "title:"] as const;
type FindEventReferencePrefix = (value: string) => string;
const findEventReferencePrefix: FindEventReferencePrefix = (value) =>
  EVENT_REFERENCE_PREFIXES.find((prefix) => value.startsWith(prefix)) ?? "";

const hasUnsupportedEventReferencePrefix = (value: string): boolean =>
  value.includes(":") &&
  !EVENT_REFERENCE_PREFIXES.some((prefix) => value.startsWith(prefix));

type ReadEventReference = (
  environment: Environment,
  name: string,
  fallback: string,
) => XYOpsEventReference;
const readEventReference: ReadEventReference = (
  environment,
  name,
  fallback,
) => {
  const value = readTrimmedEnvironment(environment, name);
  if (!value) return { title: fallback };
  if (hasUnsupportedEventReferencePrefix(value))
    throw fail("configuration", {
      nextAction: `${name} must use title:<event-title> or id:<event-id>.`,
    });
  const prefix = findEventReferencePrefix(value);
  return EVENT_REFERENCE_PARSERS[prefix](
    value.slice(prefix.length).trim(),
    name,
  );
};

type PositiveMilliseconds = (
  environment: Environment,
  name: string,
  fallback: number,
) => number;
const positiveMilliseconds: PositiveMilliseconds = (
  environment,
  name,
  fallback,
) => {
  const raw = readTrimmedEnvironment(environment, name);
  return raw ? parseDuration(raw, name) : fallback;
};

type ValidateDuration = (value: number, name: string) => void;
const validateDuration: ValidateDuration = (value, name) => {
  if (isInvalidDuration(value))
    throw fail("configuration", {
      nextAction: `${name} must be a positive duration.`,
    });
};

type ParseDuration = (raw: string, name: string) => number;
const parseDuration: ParseDuration = (raw, name) => {
  const value = Number(raw);
  validateDuration(value, name);
  return Math.floor(value);
};

type NormalizeBaseURL = (value: string) => string;
const normalizeBaseURL: NormalizeBaseURL = (value) => {
  try {
    return parseXYOpsURL(value);
  } catch {
    throw fail("configuration", {
      nextAction:
        "XYOPS_BASE_URL must be a valid HTTP URL without credentials or fragments.",
    });
  }
};

type ReadBaseURL = (environment: Environment) => string;
const readBaseURL: ReadBaseURL = (environment) =>
  normalizeBaseURL(
    readTrimmedEnvironment(environment, "XYOPS_BASE_URL") ||
      DEFAULT_XYOPS_BASE_URL,
  );

type ReadEventConfig = (environment: Environment) => XYOpsEventConfig;
const readEventConfig: ReadEventConfig = (environment) => ({
  checkSession: readEventReference(
    environment,
    "XYOPS_EVENT_CHECK_SESSION",
    DEFAULT_EVENT_TITLES.checkSession,
  ),
  listWorkspaces: readEventReference(
    environment,
    "XYOPS_EVENT_LIST_WORKSPACES",
    DEFAULT_EVENT_TITLES.listWorkspaces,
  ),
  listProjects: readEventReference(
    environment,
    "XYOPS_EVENT_LIST_PROJECTS",
    DEFAULT_EVENT_TITLES.listProjects,
  ),
  listVersions: readEventReference(
    environment,
    "XYOPS_EVENT_LIST_VERSIONS",
    DEFAULT_EVENT_TITLES.listVersions,
  ),
  listFolders: readEventReference(
    environment,
    "XYOPS_EVENT_LIST_FOLDERS",
    DEFAULT_EVENT_TITLES.listFolders,
  ),
  createFolder: readEventReference(
    environment,
    "XYOPS_EVENT_CREATE_FOLDER",
    DEFAULT_EVENT_TITLES.createFolder,
  ),
  planMigration: readEventReference(
    environment,
    "XYOPS_EVENT_PLAN_MIGRATION",
    DEFAULT_EVENT_TITLES.planMigration,
  ),
  executeMigration: readEventReference(
    environment,
    "XYOPS_EVENT_EXECUTE_MIGRATION",
    DEFAULT_EVENT_TITLES.executeMigration,
  ),
});

type ReadDurations = (environment: Environment) => Readonly<{
  httpTimeoutMs: number;
  pollIntervalMs: number;
  pollTimeoutMs: number;
  streamMaxBytes: number;
  streamMaxFrameBytes: number;
}>;
const readDurations: ReadDurations = (environment) => ({
  httpTimeoutMs: positiveMilliseconds(
    environment,
    "XYOPS_HTTP_TIMEOUT_MS",
    DEFAULT_HTTP_TIMEOUT_MS,
  ),
  pollIntervalMs: positiveMilliseconds(
    environment,
    "XYOPS_POLL_INTERVAL_MS",
    DEFAULT_POLL_INTERVAL_MS,
  ),
  pollTimeoutMs: positiveMilliseconds(
    environment,
    "XYOPS_POLL_TIMEOUT_MS",
    DEFAULT_POLL_TIMEOUT_MS,
  ),
  streamMaxBytes: positiveMilliseconds(
    environment,
    "XYOPS_STREAM_MAX_BYTES",
    DEFAULT_STREAM_MAX_BYTES,
  ),
  streamMaxFrameBytes: positiveMilliseconds(
    environment,
    "XYOPS_STREAM_MAX_FRAME_BYTES",
    DEFAULT_STREAM_MAX_FRAME_BYTES,
  ),
});

type ReadXYOpsConfig = (environment?: Environment) => XYOpsConfig;
export const readXYOpsConfig: ReadXYOpsConfig = (
  environment = process.env,
) => ({
  baseURL: readBaseURL(environment),
  apiKey: requiredEnvironment(environment, "XYOPS_API_KEY"),
  events: readEventConfig(environment),
  ...readDurations(environment),
});

type ConfigFileRecord = Record<string, unknown>;
const CONFIG_KEYS = new Set([
  "source_workspace",
  "source_folder",
  "source_project",
  "source_path",
  "source_version",
  "destination_workspace",
  "destination_folder",
  "destination_path",
  "target_schema_version",
  "secrets",
]);

type IsRecord = (value: unknown) => value is ConfigFileRecord;
const isRecord: IsRecord = (value): value is ConfigFileRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ValidateConfigArguments = () => void;
const validateConfigArguments: ValidateConfigArguments = () => {
  const legacyArgument = process.argv.find((argument) =>
    argument.startsWith("--secrets="),
  );
  if (legacyArgument)
    throw fail("configuration", {
      nextAction:
        "--secrets is unsupported; provide secrets in --config=<path>.",
    });
};

type ReadConfigArgument = () => string | undefined;
const readConfigArgument: ReadConfigArgument = () =>
  process.argv.find((argument) => argument.startsWith("--config="))?.slice(9);

type ParseConfigString = (value: unknown, key: string) => string;
const parseConfigString: ParseConfigString = (value, key) => {
  if (typeof value !== "string" || !value.trim())
    throw fail("configuration", {
      nextAction: `${key} must be a non-empty string.`,
    });
  return value.trim();
};

type ConfigFieldParser = (value: unknown) => string;

type ParseResourcePath = (value: unknown) => string;
const parseResourcePath: ParseResourcePath = (value) => {
  if (typeof value !== "string")
    throw new Error("path must be a string");
  const segments = value.split("/").map((segment) => segment.trim());
  if (segments.some((segment) => {
    try {
      parseResourceSelection(segment);
      return false;
    } catch {
      return true;
    }
  }))
    throw new Error("path contains an invalid segment");
  return value.trim();
};

type ReadConfiguredSecrets = (value: unknown) => string | SecretEntries;
const readConfiguredSecrets: ReadConfiguredSecrets = (value) => {
  if (typeof value === "string") return parseConfigString(value, "secrets");
  if (Array.isArray(value)) {
    try {
      return parseSecretEntries(value);
    } catch {
      throw fail("configuration", {
        nextAction: "The inline secrets must be a valid secret entry array.",
      });
    }
  }
  throw fail("configuration", {
    nextAction: "secrets must be a file path or a secret entry array.",
  });
};

type MigrationStringField = readonly [
  input: string,
  output: keyof Omit<MigrationFileConfig, "secrets">,
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

type ParseConfiguredStrings = (
  value: ConfigFileRecord,
) => Partial<Omit<MigrationFileConfig, "secrets">>;
const parseConfiguredStrings: ParseConfiguredStrings = (value) =>
  MIGRATION_STRING_FIELDS.reduce(
    (config, [input, output]) =>
      value[input] === undefined
        ? config
        : { ...config, [output]: parseConfigString(value[input], input) },
    {},
  );

type ParseMigrationFileConfig = (value: unknown) => MigrationFileConfig;
const parseMigrationFileConfig: ParseMigrationFileConfig = (value) => {
  if (!isRecord(value))
    throw fail("configuration", {
      nextAction: "The migration config must contain one JSON object.",
    });
  const unknownKey = Object.keys(value).find((key) => !CONFIG_KEYS.has(key));
  if (unknownKey)
    throw fail("configuration", {
      nextAction: `The migration config contains unsupported field '${unknownKey}'.`,
    });
  return {
    ...parseConfiguredStrings(value),
    ...(value.secrets === undefined
      ? {}
      : { secrets: readConfiguredSecrets(value.secrets) }),
  };
};

type ValidateMigrationFileConfig = (
  config: MigrationFileConfig | undefined,
) => void;
export const validateMigrationFileConfig: ValidateMigrationFileConfig = (
  config,
) => {
  if (config === undefined) return;
  const fields: readonly (readonly [
    keyof MigrationFileConfig,
    string,
    ConfigFieldParser,
  ])[] = [
    ["sourceWorkspaceID", "source_workspace", parseResourceSelection],
    ["sourceFolderID", "source_folder", parseResourceSelection],
    ["sourceProjectID", "source_project", parseResourceSelection],
    ["sourcePath", "source_path", parseResourcePath],
    ["sourceVersionID", "source_version", parseResourceSelection],
    ["destinationWorkspaceID", "destination_workspace", parseResourceSelection],
    ["destinationFolderID", "destination_folder", parseResourceSelection],
    ["destinationPath", "destination_path", parseResourcePath],
    ["targetSchemaVersion", "target_schema_version", parseSchemaVersion],
  ];
  fields.forEach(([property, name, parser]) => {
    const value = config[property];
    if (value === undefined) return;
    try {
      parser(value);
    } catch {
      throw fail("configuration", {
        nextAction: `${name} must be a non-empty path-safe string, with no control characters or excessive length.`,
      });
    }
  });
};

type ReadMigrationFileConfig = (
  path?: string,
) => Promise<MigrationFileConfig | undefined>;
export const readMigrationFileConfig: ReadMigrationFileConfig = async (
  path,
) => {
  validateConfigArguments();
  const configPath = path ?? readConfigArgument();
  if (configPath === undefined || configPath.trim() === "") return undefined;
  let contents: string;
  try {
    contents = await readFile(
      resolveConfiguredFilePath(configPath, process.platform),
      "utf8",
    );
  } catch {
    throw fail("configuration", {
      nextAction: "Unable to read the migration config file.",
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw fail("configuration", {
      nextAction: "The configuration JSON cannot be parsed.",
    });
  }
  return parseMigrationFileConfig(parsed);
};
