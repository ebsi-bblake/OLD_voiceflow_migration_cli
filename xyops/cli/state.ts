import type {
  EventParameterValue,
  EventParameters,
  MigrationSelection,
  Option,
  SecretEntries,
} from "./types";
import { isEventParameterEntry } from "./guards";
import { fail } from "./diagnostics";
import type { MigrationState } from "./types";
export type { MigrationState } from "./types";

type InitialMigrationState = () => MigrationState;
export const initialMigrationState: InitialMigrationState = () => ({});

type SetStateValue = <K extends keyof MigrationState>(
  state: MigrationState,
  key: K,
  value: MigrationState[K],
) => MigrationState;
export const setStateValue: SetStateValue = (state, key, value) => ({
  ...state,
  [key]: value,
});

const isPresentStateValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const CONFIGURATION_NAMES: Readonly<Record<keyof MigrationState, string>> = {
  sourceWorkspaceID: "source_workspace",
  sourceProjectID: "source_project",
  sourceVersionID: "source_version",
  destinationWorkspaceID: "destination_workspace",
  destinationFolderID: "destination_folder",
  targetSchemaVersion: "target_schema_version",
  planID: "plan_id",
};

type RequireStateValue = (
  state: MigrationState,
  key: keyof MigrationState,
) => string;
export const requireStateValue: RequireStateValue = (state, key) => {
  const value = state[key];
  if (!isPresentStateValue(value))
    throw fail("invalid-input", {
      nextAction: `Required migration field '${CONFIGURATION_NAMES[key]}' is missing.`,
    });
  return value;
};

type StateSelection = (state: MigrationState) => MigrationSelection;
export const stateSelection: StateSelection = (state) => ({
  sourceWorkspaceID: requireStateValue(state, "sourceWorkspaceID"),
  sourceProjectID: requireStateValue(state, "sourceProjectID"),
  sourceVersionID: requireStateValue(state, "sourceVersionID"),
  destinationWorkspaceID: requireStateValue(state, "destinationWorkspaceID"),
  destinationFolderID: requireStateValue(state, "destinationFolderID"),
  ...(state.targetSchemaVersion === undefined
    ? {}
    : { targetSchemaVersion: state.targetSchemaVersion }),
});

type ChooseOptionValue = (
  options: readonly Option[],
  index: number,
) => string | undefined;
export const chooseOptionValue: ChooseOptionValue = (options, index) =>
  options[index]?.value;

type DebugParameter = () => string | true | undefined;
const debugParameter: DebugParameter = () => {
  const argument = process.argv.find((value) => value === "--debug" || value.startsWith("--debug="));
  if (argument === "--debug") return true;
  if (argument?.startsWith("--debug=")) return argument.slice("--debug=".length);
  return undefined;
};

type EventParametersFor = (
  operation: string,
  values?: Readonly<Record<string, EventParameterValue | undefined>>,
) => EventParameters;
export const eventParametersFor: EventParametersFor = (
  operation,
  values = {},
) =>
  Object.fromEntries(
    Object.entries({ operation, ...values, DEBUG: debugParameter() } as Record<
      string,
      EventParameterValue | undefined
    >).filter(isEventParameterEntry),
  );

type ListWorkspacesParameters = () => EventParameters;
export const listWorkspacesParameters: ListWorkspacesParameters = () =>
  eventParametersFor("list_workspaces");

type ListProjectsParameters = (sourceWorkspaceID: string) => EventParameters;
export const listProjectsParameters: ListProjectsParameters = (
  sourceWorkspaceID,
) =>
  eventParametersFor("list_projects", {
    SOURCE_WORKSPACE_ID: sourceWorkspaceID,
  });

type ListVersionsParameters = (
  sourceWorkspaceID: string,
  sourceProjectID: string,
) => EventParameters;
export const listVersionsParameters: ListVersionsParameters = (
  sourceWorkspaceID,
  sourceProjectID,
) =>
  eventParametersFor("list_versions", {
    SOURCE_WORKSPACE_ID: sourceWorkspaceID,
    SOURCE_PROJECT_ID: sourceProjectID,
  });

type CreateFolderParameters = (
  destinationWorkspaceID: string,
  folderName: string,
) => EventParameters;
export const createFolderParameters: CreateFolderParameters = (
  destinationWorkspaceID,
  folderName,
) =>
  eventParametersFor("create_folder", {
    DESTINATION_WORKSPACE_ID: destinationWorkspaceID,
    DESTINATION_FOLDER_ID: folderName,
  });

type ListFoldersParameters = (
  destinationWorkspaceID: string,
) => EventParameters;
export const listFoldersParameters: ListFoldersParameters = (
  destinationWorkspaceID,
) =>
  eventParametersFor("list_folders", {
    DESTINATION_WORKSPACE_ID: destinationWorkspaceID,
  });

type PlanParameters = (selection: MigrationSelection) => EventParameters;
export const planParameters: PlanParameters = (selection) =>
  eventParametersFor("plan_migration", {
    SOURCE_WORKSPACE_ID: selection.sourceWorkspaceID,
    SOURCE_PROJECT_ID: selection.sourceProjectID,
    SOURCE_VERSION_ID: selection.sourceVersionID,
    DESTINATION_WORKSPACE_ID: selection.destinationWorkspaceID,
    DESTINATION_FOLDER_ID: selection.destinationFolderID,
    TARGET_SCHEMA_VERSION: selection.targetSchemaVersion,
  });

type ExecuteParameters = (
  selection: MigrationSelection,
  planID: string,
  secretFileContents?: SecretEntries,
) => EventParameters;
export const executeParameters: ExecuteParameters = (
  selection,
  planID,
  secretFileContents,
) =>
  eventParametersFor("execute_migration", {
    PLAN_ID: planID,
    SOURCE_WORKSPACE_ID: selection.sourceWorkspaceID,
    SOURCE_PROJECT_ID: selection.sourceProjectID,
    SOURCE_VERSION_ID: selection.sourceVersionID,
    DESTINATION_WORKSPACE_ID: selection.destinationWorkspaceID,
    DESTINATION_FOLDER_ID: selection.destinationFolderID,
    TARGET_SCHEMA_VERSION: selection.targetSchemaVersion,
    CONFIRMED: true,
    SECRET_FILE_CONTENTS: secretFileContents,
  });
