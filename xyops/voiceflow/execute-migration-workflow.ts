import { z } from "zod";
import { MigrationWorkflowDataSchema } from "./schemas/migration-workflow-data";
import { main as executeMigration } from "./execute_migration";
import { failure, OperationFault, type Envelope } from "./contracts";
import type { ExecuteResult } from "./types";
import type { ExecutionReadyWorkflowData } from "./schemas/migration-workflow-data";
import { createUUID } from "./uuid";
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};

type MainDependencies = Readonly<{
  readonly executeMigration?: typeof executeMigration;
}>;

type Main = (
  token: string,
  workflowData: unknown,
  secretFileContents?: unknown,
  dependencies?: MainDependencies,
) => Promise<Envelope<ExecuteResult>>;

type ParsedExecutionInput = Readonly<{
  readonly planID: string;
  readonly selection: ExecutionReadyWorkflowData["selection"] & {
    readonly destinationFolderID: string;
  };
}>;

const withWorkflowOperation = (
  result: Awaited<ReturnType<typeof executeMigration>>,
): Envelope<ExecuteResult> => ({
  ...result,
  operation: "execute_migration_workflow",
});

type ParseExecutionInput = (input: unknown) => ParsedExecutionInput | undefined;
const parseExecutionInput: ParseExecutionInput = (input) => {
  const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
  if (!parsed.success || parsed.data.stage !== "EXECUTION_READY") return undefined;
  if (parsed.data.selection.destinationFolderID === undefined) return undefined;
  return { planID: parsed.data.planID, selection: parsed.data.selection };
};

type RunExecution = (
  token: string,
  input: ParsedExecutionInput,
  secretFileContents: unknown,
  dependencies: MainDependencies | undefined,
) => Promise<Envelope<ExecuteResult>>;
const runExecution: RunExecution = (
  token,
  input,
  secretFileContents,
  dependencies,
) => {
  const execute = dependencies?.executeMigration ?? executeMigration;
  return execute(
    token,
    input.planID,
    input.selection.sourceWorkspaceID,
    input.selection.sourceProjectID,
    input.selection.sourceVersionID,
    input.selection.destinationWorkspaceID,
    input.selection.destinationFolderID,
    input.selection.targetSchemaVersion,
    true,
    secretFileContents,
  ).then(withWorkflowOperation);
};

export const main: Main = async (
  token,
  workflowData,
  secretFileContents,
  dependencies,
) => {
  const input = parseExecutionInput(workflowData);
  if (input === undefined)
    return failure(
      "execute_migration_workflow",
      createUUID(),
      new OperationFault("INVALID_ARGUMENT"),
    );
  try {
    return await runExecution(token, input, secretFileContents, dependencies);
  } catch (error: unknown) {
    return failure("execute_migration_workflow", createUUID(), error);
  }
};
