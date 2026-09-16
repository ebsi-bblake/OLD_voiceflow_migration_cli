import { createXYOpsClient } from "../client";
import {
  isCreatedFolderResult,
  isOptionResult,
  isVoiceflowEnvelope,
} from "../guards";
import { requireEnvelopeResult } from "../validation";
import { fail } from "../diagnostics";
import type {
  EventParameters,
  MigrationSelection,
  XYOpsEventReference,
} from "../types";
import { bounded, chooseOption, PromptReader } from "../prompt";
import {
  createFolderParameters,
  listFoldersParameters,
  listProjectsParameters,
  listVersionsParameters,
  listWorkspacesParameters,
} from "../state";
import type { MigrationFileConfig, readXYOpsConfig } from "../config";

type MigrationContext = Readonly<{
  reader: PromptReader;
  client: ReturnType<typeof createXYOpsClient>;
  config: ReturnType<typeof readXYOpsConfig>;
  migrationConfig?: MigrationFileConfig;
}>;
export type { MigrationContext };

type ValidateConfiguredOption = (
  context: MigrationContext,
  configuredValue: string | undefined,
  eventReference: XYOpsEventReference,
  parameters: EventParameters,
  field: string,
) => Promise<void>;
const validateConfiguredOption: ValidateConfiguredOption = async (
  context,
  configuredValue,
  eventReference,
  parameters,
  field,
) => {
  if (configuredValue === undefined) return;
  const response = await context.client.readEvent(
    eventReference,
    parameters,
    isVoiceflowEnvelope(isOptionResult),
  );
  const options = readOptions(response, field);
  if (!options.some((option) => option.value === configuredValue))
    throw fail("configuration", {
      nextAction: `${field} does not identify a value available in XYOps.`,
    });
};

type ValidateConfiguredMigrationValues = (
  context: MigrationContext,
  selection: MigrationSelection,
) => Promise<void>;
const validateConfiguredSourceDetails: ValidateConfiguredMigrationValues =
  async (context, selection) => {
    const migrationConfig = context.migrationConfig;
    if (migrationConfig === undefined) return;
    const sourceWorkspaceID = selection.sourceWorkspaceID;
    const sourceProjectID = selection.sourceProjectID;
    const { config } = context;
    if (sourceWorkspaceID !== undefined)
      await validateConfiguredOption(
        context,
        migrationConfig.sourceProjectID,
        config.events.listProjects,
        listProjectsParameters(sourceWorkspaceID),
        "source_project",
      );
    if (sourceWorkspaceID !== undefined && sourceProjectID !== undefined)
      await validateConfiguredOption(
        context,
        migrationConfig.sourceVersionID,
        config.events.listVersions,
        listVersionsParameters(sourceWorkspaceID, sourceProjectID),
        "source_version",
      );
  };
const validateConfiguredSourceValues: ValidateConfiguredMigrationValues =
  async (context, selection) => {
    const migrationConfig = context.migrationConfig;
    if (migrationConfig === undefined) return;
    const { config } = context;
    await validateConfiguredOption(
      context,
      migrationConfig.sourceWorkspaceID,
      config.events.listWorkspaces,
      listWorkspacesParameters(),
      "source_workspace",
    );
    await validateConfiguredSourceDetails(context, selection);
  };
const validateConfiguredDestinationValues: ValidateConfiguredMigrationValues =
  async (context, selection) => {
    const migrationConfig = context.migrationConfig;
    if (migrationConfig === undefined) return;
    const { config } = context;
    const destinationWorkspaceID = selection.destinationWorkspaceID;
    await validateConfiguredOption(
      context,
      migrationConfig.destinationWorkspaceID,
      config.events.listWorkspaces,
      listWorkspacesParameters(),
      "destination_workspace",
    );
    if (destinationWorkspaceID !== undefined)
      await validateConfiguredOption(
        context,
        migrationConfig.destinationFolderID,
        config.events.listFolders,
        listFoldersParameters(destinationWorkspaceID),
        "destination_folder",
      );
  };
export const validateConfiguredMigrationValues: ValidateConfiguredMigrationValues =
  (context, selection) =>
    validateConfiguredSourceValues(context, selection).then(() =>
      validateConfiguredDestinationValues(context, selection),
    );

type ResolveConfiguredOption = (
  configuredValue: string,
  options: readonly { value: string; label: string }[],
  field: string,
) => string;
const normalizeCatalogName = (value: string): string =>
  value.normalize("NFC").trim().toLowerCase();

