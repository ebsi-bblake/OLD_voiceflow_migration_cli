import type { AuthContext } from "../types";
import { debugLog } from "../debug";
import { syncCatalog } from "../logux";
import { OperationFault } from "../contracts";
import { requireVoiceflowString } from "../validation";
import { isNumericFolderID } from "../guards";
import type {
  EnvironmentRecord,
  FolderRecord,
  Option,
  ProjectRecord,
  WorkspaceRecord,
} from "../types";
import {
  parseFolder,
  parseProject,
  parseWorkspace,
  projectRows,
} from "./record-parsers";

type RawRow = Readonly<Record<string, unknown>>;
type VersionField = "draftVersionID" | "publishedVersionID";
type VersionKind = readonly [VersionField, string];
const VERSION_KINDS: readonly VersionKind[] = [
  ["draftVersionID", "[Draft]"],
  ["publishedVersionID", "[Published]"],
];

type NormalizeIDAsync = (value: string) => Promise<string>;
const normalizeIDAsync: NormalizeIDAsync = (value) =>
  Promise.resolve().then(() => requireVoiceflowString(value));

type ProjectOptionValues = (
  rows: readonly ProjectRecord[],
  folders: readonly FolderRecord[],
) => Option[];
const projectOptionValues: ProjectOptionValues = (rows, folders) =>
  rows.map((row) => {
    const folder = folders.find((candidate) => candidate.id === row.folderID);
    const path =
      folder === undefined
        ? row.label
        : `${folderPath(folder, folders)}/${row.label}`;
    return { value: row.id, label: `${path} (${row.id})` };
  });

const folderPath = (
  folder: FolderRecord,
  folders: readonly FolderRecord[],
): string => {
  const parent = folders.find((candidate) => candidate.id === folder.parentID);
  return parent === undefined
    ? folder.label
    : `${folderPath(parent, folders)}/${folder.label}`;
};

type OptionValues = (
  rows: readonly Readonly<{ id: string; label: string }>[],
) => Option[];
const optionValues: OptionValues = (rows) =>
  rows.map((row) => ({ value: row.id, label: row.label }));

type SortOptionsByLabel = (options: readonly Option[]) => Option[];
const sortOptionsByLabel: SortOptionsByLabel = (options) =>
  [...options].sort((left, right) => left.label.localeCompare(right.label));

type BuildOptions = (
  rows: readonly Readonly<{ id: string; label: string }>[],
) => Option[];
const buildOptions: BuildOptions = (rows) =>
  sortOptionsByLabel(optionValues(rows));

type SelectProjectsInWorkspace = (
  rows: readonly ProjectRecord[],
  workspaceID: string,
) => readonly ProjectRecord[];
const selectProjectsInWorkspace: SelectProjectsInWorkspace = (
  rows,
  workspaceID,
) => rows.filter((row) => row.workspaceID === workspaceID);

type SelectFoldersInWorkspace = (
  rows: readonly FolderRecord[],
  workspaceID: string,
) => readonly FolderRecord[];
const selectFoldersInWorkspace: SelectFoldersInWorkspace = (
  rows,
  workspaceID,
) =>
  rows.filter(
    (row) => row.workspaceID === workspaceID && isNumericFolderID(row.id),
  );

type LoadCatalogRows = (
  auth: AuthContext,
  wanted: readonly string[],
) => (workspaceID: string) => Promise<readonly RawRow[]>;
const loadCatalogRows: LoadCatalogRows = (auth, wanted) => (workspaceID) =>
  syncCatalog(auth, `workspace/${workspaceID}`, wanted);

type BuildVersionOptions = (
  project: ProjectRecord,
  environment: EnvironmentRecord,
) => Option[];
const buildVersionOptions: BuildVersionOptions = (project, environment) =>
  VERSION_KINDS.flatMap(([key, prefix]) => {
    const value = environment[key];
    return value === undefined
      ? []
      : [
          {
            value,
            label: `${prefix} ${project.label} — ${environment.label}`,
          },
        ];
  });

type LoadWorkspaces = (
  auth: AuthContext,
) => Promise<readonly WorkspaceRecord[]>;
export const loadWorkspaces: LoadWorkspaces = (auth) =>
  syncCatalog(auth, `creator/${auth.creatorID}`, [
    "workspace.CRUD:REPLACE",
  ]).then((rows) => {
    const workspaces = projectRows(parseWorkspace)(rows);
    debugLog("catalog", "workspaces", {
      rawRowCount: rows.length,
      parsedRowCount: workspaces.length,
      parsedWorkspaceIDs: workspaces.map(({ id }) => id),
      parsedWorkspaceLabels: workspaces.map(({ label }) => label),
    });
    return workspaces;
  });

type LoadProjects = (
  auth: AuthContext,
  workspaceID: string,
) => Promise<readonly ProjectRecord[]>;
type ReconcileProjectFolders = (
  projects: readonly ProjectRecord[],
  assistants: readonly ProjectRecord[],
) => readonly ProjectRecord[];
const reconcileProjectFolders: ReconcileProjectFolders = (
  projects,
  assistants,
) => {
  const folderIDs = new Map(
    assistants
      .filter((assistant) => assistant.folderID !== undefined)
      .map((assistant) => [assistant.id, assistant.folderID]),
  );
  return projects.map((project) => {
    const folderID = folderIDs.get(project.id);
    return folderID === undefined ? project : { ...project, folderID };
  });
};
const parseProjectRowsWithDebug = (
  source: string,
  rows: readonly RawRow[],
): readonly ProjectRecord[] => {
  const projects = projectRows(parseProject)(rows);
  debugLog("catalog", "projects", {
    source,
    rawRowCount: rows.length,
    parsedRowCount: projects.length,
    parsedProjectIDs: projects.map(({ id }) => id),
    parsedProjectWorkspaceIDs: [...new Set(projects.map(({ workspaceID }) => workspaceID))],
  });
  return projects;
};

