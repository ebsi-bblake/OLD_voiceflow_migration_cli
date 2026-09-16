import {
  folderOptions,
  loadFolders,
  loadProjects,
  loadWorkspaces,
  projectOptions,
  versionOptions,
  workspaceOptions,
  type Option,
  type FolderRecord,
  type ProjectRecord,
  type WorkspaceRecord,
} from "../catalog";
import type { AuthContext } from "../auth";
import { OperationFault } from "../contracts";
import type { MigrationPlan, MigrationSelection } from "../types";
import {
  parseFolderID,
  parseSchemaVersion,
  parseProjectID,
  parseVersionID,
  parseWorkspaceID,
} from "../validation";

type NormalizeMigrationSelection = (
  input: MigrationSelection,
) => MigrationSelection;
export const normalizeMigrationSelection: NormalizeMigrationSelection = (
  input,
) => ({
  sourceWorkspaceID: parseWorkspaceID(input.sourceWorkspaceID),
  sourceProjectID: parseProjectID(input.sourceProjectID),
  sourceVersionID: parseVersionID(input.sourceVersionID),
  destinationWorkspaceID: parseWorkspaceID(input.destinationWorkspaceID),
  destinationFolderID: parseFolderID(input.destinationFolderID),
  ...(input.targetSchemaVersion === undefined
    ? {}
    : { targetSchemaVersion: parseSchemaVersion(input.targetSchemaVersion) }),
});

type FindLabel = (options: readonly Option[], value: string) => string;
const findLabel: FindLabel = (options, value) => {
  const option = options.find((item) => item.value === value);
  if (!option) throw new OperationFault("NOT_FOUND");
  return option.label;
};

import { planID } from "./plan-id";

type CatalogSnapshot = readonly [
  readonly WorkspaceRecord[],
  readonly ProjectRecord[],
  readonly FolderRecord[],
];

type LoadCatalogForSelection = (
  auth: AuthContext,
) => (selection: MigrationSelection) => Promise<CatalogSnapshot>;
const loadCatalogForSelection: LoadCatalogForSelection =
  (auth) => (selection) =>
    Promise.all([
      loadWorkspaces(auth),
      loadProjects(auth, selection.sourceWorkspaceID),
      loadFolders(auth, selection.destinationWorkspaceID),
    ]);

type CreatePlanFromCatalog = (
  selection: MigrationSelection,
  catalog: CatalogSnapshot,
) => (planID: string) => MigrationPlan;
const createPlanFromCatalog: CreatePlanFromCatalog =
  (selection, [workspaces, projects, destinationFolders]) =>
  (planID) => {
    const workspaceChoices = workspaceOptions(workspaces);
    const projectChoices = projectOptions(selection.sourceWorkspaceID)(projects);
    const versionChoices = versionOptions(
      selection.sourceWorkspaceID,
      selection.sourceProjectID,
    )(projects);
    const folderChoices = folderOptions(selection.destinationWorkspaceID)(
      destinationFolders,
    );
    return {
      planID,
      selection,
      labels: {
        sourceWorkspace: findLabel(
          workspaceChoices,
          selection.sourceWorkspaceID,
        ),
        sourceProject: findLabel(projectChoices, selection.sourceProjectID),
        sourceVersion: findLabel(versionChoices, selection.sourceVersionID),
        destinationWorkspace: findLabel(
          workspaceChoices,
          selection.destinationWorkspaceID,
        ),
        destinationFolder: findLabel(
          folderChoices,
          selection.destinationFolderID,
        ),
      },
    };
  };

type PlanCatalogSelection = (
  selection: MigrationSelection,
) => (catalog: CatalogSnapshot) => Promise<MigrationPlan>;
const planCatalogSelection: PlanCatalogSelection = (selection) => (catalog) =>
  planID(selection).then(createPlanFromCatalog(selection, catalog));

type BuildPlanFromSelection = (
  auth: AuthContext,
) => (selection: MigrationSelection) => Promise<MigrationPlan>;
const buildPlanFromSelection: BuildPlanFromSelection = (auth) => (selection) =>
  loadCatalogForSelection(auth)(selection).then(
    planCatalogSelection(selection),
  );

type BuildMigrationPlan = (
  auth: AuthContext,
  input: MigrationSelection,
) => Promise<MigrationPlan>;
export const buildMigrationPlan: BuildMigrationPlan = (auth, input) =>
  Promise.resolve()
    .then(() => normalizeMigrationSelection(input))
    .then(buildPlanFromSelection(auth));