const pathSegments = (value: string, field: string): readonly string[] => {
  const segments = value.split("/").map((segment) => segment.trim());
  if (segments.some((segment) =>
    [...segment].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    }),
  ))
    throw fail("configuration", {
      nextAction: `${field} contains an invalid path segment.`,
    });
  return segments;
};

type ResolvePath = (
  value: string,
  field: string,
  minimumSegments: number,
) => readonly string[];
const resolvePath: ResolvePath = (value, field, minimumSegments) => {
  const segments = pathSegments(value, field);
  if (segments.length < minimumSegments)
    throw fail("configuration", {
      nextAction: `${field} must contain at least ${minimumSegments} path segments.`,
    });
  return segments;
};

const pathName = (value: string): string => {
  const suffix = value.lastIndexOf(" (");
  return suffix === -1 ? value : value.slice(0, suffix);
};

const matchesCatalogName = (left: string, right: string): boolean =>
  normalizeCatalogName(left) === normalizeCatalogName(right);

const resolveConfiguredOption: ResolveConfiguredOption = (
  configuredValue,
  options,
  field,
) => {
  const idMatch = options.find((option) => option.value === configuredValue);
  if (idMatch !== undefined) return idMatch.value;

  const nameMatches = options.filter((option) =>
    matchesCatalogName(option.label, configuredValue) ||
    matchesCatalogName(pathName(option.label), configuredValue),
  );
  if (nameMatches.length === 1) return nameMatches[0].value;
  if (nameMatches.length > 1)
    throw fail("configuration", {
      nextAction: `${field} is ambiguous because its name matches multiple catalog items.`,
    });
  throw fail("configuration", {
    nextAction: `${field} does not identify a value available in the Voiceflow catalog.`,
  });
};

type SelectConfiguredOrCatalog = (
  configuredValue: string | undefined,
  reader: PromptReader,
  client: ReturnType<typeof createXYOpsClient>,
  eventReference: XYOpsEventReference,
  parameters: EventParameters,
  title: string,
  field: string,
) => Promise<string>;
const selectConfiguredOrCatalog: SelectConfiguredOrCatalog = async (
  configuredValue,
  reader,
  client,
  eventReference,
  parameters,
  title,
  field,
) => {
  if (configuredValue === undefined)
    return selectCatalog(reader, client, eventReference, parameters, title);
  const response = await client.readEvent(
    eventReference,
    parameters,
    isVoiceflowEnvelope(isOptionResult),
  );
  return resolveConfiguredOption(
    configuredValue,
    readOptions(response, field),
    field,
  );
};

type SelectCatalog = (
  reader: PromptReader,
  client: ReturnType<typeof createXYOpsClient>,
  eventReference: XYOpsEventReference,
  parameters: EventParameters,
  title: string,
) => Promise<string>;
const selectCatalog: SelectCatalog = async (
  reader,
  client,
  eventReference,
  parameters,
  title,
) => {
  const response = await client.readEvent(
    eventReference,
    parameters,
    isVoiceflowEnvelope(isOptionResult),
  );
  return chooseOption(reader, title, readOptions(response, title));
};

const readOptions = (
  value: unknown,
  title: string,
): readonly { value: string; label: string }[] => {
  try {
    return requireEnvelopeResult(value, title, isOptionResult).options;
  } catch {
    throw fail("envelope", {
      nextAction: `${title} returned no usable options.`,
    });
  }
};

type SourceSelection = Pick<
  MigrationSelection,
  "sourceWorkspaceID" | "sourceProjectID" | "sourceVersionID"
>;
export type SelectSourceSelection = (
  context: MigrationContext,
) => Promise<SourceSelection>;

type SelectDefaultSourceVersion = (
  context: MigrationContext,
  workspaceID: string,
  projectID: string,
) => Promise<string>;
const selectDefaultSourceVersion: SelectDefaultSourceVersion = async ({
  reader,
  client,
  config,
}, workspaceID, projectID) => {
  const response = await client.readEvent(
    config.events.listVersions,
    listVersionsParameters(workspaceID, projectID),
    isVoiceflowEnvelope(isOptionResult),
  );
  const options = readOptions(response, "source_version");
  const draftDevelopment = options.find(
    (option) =>
      option.label.startsWith("[Draft] ") &&
      option.label.endsWith(" — Development"),
  );
  return draftDevelopment === undefined
    ? chooseOption(reader, "Source draft/published version", options)
    : draftDevelopment.value;
};