export const loadProjects: LoadProjects = (auth, workspaceID) =>
  normalizeIDAsync(workspaceID).then((id) =>
    Promise.all([
      loadCatalogRows(auth, ["project.CRUD:REPLACE"])(id).then((rows) =>
        parseProjectRowsWithDebug("project.CRUD:REPLACE", rows),
      ),
      loadCatalogRows(auth, ["assistant.REPLACE"])(id).then((rows) =>
        parseProjectRowsWithDebug("assistant.REPLACE", rows),
      ),
    ]).then(([projects, assistants]) => {
      const reconciled = reconcileProjectFolders(projects, assistants);
      debugLog("catalog", "project-folders", {
        projectRowCount: projects.length,
        assistantRowCount: assistants.length,
        reconciledRowCount: reconciled.length,
        reconciledFolderCount: reconciled.filter(
          ({ folderID }) => folderID !== undefined,
        ).length,
      });
      return reconciled;
    }),
  );

type LoadFolders = (
  auth: AuthContext,
  workspaceID: string,
) => Promise<readonly FolderRecord[]>;
export const loadFolders: LoadFolders = (auth, workspaceID) =>
  normalizeIDAsync(workspaceID)
    .then(loadCatalogRows(auth, ["workspace-folder.REPLACE"]))
    .then((rows) => {
      const folders = projectRows(parseFolder)(rows);
      debugLog("catalog", "folders", {
        rawRowCount: rows.length,
        parsedRowCount: folders.length,
        parsedFolderIDs: folders.map(({ id }) => id),
      });
      return folders;
    });

type WorkspaceOptions = (rows: readonly WorkspaceRecord[]) => Option[];
export const workspaceOptions: WorkspaceOptions = buildOptions;

type ProjectOptions = (
  workspaceID: string,
  folders?: readonly FolderRecord[],
) => (rows: readonly ProjectRecord[]) => Option[];
export const projectOptions: ProjectOptions =
  (workspaceID, folders = []) =>
  (rows) => {
    const id = requireVoiceflowString(workspaceID);
    const projects = selectProjectsInWorkspace(rows, id);
    const options = sortOptionsByLabel(projectOptionValues(projects, folders));
    debugLog("catalog", "project-options", {
      requestedWorkspaceID: id,
      inputProjectRowCount: rows.length,
      workspaceProjectRowCount: projects.length,
      folderRowCount: folders.length,
      optionCount: options.length,
      optionValues: options.map(({ value }) => value),
      optionLabels: options.map(({ label }) => label),
    });
    return options;
  };

type FolderOptions = (
  workspaceID: string,
) => (rows: readonly FolderRecord[]) => Option[];
export const folderOptions: FolderOptions = (workspaceID) => (rows) => {
  const id = requireVoiceflowString(workspaceID);
  return buildOptions(selectFoldersInWorkspace(rows, id));
};

type VersionOptions = (
  workspaceID: string,
  projectID: string,
) => (rows: readonly ProjectRecord[]) => Option[];
export const versionOptions: VersionOptions =
  (workspaceID, projectID) => (rows) => {
    const workspace = requireVoiceflowString(workspaceID);
    const id = requireVoiceflowString(projectID);
    const project = rows.find(
      (row) => row.id === id && row.workspaceID === workspace,
    );
    if (!project) throw new OperationFault("NOT_FOUND");
    const options = project.environments.flatMap((environment) =>
      buildVersionOptions(project, environment),
    );
    return sortOptionsByLabel(options);
  };

type ListWorkspaces = (auth: AuthContext) => Promise<Option[]>;
export const listWorkspaces: ListWorkspaces = (auth) =>
  loadWorkspaces(auth).then((workspaces) => {
    const options = buildOptions(workspaces);
    debugLog("catalog", "workspace-options", {
      parsedWorkspaceRowCount: workspaces.length,
      optionCount: options.length,
      optionValues: options.map(({ value }) => value),
      optionLabels: options.map(({ label }) => label),
    });
    return options;
  });

type ListProjects = (
  auth: AuthContext,
  workspaceID: string,
) => Promise<Option[]>;
export const listProjects: ListProjects = (auth, workspaceID) =>
  Promise.all([
    loadProjects(auth, workspaceID),
    loadFolders(auth, workspaceID),
  ]).then(([projects, folders]) =>
    projectOptions(workspaceID, folders)(projects),
  );

type ListFolders = (
  auth: AuthContext,
  workspaceID: string,
) => Promise<Option[]>;
export const listFolders: ListFolders = (auth, workspaceID) =>
  loadFolders(auth, workspaceID).then(folderOptions(workspaceID));

type ListVersions = (
  auth: AuthContext,
  workspaceID: string,
  projectID: string,
) => Promise<Option[]>;
export const listVersions: ListVersions = (auth, workspaceID, projectID) =>
  loadProjects(auth, workspaceID).then(versionOptions(workspaceID, projectID));
