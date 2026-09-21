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
const resolveOption = (value: string | undefined, options: readonly { value: string; label: string }[]): string => {
  if (value === undefined || value.trim() === "") throw new OperationFault("CONFIGURATION");
  const exact = options.find((option) => option.value === value);
  if (exact !== undefined) return exact.value;
  const matches = options.filter((option) => normalize(option.label) === normalize(value));
  if (matches.length !== 1) throw new OperationFault("CONFIGURATION");
  return matches[0].value;
};
const resolveProjectOption = (value: string | undefined, options: readonly { value: string; label: string }[]): string => {
  if (value === undefined || value.trim() === "") throw new OperationFault("CONFIGURATION");
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
      context: {
        configuredProject: normalizedValue,
        candidateCount: options.length,
        candidateLabels: options.map((option) => option.label).slice(0, 20),
      },
    },
  );
};
const readConfiguredVersion = (config: { source_version?: string }, options: readonly { value: string; label: string }[]): string => {
  if (config.source_version !== undefined) return resolveOption(config.source_version, options);
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
    const sourceProjectID = resolveProjectOption(readConfiguredProject(config), projects);
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
