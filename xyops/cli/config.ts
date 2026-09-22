import { readFile } from "node:fs/promises";
import { resolveConfiguredFilePath } from "./file-path";
import type { XYOpsConfig } from "./types";
import { fail } from "./diagnostics";
import {
  ConfigDomainError,
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
  DEFAULT_STREAM_MAX_BYTES,
  DEFAULT_STREAM_MAX_FRAME_BYTES,
  DEFAULT_XYOPS_BASE_URL,
  mapXYOpsEnvironment,
  parseMigrationFileConfig,
  type Environment,
  type MigrationFileConfig,
} from "./config-domain";

export type {
  Environment,
  MigrationFileConfig,
  MigrationFileConfigInput,
} from "./config-domain";
export type { MigrationExecutionMode, XYOpsConfig, XYOpsEventConfig, XYOpsEventReference } from "./types";

export {
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
  DEFAULT_STREAM_MAX_BYTES,
  DEFAULT_STREAM_MAX_FRAME_BYTES,
  DEFAULT_XYOPS_BASE_URL,
};

export type { SecretEntries } from "./types";

type ConfigurationHandler = (environment: unknown) => XYOpsConfig;
const reportDomainFailure = (error: unknown): never => {
  if (error instanceof ConfigDomainError)
    throw fail("configuration", { nextAction: error.nextAction });
  throw error;
};

export const readXYOpsConfig = (
  environment: Environment = process.env,
  handleConfiguration: ConfigurationHandler = mapXYOpsEnvironment,
): XYOpsConfig => {
  try {
    return handleConfiguration(environment);
  } catch (error: unknown) {
    return reportDomainFailure(error);
  }
};

type MigrationConfigHandler = (value: unknown) => MigrationFileConfig;
const validateConfigArguments = (): void => {
  const legacyArgument = process.argv.find((argument) =>
    argument.startsWith("--secrets="),
  );
  if (legacyArgument)
    throw fail("configuration", {
      nextAction:
        "--secrets is unsupported; provide secrets in --config=<path>.",
    });
};

const readConfigArgument = (): string | undefined =>
  process.argv.find((argument) => argument.startsWith("--config="))?.slice(9);

const readConfigContents = (path: string): Promise<string> =>
  readFile(resolveConfiguredFilePath(path, process.platform), "utf8");

// eslint-disable-next-line complexity
export const readMigrationFileConfig = async (
  path?: string,
  handleConfiguration: MigrationConfigHandler = parseMigrationFileConfig,
): Promise<MigrationFileConfig | undefined> => {
  validateConfigArguments();
  const configPath = path ?? readConfigArgument();
  if (configPath === undefined || configPath.trim() === "") return undefined;

  let contents: string;
  try {
    contents = await readConfigContents(configPath);
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

  try {
    return handleConfiguration(parsed);
  } catch (error: unknown) {
    return reportDomainFailure(error);
  }
};
