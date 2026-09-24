import {
  executeConfirmedMigration,
  type MigrationRuntimeDependencies,
} from "../voiceflow/execute_migration";
import { main as planMigration } from "../voiceflow/plan_migration";
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
  readonly migration?: MigrationRuntimeDependencies;
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

export const createVoiceflowMigrationAgent: CreateVoiceflowMigrationAgent =
  ({ migration }) => ({
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
      return executeConfirmedMigration(
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
    },
  });
