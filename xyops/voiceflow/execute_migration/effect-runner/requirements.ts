import { OperationFault } from "../../contracts";
import { loadProjects } from "../../catalog";
import type {
  AuthContext,
  ExportArtifact,
  ImportedReceipt,
  MigrationPlan,
  ProjectRecord,
} from "../../types";
import type { MigrationWorkflowState } from "../../execute-migration-state-machine";

export const requireAuth = (state: MigrationWorkflowState): AuthContext => {
  if (state.context.auth === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.auth;
};
export const requireArtifact = (
  state: MigrationWorkflowState,
): ExportArtifact => {
  if (state.context.artifact === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.artifact;
};
export const requirePlan = (state: MigrationWorkflowState): MigrationPlan => {
  if (state.context.plan === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.plan;
};
export const requireImported = (
  state: MigrationWorkflowState,
): ImportedReceipt => {
  if (state.context.imported === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.imported;
};

export const resolveImportedVersionID = async (
  auth: AuthContext,
  imported: ImportedReceipt,
  workspaceID: string,
  load: typeof loadProjects,
): Promise<string> => {
  if (imported.versionID !== undefined) return imported.versionID;
  const projects = await load(auth, workspaceID);
  const project = projects.find(
    (candidate) => candidate.id === imported.projectID,
  );
  const versionID = project === undefined ? undefined : draftVersionID(project);
  if (versionID === undefined)
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      true,
      "missing-destination-version-id",
    );
  return versionID;
};
const draftVersionID = (project: ProjectRecord): string | undefined =>
  project.environments
    .map((environment) => environment.draftVersionID)
    .find(
      (versionID): versionID is string =>
        versionID !== undefined && versionID !== "",
    );
