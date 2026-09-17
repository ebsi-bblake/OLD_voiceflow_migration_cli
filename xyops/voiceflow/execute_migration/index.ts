import { resolveVoiceflowAuth } from "../auth";
import { exportVersion, resolveTargetSchemaVersion } from "../export";
import { importVersion } from "../import";
import { buildMigrationPlan } from "../planning";
import { failure, OperationFault, success } from "../contracts";
import { isConfirmationGranted } from "../guards";
import type {
  AuthContext,
  Envelope,
  ExecuteResult,
  ImportedReceipt,
  ProjectRecord,
} from "../types";
import { createUUID } from "../uuid";
import { reconcileProjectSecrets } from "../logux";
import { parseSecretEntries, resolveConfiguredSecretValues } from "../secrets";
import { loadProjects } from "../catalog";
import { findArchiveCandidate } from "../archive";
import { renameProject } from "../logux/rename-project";
import { confirmProjectRename } from "../catalog/rename-barrier";
import {
  createMigrationWorkflow,
  transitionMigrationWorkflow,
  type MigrationWorkflowEffect,
  type MigrationWorkflowEvent,
  type MigrationWorkflowState,
} from "../execute-migration-state-machine";

export type { ExecuteResult } from "../types";

import { migrationSelection } from "./arguments";

const normalizeConfirmation = (confirmed: boolean | undefined): boolean =>
  confirmed ?? false;
const normalizeSchemaVersion = (
  version: string | undefined,
): string | undefined => version;

/* oxlint-disable complexity -- the effect interpreter mirrors the explicit workflow contract. */
export type MigrationRuntimeDependencies = Readonly<{
  readonly authenticate: typeof resolveVoiceflowAuth;
  readonly exportVersion: typeof exportVersion;
  readonly buildPlan: typeof buildMigrationPlan;
  readonly loadProjects: typeof loadProjects;
  readonly renameProject: typeof renameProject;
  readonly confirmRename: typeof confirmProjectRename;
  readonly importVersion: typeof importVersion;
  readonly resolveSecrets: typeof resolveConfiguredSecretValues;
  readonly reconcileSecrets: typeof reconcileProjectSecrets;
  readonly observeState?: (state: MigrationWorkflowState) => void;
}>;

const defaultMigrationRuntimeDependencies: MigrationRuntimeDependencies = {
  authenticate: resolveVoiceflowAuth,
  exportVersion,
  buildPlan: buildMigrationPlan,
  loadProjects,
  renameProject,
  confirmRename: confirmProjectRename,
  importVersion,
  resolveSecrets: resolveConfiguredSecretValues,
  reconcileSecrets: reconcileProjectSecrets,
};

