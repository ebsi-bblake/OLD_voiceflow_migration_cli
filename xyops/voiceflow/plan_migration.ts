import { buildMigrationPlan } from "./planning";
import { resolveVoiceflowAuth } from "./auth";
import { success, failure } from "./contracts";
import type { Envelope, MigrationPlan, MigrationSelection } from "./types";
import { createUUID } from "./uuid";

type BuildPlanForSelection = (
  selection: MigrationSelection,
) => (
  auth: Parameters<typeof buildMigrationPlan>[0],
) => ReturnType<typeof buildMigrationPlan>;
const buildPlanForSelection: BuildPlanForSelection = (selection) => (auth) =>
  buildMigrationPlan(auth, selection);

type Main = (
  token: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
) => Promise<Envelope<MigrationPlan>>;
export const main: Main = (
  token,
  sourceWorkspaceID,
  sourceProjectID,
  sourceVersionID,
  destinationWorkspaceID,
  destinationFolderID,
  targetSchemaVersion = "13.1",
) => {
  const id = createUUID();
  const selection: MigrationSelection = {
    sourceWorkspaceID,
    sourceProjectID,
    sourceVersionID,
    destinationWorkspaceID,
    destinationFolderID,
    targetSchemaVersion,
  };
  return resolveVoiceflowAuth(token)
    .then(buildPlanForSelection(selection))
    .then((plan) => success("plan_migration", id, plan))
    .catch((error) => failure("plan_migration", id, error));
};
