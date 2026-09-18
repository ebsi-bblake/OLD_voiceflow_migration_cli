import type {
  ExecuteMigrationInput,
  MigrationRuntimeDependencies,
} from "../dependencies";
import type { EffectHandlerMap } from "../types";
import { createAuthenticateHandler } from "./authentication";
import {
  createArchiveCandidateHandler,
  createArchiveDurabilityHandler,
  createExportHandler,
  createPlanHandler,
  createRenameHandler,
} from "./catalog";
import { createAbortHandler } from "./control";
import { createImportHandler } from "./import";
import {
  createNextSecretHandler,
  createResolveSecretsHandler,
} from "./secrets";
import {
  createFailureSettlementHandler,
  createSuccessSettlementHandler,
} from "./settlement";

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