/* The reducer owns stage advancement; this adapter only translates effects into I/O and results into events. */
export const executeConfirmedMigration = async (
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
  dependencies: MigrationRuntimeDependencies = defaultMigrationRuntimeDependencies,
): Promise<Envelope<ExecuteResult>> => {
  const selection = migrationSelection(
    sourceWorkspaceID,
    sourceProjectID,
    sourceVersionID,
    destinationWorkspaceID,
    destinationFolderID,
    targetSchemaVersion,
  );
  let workflow: MigrationWorkflowState = createMigrationWorkflow({
    operationID,
    planID,
    selection,
  });
  let auth: AuthContext | undefined;
  let artifact: Awaited<ReturnType<typeof exportVersion>> | undefined;
  let plan: Awaited<ReturnType<typeof buildMigrationPlan>> | undefined;
  let imported: ImportedReceipt | undefined;
  let archive: ReturnType<typeof findArchiveCandidate>;
  let secrets: Awaited<ReturnType<typeof resolveConfiguredSecretValues>> = [];
  let settled = false;

  return new Promise<Envelope<ExecuteResult>>((resolve) => {
    const settle = (result: Envelope<ExecuteResult>): void => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };
    const failAtCurrentStage = (error: unknown): Promise<void> => {
      const diagnostic = addFailureStage(error, workflow.stage);
      const detail =
        diagnostic instanceof OperationFault
          ? diagnostic.diagnostic
          : String(diagnostic);
      if (
        diagnostic instanceof OperationFault &&
        diagnostic.code === "IMPORT_OUTCOME_UNKNOWN"
      )
        return dispatch({ kind: "import-unknown", diagnostic: detail });
      if (
        workflow.stage === "ARCHIVE" &&
        diagnostic instanceof OperationFault &&
        ["DEPENDENCY_FAILURE", "DEPENDENCY_TIMEOUT"].includes(diagnostic.code)
      )
        return dispatch({
          kind: "archive-durability-unknown",
          diagnostic: detail,
        });
      if (
        workflow.stage === "SECRET_CREATION" &&
        diagnostic instanceof OperationFault &&
        diagnostic.code === "DEPENDENCY_TIMEOUT"
      )
        return dispatch({ kind: "secret-unknown", diagnostic: detail });
      return dispatch({
        kind: "dependency-failure",
        code:
          diagnostic instanceof OperationFault &&
          [
            "AUTHENTICATION_FAILED",
            "DEPENDENCY_FAILURE",
            "INTERNAL_ERROR",
            "NOT_FOUND",
            "INVALID_ARGUMENT",
          ].includes(diagnostic.code)
            ? (diagnostic.code as
                | "AUTHENTICATION_FAILED"
                | "DEPENDENCY_FAILURE"
                | "INTERNAL_ERROR"
                | "NOT_FOUND"
                | "INVALID_ARGUMENT")
            : "INTERNAL_ERROR",
        diagnostic: detail,
      });
    };
    const dispatch = async (event: MigrationWorkflowEvent): Promise<void> => {
      const transition = transitionMigrationWorkflow(workflow, event);
      if (!transition.accepted) return;
      workflow = transition.state;
      dependencies.observeState?.(workflow);
      await executeEffects(transition.effects);
    };
    const executeEffects = async (
      effects: readonly MigrationWorkflowEffect[],
    ): Promise<void> => {
      for (const effect of effects) {
        try {
          if (effect.kind === "authenticate") {
            auth = await dependencies.authenticate(token);
            await dispatch({ kind: "authentication-succeeded" });
          } else if (effect.kind === "export" && auth !== undefined) {
            artifact = await dependencies.exportVersion(auth, sourceVersionID);
            await dispatch({
              kind: "export-succeeded",
              data: { bytes: artifact.bytes.byteLength },
            });
          } else if (
            effect.kind === "plan" &&
            auth !== undefined &&
            artifact !== undefined
          ) {
            const resolvedSelection = migrationSelection(
              sourceWorkspaceID,
              sourceProjectID,
              sourceVersionID,
              destinationWorkspaceID,
              destinationFolderID,
              targetSchemaVersion ?? resolveTargetSchemaVersion(artifact),
            );
            plan = await dependencies.buildPlan(auth, resolvedSelection);
            await dispatch({
              kind: "plan-succeeded",
              planID: plan.planID,
              data: { selection: plan.selection },
            });
          } else if (
            effect.kind === "load-archive-candidates" &&
            auth !== undefined &&
            plan !== undefined
          ) {
            const [sourceProjects, destinationProjects] = await Promise.all([
              dependencies.loadProjects(auth, sourceWorkspaceID),
              dependencies.loadProjects(auth, destinationWorkspaceID),
            ]);
            const sourceProject = sourceProjects.find(
              (candidate) => candidate.id === sourceProjectID,
            );
            if (sourceProject === undefined)
              throw new OperationFault("NOT_FOUND");
            archive = findArchiveCandidate(
              destinationProjects,
              destinationWorkspaceID,
              destinationFolderID,
              sourceProject.label,
              { now: () => new Date() },
            );
            await dispatch({
              kind: "archive-preflight-result",
              collision: archive !== undefined,
            });
          } else if (
            effect.kind === "rename" &&
            auth !== undefined &&
            archive !== undefined
          ) {
            await dependencies.renameProject(
              auth,
              destinationWorkspaceID,
              archive.project.id,
              destinationFolderID,
              archive.name,
            );
            await dispatch({ kind: "archive-renamed" });
          } else if (
            effect.kind === "confirm-archive-durability" &&
            auth !== undefined &&
            archive !== undefined
          ) {
            await dependencies.confirmRename(auth, {
              workspaceID: destinationWorkspaceID,
              folderID: destinationFolderID,
              projectID: archive.project.id,
              name: archive.name,
            });
            await dispatch({ kind: "archive-durability-confirmed" });
          } else if (
            effect.kind === "import" &&
            auth !== undefined &&
            artifact !== undefined
          ) {
            imported = await dependencies.importVersion(
              auth,
              artifact,
              destinationWorkspaceID,
              destinationFolderID,
              targetSchemaVersion ?? resolveTargetSchemaVersion(artifact),
            );
            await dispatch({
              kind: "import-succeeded",
              importedProjectID: imported.projectID,
            });
          } else if (effect.kind === "resolve-secrets" && auth !== undefined) {
            if (workflow.stage === "SECRET_INPUT") {
              await dispatch({
                kind: "secret-input-resolved",
                data: { configured: true },
              });
            } else {
              secrets = await dependencies.resolveSecrets(
                auth,
                parseSecretFileContents(secretFileContents),
              );
              await dispatch({
                kind: "secret-resolution-completed",
                empty: secrets.length === 0,
              });
            }
          } else if (
            effect.kind === "create-next-secret" &&
            auth !== undefined &&
            imported !== undefined
          ) {
            if (secrets.length > 0) {
              const versionID = await resolveImportedVersionID(
                auth,
                imported,
                destinationWorkspaceID,
              );
              await dependencies.reconcileSecrets(
                auth,
                imported.assistantID ?? imported.projectID,
                versionID,
                secrets,
              );
            }
            await dispatch({ kind: "secret-completed", remaining: 0 });
          } else if (
            effect.kind === "settle-success" &&
            plan !== undefined &&
            imported !== undefined &&
            artifact !== undefined
          )
            settle(
              success("execute_migration", operationID, {
                planID,
                exportStatus: artifact.status,
                exportBytes: artifact.bytes.byteLength,
                importStatus: imported.importStatus,
                importBytes: imported.importBytes,
                selected: plan.selection,
                imported,
              }),
            );
          else if (effect.kind === "settle-failure") {
            const terminalState =
              workflow.stage === "COMPLETED" ||
              workflow.stage === "FAILED" ||
              workflow.stage === "UNKNOWN_OUTCOME" ||
              workflow.stage === "CANCELLED"
                ? workflow
                : undefined;
            settle(
              failure(
                "execute_migration",
                operationID,
                new OperationFault(
                  terminalState?.code === "IMPORT_OUTCOME_UNKNOWN"
                    ? "IMPORT_OUTCOME_UNKNOWN"
                    : terminalState?.code === "INTERNAL_ERROR"
                      ? "INTERNAL_ERROR"
                      : terminalState?.code === "NOT_FOUND"
                        ? "NOT_FOUND"
                        : terminalState?.code === "INVALID_ARGUMENT"
                          ? "INVALID_ARGUMENT"
                          : terminalState?.code === "AUTHENTICATION_FAILED"
                            ? "AUTHENTICATION_FAILED"
                            : terminalState?.code === "PLAN_MISMATCH"
                              ? "PLAN_MISMATCH"
                              : terminalState?.code === "CONFIRMATION_REQUIRED"
                                ? "CONFIRMATION_REQUIRED"
                                : terminalState?.code === "DEPENDENCY_TIMEOUT"
                                  ? "DEPENDENCY_TIMEOUT"
                                  : "DEPENDENCY_FAILURE",
                  terminalState?.retryable,
                  terminalState?.diagnostic,
                ),
              ),
            );
          } else {
            throw new OperationFault(
              "INTERNAL_ERROR",
              false,
              `workflow-effect-precondition:${effect.kind}`,
            );
          }
        } catch (error) {
          await failAtCurrentStage(error);
        }
      }
    };
    dispatch({ kind: "start" }).catch((error) =>
      settle(
        failure(
          "execute_migration",
          operationID,
          addFailureStage(error, workflow.stage),
        ),
      ),
    );
  });
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

type ResolveImportedVersionID = (
  auth: AuthContext,
  imported: ImportedReceipt,
  workspaceID: string,
) => Promise<string>;
const resolveImportedVersionID: ResolveImportedVersionID = async (
  auth,
  imported,
  workspaceID,
) => {
  if (imported.versionID !== undefined) return imported.versionID;
  const projects = await loadProjects(auth, workspaceID);
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
