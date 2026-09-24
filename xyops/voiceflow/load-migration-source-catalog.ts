import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { resolveVoiceflowAuth } from "./auth";
import { failure, OperationFault, success } from "./contracts";
import { loadFolders, loadProjects } from "./catalog";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type SourceCatalogLoadedResult = Extract<
  Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>,
  { stage: "SOURCE_CATALOG_LOADED" }
>;
type Main = (
  token: string,
  workflowData: unknown,
) => Promise<Envelope<SourceCatalogLoadedResult>>;

const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};

const readSourceWorkspaceValue = (config: { source_workspace?: string; source_path?: string }): string | undefined =>
  config.source_workspace ?? config.source_path?.split("/")[0]?.trim();

const normalizeName = (value: string): string => value.normalize("NFC").trim().toLowerCase();

const readConfiguredData = (value: unknown) => {
  const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(value));
  if (!parsed.success || parsed.data.stage !== "WORKSPACES_LOADED")
    throw new OperationFault("INVALID_ARGUMENT");
  return parsed.data;
};

export const resolveWorkspace = (
  config: { source_workspace?: string; source_path?: string },
  workspaces: readonly { id: string; label: string }[],
): string => {
  const value = readSourceWorkspaceValue(config);
  if (value === undefined) throw new OperationFault("CONFIGURATION");
  const byID = workspaces.find((workspace) => workspace.id === value);
  if (byID !== undefined) return byID.id;
  const matches = workspaces.filter(
    (workspace) => normalizeName(workspace.label) === normalizeName(value),
  );
  if (matches.length !== 1) {
    throw new OperationFault(
      "CONFIGURATION",
      false,
      "source-workspace-resolution-mismatch",
      {
        stage: "source-resolution",
        context: {
          configuredSelection: config,
          configuredWorkspace: normalizeName(value),
          candidateCount: workspaces.length,
          candidateLabels: workspaces.map((workspace) => workspace.label).slice(0, 20),
        },
      },
    );
  }
  return matches[0].id;
};

export const main: Main = async (token, workflowData) => {
  const id = createUUID();
  try {
    const configured = readConfiguredData(workflowData);
    const sourceWorkspaceID = resolveWorkspace(configured.config, configured.catalog.workspaces);
    const auth = await resolveVoiceflowAuth(token);
    const [sourceProjects, sourceFolders] = await Promise.all([
      loadProjects(auth, sourceWorkspaceID),
      loadFolders(auth, sourceWorkspaceID),
    ]);
    return success("load_source_catalog", id, {
      schemaVersion: 1,
      stage: "SOURCE_CATALOG_LOADED",
      config: configured.config,
      catalog: {
        workspaces: configured.catalog.workspaces,
        sourceProjects,
        sourceFolders,
      },
      selection: {
        ...configured.selection,
        sourceWorkspaceID,
      },
    });
  } catch (error) {
    return failure("load_source_catalog", id, error);
  }
};
