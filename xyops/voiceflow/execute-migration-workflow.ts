import { MigrationWorkflowDataSchema } from "./schemas/migration-workflow-data";
import { main as executeMigration } from "./execute_migration";
import { failure, OperationFault, type Envelope } from "./contracts";
import type { ExecuteResult } from "./types";
import { createUUID } from "./uuid";

type Main = (
  token: string,
  workflowData: unknown,
  secretFileContents?: unknown,
) => Promise<Envelope<ExecuteResult>>;

const withWorkflowOperation = (
  result: Awaited<ReturnType<typeof executeMigration>>,
): Envelope<ExecuteResult> => ({
  ...result,
  operation: "execute_migration_workflow",
});

export const main: Main = (token, workflowData, secretFileContents) => {
  const parsed = MigrationWorkflowDataSchema.safeParse(workflowData);
  if (!parsed.success || parsed.data.stage !== "EXECUTION_READY")
    return Promise.resolve(
      failure(
        "execute_migration_workflow",
        createUUID(),
        new OperationFault("INVALID_ARGUMENT"),
      ),
    );

  const { planID, selection } = parsed.data;
  if (selection.destinationFolderID === undefined)
    return Promise.resolve(
      failure(
        "execute_migration_workflow",
        createUUID(),
        new OperationFault("INVALID_ARGUMENT"),
      ),
    );
  return executeMigration(
    token,
    planID,
    selection.sourceWorkspaceID,
    selection.sourceProjectID,
    selection.sourceVersionID,
    selection.destinationWorkspaceID,
    selection.destinationFolderID,
    selection.targetSchemaVersion,
    true,
    secretFileContents,
  ).then(withWorkflowOperation);
};
