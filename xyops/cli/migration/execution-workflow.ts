import { MigrationParameterName } from "../../migration-parameters";
import type {
  SecretEntries,
  WorkflowMigrationPlan,
  XYOpsClient,
  XYOpsEventReference,
  XYOpsJob,
} from "../types";
import { toExecutionWorkflowInput } from "./workflow-input";

type RunExecutionWorkflow = (
  client: XYOpsClient,
  workflow: XYOpsEventReference,
  plan: WorkflowMigrationPlan,
  secretFileContents?: SecretEntries,
) => Promise<Readonly<{ jobID: string; job: XYOpsJob }>>;

export const runExecutionWorkflow: RunExecutionWorkflow = async (
  client,
  workflow,
  plan,
  secretFileContents,
) => {
  const jobID = await client.startWorkflow(
    workflow,
    toExecutionWorkflowInput(plan),
    secretFileContents === undefined
      ? undefined
      : { [MigrationParameterName.secretFileContents]: secretFileContents },
  );
  const job = await client.observeWorkflow(jobID);
  return { jobID, job };
};