type SelectSourceVersion = (
  context: MigrationContext,
  workspaceID: string,
  projectID: string,
) => Promise<string>;
const selectSourceVersion: SelectSourceVersion = (
  context,
  workspaceID,
  projectID,
) =>
  context.migrationConfig?.sourceVersionID === undefined
    ? selectDefaultSourceVersion(context, workspaceID, projectID)
    : selectConfiguredOrCatalog(
        context.migrationConfig.sourceVersionID,
        context.reader,
        context.client,
        context.config.events.listVersions,
        listVersionsParameters(workspaceID, projectID),
        "Source draft/published version",
        "source_version",
      );

type ConfiguredSourceValues = Readonly<{
  workspace?: string;
  project?: string;
}>;
const configuredSourceValues = (
  migrationConfig: MigrationFileConfig | undefined,
): ConfiguredSourceValues => {
  if (migrationConfig?.sourcePath !== undefined) {
    const segments = resolvePath(migrationConfig.sourcePath, "source_path", 2);
    return { workspace: segments[0], project: segments.slice(1).join("/") };
  }
  const project = migrationConfig?.sourceFolderID === undefined
    ? migrationConfig?.sourceProjectID
    : `${migrationConfig.sourceFolderID}/${migrationConfig.sourceProjectID}`;
  return { workspace: migrationConfig?.sourceWorkspaceID, project };
};

export const selectSourceSelection: SelectSourceSelection = async (context) => {
  const { reader, client, config } = context;
  const configured = configuredSourceValues(context.migrationConfig);
  const configuredSourceWorkspace = configured.workspace;
  const sourceWorkspaceID = await selectConfiguredOrCatalog(
    configuredSourceWorkspace,
    reader,
    client,
    config.events.listWorkspaces,
    listWorkspacesParameters(),
    "Source workspace",
    "source_workspace",
  );
  const sourceProjectID = await selectConfiguredOrCatalog(
    configured.project,
    reader,
    client,
    config.events.listProjects,
    listProjectsParameters(sourceWorkspaceID),
    "Source project",
    "source_project",
  );
  const sourceVersionID = await selectSourceVersion(
    context,
    sourceWorkspaceID,
    sourceProjectID,
  );
  return { sourceWorkspaceID, sourceProjectID, sourceVersionID };
};

type DestinationSelection = Pick<
  MigrationSelection,
  "destinationWorkspaceID" | "destinationFolderID" | "targetSchemaVersion"
>;
export type SelectDestinationSelection = (
  context: MigrationContext,
) => Promise<DestinationSelection>;
type ConfirmFolderCreation = (
  reader: PromptReader,
  name: string,
) => Promise<boolean>;
const confirmFolderCreation: ConfirmFolderCreation = (reader, name) =>
  reader
    .ask(`Create destination folder '${name}'? (yes/no): `)
    .then((answer) => ["y", "yes"].includes(answer.trim().toLowerCase()));

type CreateDestinationFolder = (
  context: MigrationContext,
  workspaceID: string,
  name: string,
) => Promise<string | undefined>;
const createDestinationFolder: CreateDestinationFolder = async (
  { reader, client, config },
  workspaceID,
  name,
) => {
  console.log(`\nThe destination folder '${name}' does not exist.`);
  console.log(" ~ Declining creation returns to folder selection. ~");
  if (!(await confirmFolderCreation(reader, name))) return undefined;
  const response = await client.executeEvent(
    config.events.createFolder,
    createFolderParameters(workspaceID, name),
    isVoiceflowEnvelope(isCreatedFolderResult),
  );
  return requireEnvelopeResult(response, "create_folder", isCreatedFolderResult)
    .folder.value;
};

type ContinueDestinationFolderSelection = (
  createdFolderID: string | undefined,
  context: MigrationContext,
  workspaceID: string,
) => Promise<string>;
const continueDestinationFolderSelection: ContinueDestinationFolderSelection = (
  createdFolderID,
  context,
  workspaceID,
) =>
  createdFolderID === undefined
    ? selectInteractiveDestinationFolder(context, workspaceID)
    : Promise.resolve(createdFolderID);

