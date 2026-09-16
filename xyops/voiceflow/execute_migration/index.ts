import { resolveVoiceflowAuth } from "../auth";
import { exportVersion, resolveTargetSchemaVersion } from "../export";
import { importVersion } from "../import";
import { buildMigrationPlan } from "../planning";
import { failure, OperationFault, success } from "../contracts";
import { isConfirmationGranted } from "../guards";
import type { Envelope, ExecuteResult } from "../types";
import { createUUID } from "../uuid";
import { createProjectSecrets } from "../logux";
import { parseSecretEntries, resolveConfiguredSecretValues } from "../secrets";
import { loadProjects } from "../catalog";
import { findArchiveCandidate } from "../archive";
import { renameProject } from "../logux/rename-project";
import { confirmProjectRename } from "../catalog/rename-barrier";
import type { MigrationStage } from "../execute-migration-state-machine";

export type { ExecuteResult } from "../types";

import { migrationSelection } from "./arguments";

const normalizeConfirmation = (confirmed: boolean | undefined): boolean =>
  confirmed ?? false;
const normalizeSchemaVersion = (
  version: string | undefined,
): string | undefined => version;


const executeConfirmedMigration = async (
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
): Promise<Envelope<ExecuteResult>> => {
  let stage: MigrationStage = "AUTHENTICATION";
  try {
    const auth = await resolveVoiceflowAuth(token);
    stage = "EXPORT";
    const artifact = await exportVersion(auth, sourceVersionID);
    const resolvedSchemaVersion =
      targetSchemaVersion ?? resolveTargetSchemaVersion(artifact);
    stage = "PLANNING";
    const selection = migrationSelection(
      sourceWorkspaceID,
      sourceProjectID,
      sourceVersionID,
      destinationWorkspaceID,
      destinationFolderID,
      resolvedSchemaVersion,
    );
    const plan = await buildMigrationPlan(auth, selection);
    ensureMatchingPlan(plan.planID, planID);
    stage = "ARCHIVE_PREFLIGHT";
    const [sourceProjects, destinationProjects] = await Promise.all([
      loadProjects(auth, sourceWorkspaceID),
      loadProjects(auth, destinationWorkspaceID),
    ]);
    const sourceProject = sourceProjects.find(
      (project) => project.id === sourceProjectID,
    );
    if (sourceProject === undefined) throw new OperationFault("NOT_FOUND");
    const archive = findArchiveCandidate(
      destinationProjects,
      destinationWorkspaceID,
      destinationFolderID,
      sourceProject.label,
      { now: () => new Date() },
    );
    if (archive !== undefined) {
      stage = "ARCHIVE";
      await renameProject(
        auth,
        destinationWorkspaceID,
        archive.project.id,
        destinationFolderID,
        archive.name,
      );
      await confirmProjectRename(auth, {
        workspaceID: destinationWorkspaceID,
        folderID: destinationFolderID,
        projectID: archive.project.id,
        name: archive.name,
      });
    }
    stage = "IMPORT";
    const imported = await importVersion(
      auth,
      artifact,
      destinationWorkspaceID,
      destinationFolderID,
      resolvedSchemaVersion,
    );
    stage = "SECRET_INPUT";
    const configuredSecrets = parseSecretFileContents(secretFileContents);
    stage = "SECRET_RESOLUTION";
    const secrets = await resolveConfiguredSecretValues(
      auth,
      configuredSecrets,
    );
    stage = "SECRET_CREATION";
    await createProjectSecrets(auth, imported.projectID, secrets);
    const result: ExecuteResult = {
      planID,
      exportStatus: artifact.status,
      exportBytes: artifact.bytes.byteLength,
      importStatus: imported.importStatus,
      importBytes: imported.importBytes,
      selected: plan.selection,
      imported,
    };
    return success("execute_migration", operationID, result);
  } catch (error) {
    return failure(
      "execute_migration",
      operationID,
      addFailureStage(error, stage),
    );
  }
};

const addFailureStage = (error: unknown, stage: string): unknown =>
  error instanceof OperationFault
    ? new OperationFault(
        error.code,
        error.retryable,
        [stage, error.diagnostic]
          .filter((value): value is string => value !== undefined)
          .join(" "),
      )
    : new Error(
        `stage=${stage} error=${error instanceof Error ? error.message : String(error)}`,
      );

const parseSecretFileContents = (contents: unknown) =>
  contents === undefined ? [] : parseSecretEntries(contents);
const ensureMatchingPlan = (
  actualPlanID: string,
  expectedPlanID: string,
): void => {
  if (actualPlanID !== expectedPlanID)
    throw new OperationFault("PLAN_MISMATCH");
};

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
export const main: Main = async (
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
    : failure(
        "execute_migration",
        operationID,
        new OperationFault("CONFIRMATION_REQUIRED"),
      );
};
