import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { resolveVoiceflowAuth } from "./auth";
import { failure, OperationFault, success } from "./contracts";
import { loadFolders } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type DestinationCatalogLoadedResult = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "DESTINATION_CATALOG_LOADED" }>;
type Main = (token: string, workflowData: unknown) => Promise<Envelope<DestinationCatalogLoadedResult>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
const normalize = (value: string): string => value.normalize("NFC").trim().toLowerCase();
const configuredWorkspace = (config: { destination_workspace?: string; destination_path?: string }): string | undefined =>
  config.destination_workspace ?? config.destination_path?.split("/")[0]?.trim();
export const resolveWorkspace = (config: { destination_workspace?: string; destination_path?: string }, workspaces: readonly { id: string; label: string }[]): string => {
  const value = configuredWorkspace(config);
  if (value === undefined || value === "") throw new OperationFault("CONFIGURATION");
  const exact = workspaces.find((workspace) => workspace.id === value);
  if (exact !== undefined) return exact.id;
  const matches = workspaces.filter((workspace) => normalize(workspace.label) === normalize(value));
  if (matches.length !== 1) {
    throw new OperationFault(
      "CONFIGURATION",
      false,
      "destination-workspace-resolution-mismatch",
      {
        stage: "destination-resolution",
        context: {
          configuredSelection: config,
          configuredWorkspace: normalize(value),
          candidateCount: workspaces.length,
          candidateLabels: workspaces.map((workspace) => workspace.label).slice(0, 20),
        },
      },
    );
  }
  return matches[0].id;
};
export const main: Main = async (token, input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "SOURCE_SCHEMA_RESOLVED") throw new OperationFault("INVALID_ARGUMENT");
    const destinationWorkspaceID = resolveWorkspace(parsed.data.config, parsed.data.catalog.workspaces);
    const auth = await resolveVoiceflowAuth(token);
    const destinationFolders = await loadFolders(auth, destinationWorkspaceID);
    return success("load_destination_catalog", id, {
      schemaVersion: 1,
      stage: "DESTINATION_CATALOG_LOADED",
      config: parsed.data.config,
      catalog: { ...parsed.data.catalog, destinationFolders },
      sourceSchemaVersion: parsed.data.sourceSchemaVersion,
      selection: { ...parsed.data.selection, destinationWorkspaceID },
    });
  } catch (error) {
    return failure("load_destination_catalog", id, error);
  }
};