type SelectInteractiveDestinationFolder = (
  context: MigrationContext,
  workspaceID: string,
) => Promise<string>;
const selectInteractiveDestinationFolder: SelectInteractiveDestinationFolder = async (
  context,
  workspaceID,
) => {
  const { reader, client, config } = context;
  const response = await client.readEvent(
    config.events.listFolders,
    listFoldersParameters(workspaceID),
    isVoiceflowEnvelope(isOptionResult),
  );
  const options = requireEnvelopeResult(
    response,
    "destination_folder",
    isOptionResult,
  ).options;
  console.log("\nDestination folder:");
  options.forEach((option, index) =>
    console.log(
      `${index + 1}. ${bounded(option.label)} (${bounded(option.value, 100)})`,
    ),
  );
  const answer = (
    await reader.ask("Select number or enter a new folder name: ")
  ).trim();
  if (answer === "")
    throw fail("invalid-input", {
      nextAction: "A destination folder name is required.",
    });
  const number = Number.parseInt(answer, 10);
  if (Number.isInteger(number) && number >= 1 && number <= options.length)
    return options[number - 1].value;
  if (isOutOfRangeFolderNumber(answer, number, options.length)) {
    console.log("\nPlease select one of the displayed folder numbers.");
    return selectInteractiveDestinationFolder(context, workspaceID);
  }
  const exact = resolveFolderInput(answer, options);
  if (exact !== undefined) return exact;
  const created = await createDestinationFolder(context, workspaceID, answer);
  return continueDestinationFolderSelection(created, context, workspaceID);
};

type IsOutOfRangeFolderNumber = (
  answer: string,
  number: number,
  optionCount: number,
) => boolean;
const isOutOfRangeFolderNumber: IsOutOfRangeFolderNumber = (
  answer,
  number,
  optionCount,
) =>
  /^\d+$/.test(answer) &&
  (!Number.isInteger(number) || number < 1 || number > optionCount);

const resolveFolderInput = (
  value: string,
  options: readonly { value: string; label: string }[],
): string | undefined => {
  const idMatch = options.find((option) => option.value === value);
  if (idMatch) return idMatch.value;
  const matches = options.filter((option) =>
    matchesCatalogName(option.label, value),
  );
  if (matches.length > 1)
    throw fail("configuration", {
      nextAction:
        "The folder name is ambiguous; provide a canonical folder ID.",
    });
  return matches[0]?.value;
};

type ConfiguredDestinationValues = Readonly<{
  workspace?: string;
  folder?: string;
}>;
const configuredDestinationValues = (
  migrationConfig: MigrationFileConfig | undefined,
): ConfiguredDestinationValues => {
  if (migrationConfig?.destinationPath !== undefined) {
    const segments = resolvePath(
      migrationConfig.destinationPath,
      "destination_path",
      2,
    );
    return { workspace: segments[0], folder: segments.slice(1).join("/") };
  }
  return {
    workspace: migrationConfig?.destinationWorkspaceID,
    folder: migrationConfig?.destinationFolderID,
  };
};

export const selectDestinationSelection: SelectDestinationSelection = async (
  context,
) => {
  const { reader, client, config } = context;
  const configured = configuredDestinationValues(context.migrationConfig);
  const configuredDestinationWorkspace = configured.workspace;
  const destinationWorkspaceID = await selectConfiguredOrCatalog(
    configuredDestinationWorkspace,
    reader,
    client,
    config.events.listWorkspaces,
    listWorkspacesParameters(),
    "Destination workspace",
    "destination_workspace",
  );
  const configuredFolder = configured.folder;
  const destinationFolderID =
    configuredFolder === undefined
      ? await selectInteractiveDestinationFolder(
          context,
          destinationWorkspaceID,
        )
      : await (async () => {
          const response = await client.readEvent(
            config.events.listFolders,
            listFoldersParameters(destinationWorkspaceID),
            isVoiceflowEnvelope(isOptionResult),
          );
          const options = readOptions(response, "destination_folder");
          const resolved = resolveFolderInput(configuredFolder, options);
          if (resolved !== undefined) return resolved;
          const created = await createDestinationFolder(
            context,
            destinationWorkspaceID,
            configuredFolder,
          );
          if (created !== undefined) return created;
          throw fail("configuration", {
            nextAction: "Destination folder creation was declined.",
          });
        })();
  return {
    destinationWorkspaceID,
    destinationFolderID,
    targetSchemaVersion: context.migrationConfig?.targetSchemaVersion,
  };
};
