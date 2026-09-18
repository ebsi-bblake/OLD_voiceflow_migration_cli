import type {
  EventParameterValue,
  EventParameters,
  MigrationSelection,
  Option,
  SecretEntries,
} from "./types";
import {
  buildExecuteMigrationParameters,
  buildPlanMigrationParameters,
  MigrationParameterName,
} from "../migration-parameters";
import { VoiceflowOperation } from "../voiceflow/types";
import type { VoiceflowOperation as VoiceflowOperationType } from "../voiceflow/types";
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
  const argument = process.argv.find(
    (value) => value === "--debug" || value.startsWith("--debug="),
  );
  if (argument === "--debug") return true;
  if (argument?.startsWith("--debug="))
    return argument.slice("--debug=".length);
  return undefined;
};

type MigrationParameterValues = Readonly<
  Partial<Record<MigrationParameterName, EventParameterValue | undefined>>
>;

type EventParametersFor = (
  operation: VoiceflowOperationType,
  values?: MigrationParameterValues,
) => EventParameters;
export const eventParametersFor: EventParametersFor = (
  operation,
  values = {},
) =>
  Object.fromEntries(
    Object.entries({
      [MigrationParameterName.operation]: operation,
      ...values,
      [MigrationParameterName.debug]: debugParameter(),
    } as Record<string, EventParameterValue | undefined>).filter(
      isEventParameterEntry,
    ),
  );

type ListWorkspacesParameters = () => EventParameters;
export const listWorkspacesParameters: ListWorkspacesParameters = () =>
  eventParametersFor(VoiceflowOperation.ListWorkspaces);

type ListProjectsParameters = (sourceWorkspaceID: string) => EventParameters;
export const listProjectsParameters: ListProjectsParameters = (
  sourceWorkspaceID,
) =>
  eventParametersFor(VoiceflowOperation.ListProjects, {
    [MigrationParameterName.sourceWorkspaceID]: sourceWorkspaceID,
  });

type ListVersionsParameters = (
  sourceWorkspaceID: string,
  sourceProjectID: string,
) => EventParameters;
export const listVersionsParameters: ListVersionsParameters = (
  sourceWorkspaceID,
  sourceProjectID,
) =>
  eventParametersFor(VoiceflowOperation.ListVersions, {
    [MigrationParameterName.sourceWorkspaceID]: sourceWorkspaceID,
    [MigrationParameterName.sourceProjectID]: sourceProjectID,
  });

type CreateFolderParameters = (
  destinationWorkspaceID: string,
  folderName: string,
) => EventParameters;
export const createFolderParameters: CreateFolderParameters = (
  destinationWorkspaceID,
  folderName,
) =>
  eventParametersFor(VoiceflowOperation.CreateFolder, {
    [MigrationParameterName.destinationWorkspaceID]: destinationWorkspaceID,
    [MigrationParameterName.destinationFolderID]: folderName,
  });

type ListFoldersParameters = (
  destinationWorkspaceID: string,
) => EventParameters;
export const listFoldersParameters: ListFoldersParameters = (
  destinationWorkspaceID,
) =>
  eventParametersFor(VoiceflowOperation.ListFolders, {
    [MigrationParameterName.destinationWorkspaceID]: destinationWorkspaceID,
  });

type PlanParameters = (selection: MigrationSelection) => EventParameters;
export const planParameters: PlanParameters = (selection) =>
  buildPlanMigrationParameters(selection);

type ExecuteParameters = (
  selection: MigrationSelection,
  planID: string,
  secretFileContents?: SecretEntries,
) => EventParameters;
export const executeParameters: ExecuteParameters = (
  selection,
  planID,
  secretFileContents,
) => buildExecuteMigrationParameters(selection, planID, secretFileContents);
