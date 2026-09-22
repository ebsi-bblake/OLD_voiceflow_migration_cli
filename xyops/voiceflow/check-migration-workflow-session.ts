import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { main as checkSession } from "./check_session";
import { failure, OperationFault, success } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type WorkflowData = Extract<Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>, { stage: "CONFIGURED" }>;
type Main = (token: string, workflowData: unknown) => Promise<Envelope<WorkflowData>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};
export const main: Main = async (token, input) => {
  const id = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "CONFIGURED") throw new OperationFault("INVALID_ARGUMENT");
    const session = await checkSession(token);
    if (!session.ok || !session.result.active) throw new OperationFault("VOICEFLOW_LOGIN_REQUIRED");
    return success("check_session_workflow", id, parsed.data);
  } catch (error) {
    return failure("check_session_workflow", id, error);
  }
};
