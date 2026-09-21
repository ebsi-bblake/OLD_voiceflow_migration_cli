import {
  ConfirmedMigrationHandoffSchema,
  type ExecutionReadyWorkflowData,
} from "./schemas/migration-workflow-data";
import { failure, success, OperationFault } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type Main = (
  input: unknown,
) => Promise<Envelope<ExecutionReadyWorkflowData>>;

export const main: Main = (input) => {
  const operationID = createUUID();
  const parsed = ConfirmedMigrationHandoffSchema.safeParse(input);
  if (!parsed.success)
    return Promise.resolve(
      failure(
        "initialize_execution_workflow",
        operationID,
        new OperationFault("INVALID_ARGUMENT"),
      ),
    );

  const { planID, plan } = parsed.data;
  return Promise.resolve(
    success("initialize_execution_workflow", operationID, {
      schemaVersion: 1,
      stage: "EXECUTION_READY",
      planID,
      selection: plan.selection,
      plan,
    }),
  );
};
