import { createUUID } from "./uuid";
import { failure, success } from "./contracts";
import {
  MigrationWorkflowDataSchema,
  type MigrationWorkflowData,
} from "../migration-workflow-data";
import type { Envelope } from "./types";
import { OperationFault } from "./contracts";

type InitializeMigrationWorkflow = (
  input: unknown,
) => Promise<Envelope<MigrationWorkflowData>>;

export const main: InitializeMigrationWorkflow = async (input) => {
  const operationID = createUUID();
  const parsed = MigrationWorkflowDataSchema.safeParse(input);
  if (!parsed.success)
    return failure(
      "initialize_migration_workflow",
      operationID,
      new OperationFault("INVALID_ARGUMENT", false, "workflow-data-invalid"),
    );
  return success("initialize_migration_workflow", operationID, parsed.data);
};
