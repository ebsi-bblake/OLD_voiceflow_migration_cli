import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { projectOptions, versionOptions } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type SourceResolvedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "SOURCE_RESOLVED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<SourceResolvedResult>>;
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const readWorkflowData = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const voiceflow = value.voiceflow;
  return isRecord(voiceflow) ? voiceflow.result : value;
};
const normalize = (value: string): string => value.normalize("NFC").trim().toLowerCase();
const readConfiguredProject = (config: RecordValue): string | undefined => {
  if (typeof config.source_project === "string") return config.source_project;
  if (typeof config.source_path !== "string") return undefined;
  return config.source_path.split("/").slice(1).join("/");
};
const resolveOption = (value: string | undefined, options: readonly { value: string; label: string }[]): string => {
  if (value === undefined || value.trim() === "") throw new OperationFault("CONFIGURATION");
  const exact = options.find((option) => option.value === value);
  if (exact !== undefined) return exact.value;
  const matches = options.filter((option) => normalize(option.label) === normalize(value));
  if (matches.length !== 1) throw new OperationFault("CONFIGURATION");
  return matches[0].value;
};
const readConfiguredVersion = (config: RecordValue, options: readonly { value: string; label: string }[]): string => {
  if (typeof config.source_version === "string") return resolveOption(config.source_version, options);
  const development = options.find((option) => option.label.includes("[Draft]") && option.label.includes("— Development"));
  if (development !== undefined) return development.value;
  throw new OperationFault("CONFIGURATION");
};

export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "SOURCE_CATALOG_LOADED") throw new OperationFault("INVALID_ARGUMENT");
    const { config, catalog, selection } = parsed.data;
    const projects = projectOptions(selection.sourceWorkspaceID, catalog.sourceFolders)(catalog.sourceProjects);
    const sourceProjectID = resolveOption(readConfiguredProject(config), projects);
    const versions = versionOptions(selection.sourceWorkspaceID, sourceProjectID)(catalog.sourceProjects);
    const sourceVersionID = readConfiguredVersion(config, versions);
    return success("resolve_source_selection", id, {
      schemaVersion: 1,
      stage: "SOURCE_RESOLVED",
      config,
      catalog,
      selection: { ...selection, sourceProjectID, sourceVersionID },
    });
  } catch (error) {
    return failure("resolve_source_selection", id, error);
  }
};
