import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { folderOptions } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type DestinationResolvedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "DESTINATION_RESOLVED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<DestinationResolvedResult>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
const normalize = (value: string): string => value.normalize("NFC").trim().toLowerCase();
const normalizeFolderLabel = (value: string): string =>
  normalize(value.replace(/\s+\([^()]+\)$/u, ""));
const configuredFolder = (config: { destination_folder?: string; destination_path?: string }): string | undefined =>
  config.destination_folder ?? config.destination_path?.split("/").slice(1).join("/");
type FolderResolution = Readonly<{
  readonly destinationFolderID?: string;
  readonly destinationFolderCreation?: Readonly<{
    readonly workspaceID: string;
    readonly requestedPath: string;
    readonly action: "CREATE_DESTINATION_FOLDER";
  }>;
}>;
type ResolveFolder = (
  config: { destination_folder?: string; destination_path?: string },
  workspaceID: string,
  options: readonly { value: string; label: string }[],
) => FolderResolution;
const resolveFolder: ResolveFolder = (config, workspaceID, options) => {
  const value = configuredFolder(config);
  if (value === undefined || value === "") throw new OperationFault("CONFIGURATION");
  const exact = options.find((option) => option.value === value);
  if (exact !== undefined) return { destinationFolderID: exact.value };
  const matches = options.filter((option) => normalizeFolderLabel(option.label) === normalize(value));
  if (matches.length > 1)
    throw new OperationFault("CONFIGURATION", false, "destination-folder-resolution-mismatch", {
      stage: "destination-resolution",
      context: {
        configuredSelection: config,
        configuredFolder: normalize(value),
        candidateCount: options.length,
        candidateLabels: options.map((option) => option.label).slice(0, 20),
      },
    });
  if (matches.length === 1) return { destinationFolderID: matches[0].value };
  return {
    destinationFolderCreation: {
      workspaceID,
      requestedPath: value,
      action: "CREATE_DESTINATION_FOLDER",
    },
  };
};
export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "DESTINATION_CATALOG_LOADED") throw new OperationFault("INVALID_ARGUMENT");
    const resolution = resolveFolder(
      parsed.data.config,
      parsed.data.selection.destinationWorkspaceID,
      folderOptions(parsed.data.selection.destinationWorkspaceID)(parsed.data.catalog.destinationFolders),
    );
    return success("resolve_destination_selection", id, {
      schemaVersion: 1,
      stage: "DESTINATION_RESOLVED",
      config: parsed.data.config,
      catalog: parsed.data.catalog,
      ...(parsed.data.sourceSchemaVersion === undefined
        ? {}
        : { sourceSchemaVersion: parsed.data.sourceSchemaVersion }),
      selection: {
        ...parsed.data.selection,
        ...(resolution.destinationFolderID === undefined
          ? {}
          : { destinationFolderID: resolution.destinationFolderID }),
      },
      ...(resolution.destinationFolderCreation === undefined
        ? {}
        : { destinationFolderCreation: resolution.destinationFolderCreation }),
    });
  } catch (error) {
    return failure("resolve_destination_selection", id, error);
  }
};
