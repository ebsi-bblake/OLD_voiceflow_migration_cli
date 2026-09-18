import { findArchiveCandidate } from "../../archive";
import { failure, OperationFault, success } from "../../contracts";
import { resolveTargetSchemaVersion } from "../../export";
import { parseSecretEntries } from "../../secrets";
import type {
  Envelope,
  ExecuteResult,
  ExportArtifact,
  ImportedReceipt,
} from "../../types";
import {
  type MigrationWorkflowEvent,
  type MigrationWorkflowState,
  type MigrationWorkflowSuccess,
} from "../../execute-migration-state-machine";
import {
  resolveImportedVersionID,
  requireAuth,
  requireArtifact,
  requireImported,
  requirePlan,
} from "./requirements";
import { failureForState } from "./failure-mapping";
import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "./dependencies";
import type { EffectHandler, EffectHandlerMap, EffectResult } from "./types";

const eventResult = (event: MigrationWorkflowEvent): EffectResult => ({
  kind: "event",
  event,
});
const noopResult = (): EffectResult => ({ kind: "noop" });
const settledResult = (result: Envelope<ExecuteResult>): EffectResult => ({
  kind: "settled",
  result,
});

const createAuthenticateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"authenticate"> =>
  async () =>
    eventResult({
      kind: "authentication-succeeded",
      auth: await dependencies.authenticate(input.token),
    });

const createExportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"export"> =>
  async (state) =>
    eventResult({
      kind: "export-succeeded",
      artifact: await dependencies.exportVersion(
        requireAuth(state),
        input.selection.sourceVersionID,
      ),
    });

const createPlanHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"plan"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const selection = {
      ...input.selection,
      targetSchemaVersion:
        input.selection.targetSchemaVersion ??
        resolveTargetSchemaVersion(artifact),
    };
    const plan = await dependencies.buildPlan(requireAuth(state), selection);
    return eventResult({ kind: "plan-succeeded", planID: plan.planID, plan });
  };

const createArchiveCandidateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"load-archive-candidates"> =>
  async (state) => {
    const auth = requireAuth(state);
    requirePlan(state);
    const [sourceProjects, destinationProjects] = await Promise.all([
      dependencies.loadProjects(auth, input.selection.sourceWorkspaceID),
      dependencies.loadProjects(auth, input.selection.destinationWorkspaceID),
    ]);
    const sourceProject = sourceProjects.find(
      (candidate) => candidate.id === input.selection.sourceProjectID,
    );
    if (sourceProject === undefined) throw new OperationFault("NOT_FOUND");
    const archive = findArchiveCandidate(
      destinationProjects,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      sourceProject.label,
      { now: () => new Date() },
    );
    return eventResult({
      kind: "archive-preflight-result",
      collision: archive !== undefined,
      archive,
    });
  };

const createRenameHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"rename"> =>
  async (state) => {
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.renameProject(
      requireAuth(state),
      input.selection.destinationWorkspaceID,
      archive.project.id,
      input.selection.destinationFolderID,
      archive.name,
    );
    return eventResult({ kind: "archive-renamed", archive });
  };

const createArchiveDurabilityHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"confirm-archive-durability"> =>
  async (state) => {
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.confirmRename(requireAuth(state), {
      workspaceID: input.selection.destinationWorkspaceID,
      folderID: input.selection.destinationFolderID,
      projectID: archive.project.id,
      name: archive.name,
    });
    return eventResult({ kind: "archive-durability-confirmed" });
  };

const createImportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"import"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const imported = await dependencies.importVersion(
      requireAuth(state),
      artifact,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      input.selection.targetSchemaVersion ??
        resolveTargetSchemaVersion(artifact),
    );
    return eventResult({
      kind: "import-succeeded",
      imported,
      importedProjectID: imported.projectID,
    });
  };

const createResolveSecretsHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"resolve-secrets"> =>
  async (state, effect) => {
    if (effect.phase === "input")
      return eventResult({ kind: "secret-input-resolved" });
    const secrets = await dependencies.resolveSecrets(
      requireAuth(state),
      input.secretFileContents === undefined
        ? []
        : parseSecretEntries(input.secretFileContents),
    );
    return eventResult({
      kind: "secret-resolution-completed",
      secrets,
      empty: secrets.length === 0,
    });
  };

const createNextSecretHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"create-next-secret"> =>
  async (state) => {
    const imported = requireImported(state);
    const secrets = state.context.secrets ?? [];
    if (secrets.length > 0) {
      const versionID = await resolveImportedVersionID(
        requireAuth(state),
        imported,
        input.selection.destinationWorkspaceID,
        dependencies.loadProjects,
      );
      await dependencies.reconcileSecrets(
        requireAuth(state),
        imported.assistantID ?? imported.projectID,
        versionID,
        secrets,
      );
    }
    return eventResult({ kind: "secret-completed", remaining: 0 });
  };

const createAbortHandler =
  (
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"abort-active-operation"> =>
  async () => {
    await dependencies.abortActiveOperation?.();
    return noopResult();
  };

const successSummary = (
  state: MigrationWorkflowState,
  input: ExecuteMigrationInput,
  artifact: ExportArtifact,
  imported: ImportedReceipt,
): MigrationWorkflowSuccess =>
  state.context.terminalSuccess ?? {
    planID: input.planID,
    exportStatus: artifact.status,
    exportBytes: artifact.bytes.byteLength,
    importStatus: imported.importStatus,
    importBytes: imported.importBytes,
  };

const createSuccessSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-success"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const plan = requirePlan(state);
    const imported = requireImported(state);
    const summary = successSummary(state, input, artifact, imported);
    return settledResult(
      success("execute_migration", input.operationID, {
        ...summary,
        selected: plan.selection,
        imported,
      }),
    );
  };

const createFailureSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-failure"> =>
  async (state) =>
    settledResult(
      failure("execute_migration", input.operationID, failureForState(state)),
    );

export const createMigrationEffectHandlers = (
  input: ExecuteMigrationInput,
  dependencies: MigrationRuntimeDependencies,
): EffectHandlerMap => ({
  authenticate: createAuthenticateHandler(input, dependencies),
  export: createExportHandler(input, dependencies),
  plan: createPlanHandler(input, dependencies),
  "load-archive-candidates": createArchiveCandidateHandler(input, dependencies),
  rename: createRenameHandler(input, dependencies),
  "confirm-archive-durability": createArchiveDurabilityHandler(
    input,
    dependencies,
  ),
  import: createImportHandler(input, dependencies),
  "resolve-secrets": createResolveSecretsHandler(input, dependencies),
  "create-next-secret": createNextSecretHandler(input, dependencies),
  "abort-active-operation": createAbortHandler(dependencies),
  "settle-success": createSuccessSettlementHandler(input),
  "settle-failure": createFailureSettlementHandler(input),
});
