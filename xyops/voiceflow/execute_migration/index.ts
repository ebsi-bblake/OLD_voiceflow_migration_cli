import { failure, OperationFault } from "../contracts";
import { isConfirmationGranted } from "../guards";
import { createUUID } from "../uuid";
import type { Envelope, ExecuteResult } from "../types";
import { migrationSelection } from "./arguments";
import {
  defaultMigrationRuntimeDependencies,
  runMigrationWorkflow,
  type MigrationRuntimeDependencies,
} from "./effect-runner";

export type { ExecuteResult } from "../types";
export type { MigrationRuntimeDependencies } from "./effect-runner";
export { runMigrationWorkflow } from "./effect-runner";

const normalizeConfirmation = (confirmed: boolean | undefined): boolean =>
  confirmed ?? false;
const normalizeSchemaVersion = (
  version: string | undefined,
): string | undefined => version;

type ExecuteConfirmedMigration = (
  token: string,
  planID: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion: string | undefined,
  operationID: string,
  secretFileContents?: unknown,
  dependencies?: MigrationRuntimeDependencies,
) => Promise<Envelope<ExecuteResult>>;
export const executeConfirmedMigration: ExecuteConfirmedMigration = (
  token,
  planID,
  sourceWorkspaceID,
  sourceProjectID,
  sourceVersionID,
  destinationWorkspaceID,
  destinationFolderID,
  targetSchemaVersion,
  operationID,
  secretFileContents,
  dependencies = defaultMigrationRuntimeDependencies,
) =>
  runMigrationWorkflow(
    {
      token,
      planID,
      operationID,
      selection: migrationSelection(
        sourceWorkspaceID,
        sourceProjectID,
        sourceVersionID,
        destinationWorkspaceID,
        destinationFolderID,
        targetSchemaVersion,
      ),
      secretFileContents,
    },
    dependencies,
  );

type Main = (
  token: string,
  planID: string,
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
  confirmed?: boolean,
  secretFileContents?: unknown,
) => Promise<Envelope<ExecuteResult>>;
export const main: Main = (
  token,
  planID,
  sourceWorkspaceID,
  sourceProjectID,
  sourceVersionID,
  destinationWorkspaceID,
  destinationFolderID,
  targetSchemaVersion,
  confirmed,
  secretFileContents,
) => {
  const operationID = createUUID();
  return isConfirmationGranted(normalizeConfirmation(confirmed))
    ? executeConfirmedMigration(
        token,
        planID,
        sourceWorkspaceID,
        sourceProjectID,
        sourceVersionID,
        destinationWorkspaceID,
        destinationFolderID,
        normalizeSchemaVersion(targetSchemaVersion),
        operationID,
        secretFileContents,
      )
    : Promise.resolve(
        failure(
          "execute_migration",
          operationID,
          new OperationFault("CONFIRMATION_REQUIRED"),
        ),
      );
};
