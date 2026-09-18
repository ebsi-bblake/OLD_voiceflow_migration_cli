import type { MigrationRuntimeDependencies } from "../dependencies";
import type { EffectHandler } from "../types";

export const createAbortHandler =
  (
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"abort-active-operation"> =>
  async () => {
    await dependencies.abortActiveOperation?.();
    return { kind: "noop" };
  };
