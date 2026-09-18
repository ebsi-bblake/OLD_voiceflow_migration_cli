import { parseSecretEntries } from "../../../secrets";
import {
  resolveImportedVersionID,
  requireAuth,
  requireImported,
} from "../requirements";
import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "../dependencies";
import type { EffectHandler } from "../types";

export const createResolveSecretsHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"resolve-secrets"> =>
  async (state, effect) => {
    if (effect.phase === "input")
      return { kind: "event", event: { kind: "secret-input-resolved" } };
    const secrets = await dependencies.resolveSecrets(
      requireAuth(state),
      input.secretFileContents === undefined
        ? []
        : parseSecretEntries(input.secretFileContents),
    );
    return secrets.length === 0
      ? { kind: "event", event: { kind: "secret-resolution-empty" } }
      : {
          kind: "event",
          event: { kind: "secret-resolution-completed", secrets },
        };
  };

export const createNextSecretHandler =
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
    return { kind: "event", event: { kind: "secret-completed", remaining: 0 } };
  };
