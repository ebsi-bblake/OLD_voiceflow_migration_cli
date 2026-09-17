import type { MigrationSelection } from "../types";

type MigrationSelectionForArguments = (
  sourceWorkspaceID: string,
  sourceProjectID: string,
  sourceVersionID: string,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
) => MigrationSelection;
export const migrationSelection: MigrationSelectionForArguments = (
  sourceWorkspaceID,
  sourceProjectID,
  sourceVersionID,
  destinationWorkspaceID,
  destinationFolderID,
  targetSchemaVersion,
) => ({
  sourceWorkspaceID,
  sourceProjectID,
  sourceVersionID,
  destinationWorkspaceID,
  destinationFolderID,
  ...(targetSchemaVersion === undefined ? {} : { targetSchemaVersion }),
});
