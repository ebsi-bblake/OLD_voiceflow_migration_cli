import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { failure, OperationFault, success } from "./contracts";
import { folderOptions } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type DestinationResolvedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "DESTINATION_RESOLVED" }>;
type Main = (workflowData: unknown) => Promise<Envelope<DestinationResolvedResult>>;
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const readWorkflowData = (value: unknown): unknown => isRecord(value) && isRecord(value.voiceflow) ? value.voiceflow.result : value;
const normalize = (value: string): string => value.normalize("NFC").trim().toLowerCase();
const configuredFolder = (config: RecordValue): string | undefined => {
  if (typeof config.destination_folder === "string") return config.destination_folder;
  if (typeof config.destination_path === "string") return config.destination_path.split("/").slice(1).join("/");
  return undefined;
};
const resolveFolder = (config: RecordValue, options: readonly { value: string; label: string }[]): string => {
  const value = configuredFolder(config);
  if (value === undefined || value === "") throw new OperationFault("CONFIGURATION");
  const exact = options.find((option) => option.value === value);
  if (exact !== undefined) return exact.value;
  const matches = options.filter((option) => normalize(option.label) === normalize(value));
  if (matches.length !== 1) throw new OperationFault("CONFIGURATION");
  return matches[0].value;
};
export const main: Main = async (input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "DESTINATION_CATALOG_LOADED") throw new OperationFault("INVALID_ARGUMENT");
    const destinationFolderID = resolveFolder(parsed.data.config, folderOptions(parsed.data.selection.destinationWorkspaceID)(parsed.data.catalog.destinationFolders));
    return success("resolve_destination_selection", id, {
      schemaVersion: 1,
      stage: "DESTINATION_RESOLVED",
      config: parsed.data.config,
      catalog: parsed.data.catalog,
      selection: { ...parsed.data.selection, destinationFolderID },
    });
  } catch (error) {
    return failure("resolve_destination_selection", id, error);
  }
};
