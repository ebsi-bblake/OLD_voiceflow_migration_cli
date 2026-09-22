import { z } from "zod";
import { MigrationWorkflowDataSchema } from "./schemas/migration-workflow-data";
import { main as executeMigration } from "./execute_migration";
import { failure, OperationFault, type Envelope } from "./contracts";
import type { ExecuteResult } from "./types";
import type { ExecutionReadyWorkflowData } from "./schemas/migration-workflow-data";
import { createUUID } from "./uuid";
import {
  claimExecutionLedger,
  settleExecutionLedger,
  type ExecutionLedgerStore,
} from "./execution-ledger";
import { createXYOpsExecutionLedgerStore } from "./xyops-execution-ledger-store";

const EXECUTION_LEDGER_BUCKET_ID = "bmuc1r0bokku4tz9";
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};

type MainDependencies = Readonly<{
  readonly ledgerStore: ExecutionLedgerStore;
  readonly executeMigration?: typeof executeMigration;
  readonly now?: () => string;
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

const defaultLedgerStore = (): ExecutionLedgerStore => {
  const baseURL = process.env.JOB_BASE_URL ?? process.env.XYOPS_BASE_URL;
  const apiKey = process.env.XYOPS_API_KEY;
  if (baseURL === undefined || apiKey === undefined)
    throw new OperationFault("DEPENDENCY_FAILURE", true, "ledger-configuration");
  return createXYOpsExecutionLedgerStore({
    baseURL,
    apiKey,
    bucketID: EXECUTION_LEDGER_BUCKET_ID,
  });
};

type ParseExecutionInput = (input: unknown) => ParsedExecutionInput | undefined;
const parseExecutionInput: ParseExecutionInput = (input) => {
  const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
  if (!parsed.success || parsed.data.stage !== "EXECUTION_READY") return undefined;
  if (parsed.data.selection.destinationFolderID === undefined) return undefined;
  return { planID: parsed.data.planID, selection: parsed.data.selection };
};

const terminalStatus = (
  result: Awaited<ReturnType<typeof executeMigration>>,
): "completed" | "failed" | "unknown" =>
  result.ok && result.result !== undefined
    ? "completed"
    : !result.ok && result.error.code === "IMPORT_OUTCOME_UNKNOWN"
      ? "unknown"
      : "failed";

const rejectedClaim = (
  claim: "skip" | "reconcile",
): Envelope<ExecuteResult> =>
  failure(
    "execute_migration_workflow",
    createUUID(),
    claim === "skip"
      ? new OperationFault("PLAN_MISMATCH", false, "execution-already-completed")
      : new OperationFault(
          "IMPORT_OUTCOME_UNKNOWN",
          true,
          "execution-requires-reconciliation",
        ),
  );

type RunClaimedExecution = (
  execute: typeof executeMigration,
  token: string,
  input: ParsedExecutionInput,
  secretFileContents: unknown,
  store: ExecutionLedgerStore,
  now: () => string,
) => Promise<Envelope<ExecuteResult>>;
const runClaimedExecution: RunClaimedExecution = async (
  execute,
  token,
  input,
  secretFileContents,
  store,
  now,
) => {
  const result = await execute(
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
  );
  await settleExecutionLedger(
    store,
    input.planID,
    terminalStatus(result),
    now(),
  );
  return withWorkflowOperation(result);
};

type HandleExecutionClaim = (
  claim: Awaited<ReturnType<typeof claimExecutionLedger>>,
  token: string,
  input: ParsedExecutionInput,
  secretFileContents: unknown,
  store: ExecutionLedgerStore,
  execute: typeof executeMigration,
  now: () => string,
) => Promise<Envelope<ExecuteResult>>;
const handleExecutionClaim: HandleExecutionClaim = (
  claim,
  token,
  input,
  secretFileContents,
  store,
  execute,
  now,
) =>
  claim === "execute"
    ? runClaimedExecution(execute, token, input, secretFileContents, store, now)
    : Promise.resolve(rejectedClaim(claim));

type RunExecution = (
  token: string,
  input: ParsedExecutionInput,
  secretFileContents: unknown,
  dependencies: MainDependencies | undefined,
) => Promise<Envelope<ExecuteResult>>;
const runExecution: RunExecution = async (
  token,
  input,
  secretFileContents,
  dependencies,
) => {
  const store = dependencies?.ledgerStore ?? defaultLedgerStore();
  const execute = dependencies?.executeMigration ?? executeMigration;
  const now = dependencies?.now ?? (() => new Date().toISOString());
  const claim = await claimExecutionLedger(store, input.planID, now());
  return handleExecutionClaim(
    claim,
    token,
    input,
    secretFileContents,
    store,
    execute,
    now,
  );
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
