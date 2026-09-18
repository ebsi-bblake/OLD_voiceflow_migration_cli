import { failure, success } from "../../../contracts";
import type {
  Envelope,
  ExecuteResult,
  ExportArtifact,
  ImportedReceipt,
} from "../../../types";
import type {
  MigrationWorkflowState,
  MigrationWorkflowSuccess,
} from "../../../execute-migration-state-machine";
import { requireArtifact, requireImported, requirePlan } from "../requirements";
import { failureForState } from "../failure-mapping";
import type { ExecuteMigrationInput } from "../dependencies";
import type { EffectHandler } from "../types";

const settledResult = (result: Envelope<ExecuteResult>) => ({
  kind: "settled" as const,
  result,
});

const successSummary = (
  state: MigrationWorkflowState,
  input: ExecuteMigrationInput,
  artifact: ExportArtifact,
  imported: ImportedReceipt,
): MigrationWorkflowSuccess =>
  state.context.terminalSuccess ?? {
    planID: input.planID,
    exportStatus: artifact.status,
    exportBytes: artifact.bytes.byteLength,
    importStatus: imported.importStatus,
    importBytes: imported.importBytes,
  };

export const createSuccessSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-success"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const plan = requirePlan(state);
    const imported = requireImported(state);
    const summary = successSummary(state, input, artifact, imported);
    return settledResult(
      success("execute_migration", input.operationID, {
        ...summary,
        selected: plan.selection,
        imported,
      }),
    );
  };

export const createFailureSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-failure"> =>
  async (state) =>
    settledResult(
      failure("execute_migration", input.operationID, failureForState(state)),
    );
