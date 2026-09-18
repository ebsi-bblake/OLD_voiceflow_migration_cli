import type { EffectHandler } from "../types";
import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "../dependencies";

export const createAuthenticateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"authenticate"> =>
  async () => ({
    kind: "event",
    event: {
      kind: "authentication-succeeded",
      auth: await dependencies.authenticate(input.token),
    },
  });
