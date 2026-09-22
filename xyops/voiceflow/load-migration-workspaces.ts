import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { resolveVoiceflowAuth } from "./auth";
import { success, failure } from "./contracts";
import { loadWorkspaces } from "./catalog";
import type { Envelope } from "./types";
import { OperationFault } from "./contracts";
import { createUUID } from "./uuid";

type WorkspacesLoadedResult = Extract<
  Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>,
  { stage: "WORKSPACES_LOADED" }
>;

type Main = (
  token: string,
  workflowData: unknown,
) => Promise<Envelope<WorkspacesLoadedResult>>;

const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});

const readConfiguredWorkflowData = (value: unknown) => {
  const wrapped = WorkflowEnvelopeSchema.safeParse(value);
  const unwrapped = wrapped.success ? wrapped.data.voiceflow.result : value;
  const parsed = MigrationWorkflowDataSchema.safeParse(unwrapped);
  if (!parsed.success || parsed.data.stage !== "CONFIGURED")
    throw new OperationFault("INVALID_ARGUMENT");
  return parsed.data;
};

export const main: Main = async (token, workflowData) => {
  const id = createUUID();
  try {
    const configured = readConfiguredWorkflowData(workflowData);
    const workspaces = await resolveVoiceflowAuth(token).then(loadWorkspaces);
    return success("load_workspaces", id, {
      schemaVersion: 1,
      stage: "WORKSPACES_LOADED",
      config: configured.config,
      catalog: { workspaces },
      selection: configured.selection,
    });
  } catch (error) {
    return failure("load_workspaces", id, error);
  }
};
