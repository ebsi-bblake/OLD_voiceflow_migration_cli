/** The only authority for migration parameter names crossing the XYOps boundary. */
import { VoiceflowOperation } from "./voiceflow/types";

export const MigrationParameterName = {
  operation: "operation",
  sourceWorkspaceID: "SOURCE_WORKSPACE_ID",
  sourceProjectID: "SOURCE_PROJECT_ID",
  sourceVersionID: "SOURCE_VERSION_ID",
  destinationWorkspaceID: "DESTINATION_WORKSPACE_ID",
  destinationFolderID: "DESTINATION_FOLDER_ID",
  targetSchemaVersion: "TARGET_SCHEMA_VERSION",
  planID: "PLAN_ID",
  secretFileContents: "SECRET_FILE_CONTENTS",
  confirmed: "CONFIRMED",
  debug: "DEBUG",
} as const;

export type MigrationParameterName =
  (typeof MigrationParameterName)[keyof typeof MigrationParameterName];

export type SerializedSecretEntry = Readonly<{
  key: string;
  value: string;
  type: "projectId" | "" | "url";
}>;
export type SerializedEventParameterValue =
  | string
  | boolean
  | readonly SerializedSecretEntry[];
export type SerializedEventParameters = Readonly<
  Record<string, SerializedEventParameterValue>
>;

export type MigrationParameterSelection = Readonly<{
  sourceWorkspaceID: string;
  sourceProjectID: string;
  sourceVersionID: string;
  destinationWorkspaceID: string;
  destinationFolderID: string;
  targetSchemaVersion?: string;
}>;

type MigrationParameterError = (name: string) => Error;
const migrationParameterError: MigrationParameterError = (name) =>
  new Error(`Migration parameter '${name}' must be a non-empty string.`);

type RequiredMigrationValue = (name: string, value: string) => string;
const requiredMigrationValue: RequiredMigrationValue = (name, value) => {
  if (typeof value !== "string" || value.trim() === "")
    throw migrationParameterError(name);
  return value;
};

type OptionalMigrationValue = (name: string, value: string | undefined) =>
  string | undefined;
const optionalMigrationValue: OptionalMigrationValue = (name, value) =>
  value === undefined ? undefined : requiredMigrationValue(name, value);

type SelectionParameterValues = (
  selection: MigrationParameterSelection,
) => Readonly<Record<string, SerializedEventParameterValue | undefined>>;
const selectionParameterValues: SelectionParameterValues = (selection) => ({
  [MigrationParameterName.sourceWorkspaceID]: requiredMigrationValue(
    MigrationParameterName.sourceWorkspaceID,
    selection.sourceWorkspaceID,
  ),
  [MigrationParameterName.sourceProjectID]: requiredMigrationValue(
    MigrationParameterName.sourceProjectID,
    selection.sourceProjectID,
  ),
  [MigrationParameterName.sourceVersionID]: requiredMigrationValue(
    MigrationParameterName.sourceVersionID,
    selection.sourceVersionID,
  ),
  [MigrationParameterName.destinationWorkspaceID]: requiredMigrationValue(
    MigrationParameterName.destinationWorkspaceID,
    selection.destinationWorkspaceID,
  ),
  [MigrationParameterName.destinationFolderID]: requiredMigrationValue(
    MigrationParameterName.destinationFolderID,
    selection.destinationFolderID,
  ),
  [MigrationParameterName.targetSchemaVersion]: optionalMigrationValue(
    MigrationParameterName.targetSchemaVersion,
    selection.targetSchemaVersion,
  ),
});

type BuildPlanMigrationParameters = (
  selection: MigrationParameterSelection,
) => SerializedEventParameters;
export const buildPlanMigrationParameters: BuildPlanMigrationParameters = (
  selection,
) =>
  omitUndefined({
    [MigrationParameterName.operation]: VoiceflowOperation.PlanMigration,
    ...selectionParameterValues(selection),
  });

type BuildExecuteMigrationParameters = (
  selection: MigrationParameterSelection,
  planID: string,
  secretFileContents?: readonly SerializedSecretEntry[],
) => SerializedEventParameters;
export const buildExecuteMigrationParameters: BuildExecuteMigrationParameters = (
  selection,
  planID,
  secretFileContents,
) =>
  omitUndefined({
    [MigrationParameterName.operation]: VoiceflowOperation.ExecuteMigration,
    [MigrationParameterName.planID]: requiredMigrationValue(
      MigrationParameterName.planID,
      planID,
    ),
    ...selectionParameterValues(selection),
    [MigrationParameterName.confirmed]: true,
    [MigrationParameterName.secretFileContents]: secretFileContents,
  });

type OmitUndefined = (
  values: Readonly<Record<string, SerializedEventParameterValue | undefined>>,
) => SerializedEventParameters;
const omitUndefined: OmitUndefined = (values) =>
  Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as SerializedEventParameters;