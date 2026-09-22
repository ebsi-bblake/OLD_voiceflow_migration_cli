import {
  executeConfirmedMigration,
  type MigrationRuntimeDependencies,
} from "../voiceflow/execute_migration";
import { main as planMigration } from "../voiceflow/plan_migration";
import {
  claimExecutionLedger,
  settleExecutionLedger,
  type ExecutionLedgerStore,
} from "../voiceflow/execution-ledger";
import { failure, OperationFault } from "../voiceflow/contracts";
import type { Envelope, ExecuteResult, MigrationPlan } from "../voiceflow/types";
import { createUUID } from "../voiceflow/uuid";

export type AgentMigrationSelection = Readonly<{
  readonly sourceWorkspaceID: string;
  readonly sourceProjectID: string;
  readonly sourceVersionID: string;
  readonly destinationWorkspaceID: string;
  readonly destinationFolderID: string;
  readonly targetSchemaVersion: string;
}>;

export type PlanVoiceflowMigrationInput = Readonly<{
  readonly token: string;
  readonly selection: AgentMigrationSelection;
}>;

export type ExecuteVoiceflowMigrationInput = Readonly<{
  readonly token: string;
  readonly planID: string;
  readonly selection: AgentMigrationSelection;
  readonly confirmed: boolean;
  readonly secretFileContents?: unknown;
}>;

export type VoiceflowMigrationAgentDependencies = Readonly<{
  readonly ledgerStore: ExecutionLedgerStore;
  readonly migration?: MigrationRuntimeDependencies;
  readonly now?: () => string;
}>;

export type VoiceflowMigrationAgent = Readonly<{
  readonly plan: (
    input: PlanVoiceflowMigrationInput,
  ) => Promise<Envelope<MigrationPlan>>;
  readonly execute: (
    input: ExecuteVoiceflowMigrationInput,
  ) => Promise<Envelope<ExecuteResult>>;
}>;

type CreateVoiceflowMigrationAgent = (
  dependencies: VoiceflowMigrationAgentDependencies,
) => VoiceflowMigrationAgent;

const terminalStatus = (
  result: Envelope<ExecuteResult>,
): "completed" | "failed" | "unknown" =>
  result.ok
    ? "completed"
    : result.error.code === "IMPORT_OUTCOME_UNKNOWN"
      ? "unknown"
      : "failed";

const blockedClaim = (
  claim: "skip" | "reconcile",
): Envelope<ExecuteResult> =>
  failure(
    "execute_migration",
    createUUID(),
    claim === "skip"
      ? new OperationFault("PLAN_MISMATCH", false, "execution-already-completed")
      : new OperationFault(
          "IMPORT_OUTCOME_UNKNOWN",
          true,
          "execution-requires-reconciliation",
        ),
  );

export const createVoiceflowMigrationAgent: CreateVoiceflowMigrationAgent =
  ({ ledgerStore, migration, now = () => new Date().toISOString() }) => ({
    plan: (input) =>
      planMigration(
        input.token,
        input.selection.sourceWorkspaceID,
        input.selection.sourceProjectID,
        input.selection.sourceVersionID,
        input.selection.destinationWorkspaceID,
        input.selection.destinationFolderID,
        input.selection.targetSchemaVersion,
      ),
    execute: async (input) => {
      if (input.confirmed !== true)
        return failure(
          "execute_migration",
          createUUID(),
          new OperationFault("CONFIRMATION_REQUIRED"),
        );
      const claim = await claimExecutionLedger(ledgerStore, input.planID, now());
      if (claim !== "execute") return blockedClaim(claim);
      const result = await executeConfirmedMigration(
        input.token,
        input.planID,
        input.selection.sourceWorkspaceID,
        input.selection.sourceProjectID,
        input.selection.sourceVersionID,
        input.selection.destinationWorkspaceID,
        input.selection.destinationFolderID,
        input.selection.targetSchemaVersion,
        createUUID(),
        input.secretFileContents,
        migration,
      );
      await settleExecutionLedger(
        ledgerStore,
        input.planID,
        terminalStatus(result),
        now(),
      );
      return result;
    },
  });
