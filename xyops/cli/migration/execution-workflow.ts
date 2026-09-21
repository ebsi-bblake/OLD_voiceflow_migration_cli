import type { MigrationPlan, XYOpsClient, XYOpsEventReference, XYOpsJob } from "../types";
import { toExecutionWorkflowInput } from "./workflow-input";

type RunExecutionWorkflow = (
  client: XYOpsClient,
  workflow: XYOpsEventReference,
  plan: MigrationPlan,
) => Promise<Readonly<{ jobID: string; job: XYOpsJob }>>;

export const runExecutionWorkflow: RunExecutionWorkflow = async (
  client,
  workflow,
  plan,
) => {
  const jobID = await client.startWorkflow(
    workflow,
    toExecutionWorkflowInput(plan),
  );
  const job = await client.observeWorkflow(jobID);
  return { jobID, job };
};
