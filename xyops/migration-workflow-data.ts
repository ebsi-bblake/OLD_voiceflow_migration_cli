export {
  ConfirmedMigrationHandoffSchema,
  MigrationWorkflowConfigSchema,
  MigrationWorkflowDataSchema,
} from "./voiceflow/schemas/migration-workflow-data";
export type {
  ConfirmedMigrationHandoff,
  MigrationWorkflowConfig,
  MigrationWorkflowData,
} from "./voiceflow/schemas/migration-workflow-data";

/**
 * Trust boundary for future XYOps workflowData:
 *
 * - Parse data with MigrationWorkflowDataSchema before using it.
 * - Catalog values are normalized Voiceflow domain records, not raw payloads.
 * - Config values express user intent; selection values are canonical IDs.
 * - Catalog data is a planning snapshot, never proof of current mutation state.
 * - Secret input, credentials, raw protocol frames, errors, and execution
 *   results are deliberately outside this contract.
 * - Execution may reload current Voiceflow state before irreversible actions.
 */
