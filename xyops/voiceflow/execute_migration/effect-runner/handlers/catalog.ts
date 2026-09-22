import { findArchiveCandidate } from "../../../archive";
import { OperationFault } from "../../../contracts";
import { resolveTargetSchemaVersion } from "../../../export";
import { requireArtifact, requireAuth, requirePlan } from "../requirements";
import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "../dependencies";
import type { EffectHandler } from "../types";

export const createExportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"export"> =>
  async (state) => ({
    kind: "event",
    event: {
      kind: "export-succeeded",
      artifact: await dependencies.exportVersion(
        requireAuth(state),
        input.selection.sourceVersionID,
      ),
    },
  });

export const createPlanHandler =
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
    return {
      kind: "event",
      event: { kind: "plan-succeeded", planID: plan.planID, plan },
    };
  };

export const createArchiveCandidateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"load-archive-candidates"> =>
  async (state) => {
    const auth = requireAuth(state);
    requirePlan(state);
    const [sourceProjects, destinationProjects, destinationFolders] = await Promise.all([
      dependencies.loadProjects(auth, input.selection.sourceWorkspaceID),
      dependencies.loadProjects(auth, input.selection.destinationWorkspaceID),
      dependencies.loadFolders(auth, input.selection.destinationWorkspaceID),
    ]);
    if (!destinationFolders.some(
      (folder) => folder.id === input.selection.destinationFolderID,
    )) throw new OperationFault("NOT_FOUND");
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
    return archive === undefined
      ? { kind: "event", event: { kind: "archive-not-needed" } }
      : { kind: "event", event: { kind: "archive-required", archive } };
  };

export const createRenameHandler =
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
    return { kind: "event", event: { kind: "archive-renamed", archive } };
  };

export const createArchiveDurabilityHandler =
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
    return { kind: "event", event: { kind: "archive-durability-confirmed" } };
  };
