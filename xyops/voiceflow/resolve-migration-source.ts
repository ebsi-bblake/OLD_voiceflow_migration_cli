import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { projectOptions, versionOptions } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type SourceResolvedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "SOURCE_RESOLVED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<SourceResolvedResult>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
const normalize = (value: string): string => value.normalize("NFC").trim().toLowerCase();
const normalizeProjectLabel = (value: string): string =>
  normalize(value.replace(/\s+\([^()]+\)$/u, ""));
const readConfiguredProject = (config: { source_project?: string; source_path?: string }): string | undefined =>
  config.source_project ?? config.source_path?.split("/").slice(1).join("/");
const sourceResolutionContext = (
  config: { source_workspace?: string; source_project?: string; source_path?: string; source_version?: string },
  configuredField: string,
  configuredValue: string | undefined,
  options: readonly { value: string; label: string }[],
) => ({
  configuredSelection: config,
  [configuredField]: configuredValue === undefined ? undefined : normalize(configuredValue),
  candidateCount: options.length,
  candidateLabels: options.map((option) => option.label).slice(0, 20),
});
const resolveProjectOption = (
  config: { source_workspace?: string; source_project?: string; source_path?: string; source_version?: string },
  value: string | undefined,
  options: readonly { value: string; label: string }[],
): string => {
  if (value === undefined || value.trim() === "")
    throw new OperationFault("CONFIGURATION", false, "source-project-resolution-mismatch", {
      stage: "source-resolution",
      context: sourceResolutionContext(config, "configuredProject", value, options),
    });
  const exact = options.find((option) => option.value === value);
  if (exact !== undefined) return exact.value;
  const normalizedValue = normalize(value);
  const matches = options.filter((option) => normalizeProjectLabel(option.label) === normalizedValue);
  if (matches.length === 1) return matches[0].value;
  throw new OperationFault(
    "CONFIGURATION",
    false,
    "source-project-resolution-mismatch",
    {
      stage: "source-resolution",
      context: sourceResolutionContext(config, "configuredProject", value, options),
    },
  );
};
const readConfiguredVersion = (
  config: { source_workspace?: string; source_project?: string; source_path?: string; source_version?: string },
  options: readonly { value: string; label: string }[],
): string => {
  if (config.source_version !== undefined) {
    const exact = options.find((option) => option.value === config.source_version);
    const matches = options.filter((option) => normalize(option.label) === normalize(config.source_version ?? ""));
    if (exact !== undefined) return exact.value;
    if (matches.length === 1) return matches[0].value;
    throw new OperationFault("CONFIGURATION", false, "source-version-resolution-mismatch", {
      stage: "source-resolution",
      context: sourceResolutionContext(config, "configuredVersion", config.source_version, options),
    });
  }
  const development = options.find((option) => option.label.includes("[Draft]") && option.label.includes("— Development"));
  if (development !== undefined) return development.value;
  throw new OperationFault("CONFIGURATION", false, "source-version-resolution-mismatch", {
    stage: "source-resolution",
    context: sourceResolutionContext(config, "configuredVersion", undefined, options),
  });
};

export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "SOURCE_CATALOG_LOADED") throw new OperationFault("INVALID_ARGUMENT");
    const { config, catalog, selection } = parsed.data;
    const projects = projectOptions(selection.sourceWorkspaceID, catalog.sourceFolders)(catalog.sourceProjects);
    const sourceProjectID = resolveProjectOption(config, readConfiguredProject(config), projects);
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
