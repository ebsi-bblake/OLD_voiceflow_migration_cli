import { resolveTargetSchemaVersion } from "../../../export";
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
    const imported = await dependencies.importVersion(
      requireAuth(state),
      artifact,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      input.selection.targetSchemaVersion ??
        resolveTargetSchemaVersion(artifact),
    );
    return { kind: "event", event: { kind: "import-succeeded", imported } };
  };
