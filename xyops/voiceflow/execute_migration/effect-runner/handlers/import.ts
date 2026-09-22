import { resolveTargetSchemaVersion } from "../../../export";
import { OperationFault } from "../../../contracts";
import { debugLog } from "../../../debug";
import { requireArtifact, requireAuth } from "../requirements";
import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "../dependencies";
import type { EffectHandler } from "../types";

export const createImportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"import"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const targetSchemaVersion =
      input.selection.targetSchemaVersion ?? resolveTargetSchemaVersion(artifact);
    debugLog("migration.import", "request", {
      planID: input.planID,
      destinationWorkspaceID: input.selection.destinationWorkspaceID,
      destinationFolderID: input.selection.destinationFolderID,
      targetSchemaVersion,
      artifactBytes: artifact.bytes.byteLength,
    });
    try {
      const imported = await dependencies.importVersion(
        requireAuth(state),
        artifact,
        input.selection.destinationWorkspaceID,
        input.selection.destinationFolderID,
        targetSchemaVersion,
      );
      debugLog("migration.import", "success", {
        planID: input.planID,
        importStatus: imported.importStatus,
        importBytes: imported.importBytes,
      });
      return { kind: "event", event: { kind: "import-succeeded", imported } };
    } catch (error) {
      debugLog("migration.import", "failure", {
        planID: input.planID,
        errorCode: error instanceof OperationFault ? error.code : "INTERNAL_ERROR",
      });
      throw error;
    }
  };
