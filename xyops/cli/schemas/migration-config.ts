import { z } from "zod";
import { SecretEntryArraySchema } from "../../voiceflow/schemas/secret_entry";

const ConfigStringSchema = z.string().trim().min(1);

/** Process environment boundary; named variables are interpreted by config policies. */
export const XYOpsEnvironmentSchema = z.record(
  z.string(),
  z.string().optional(),
);

/** Structural shape only; resource and secret policies remain named functions. */
export const MigrationFileConfigSchema = z
  .object({
    source_workspace: ConfigStringSchema.optional(),
    source_folder: ConfigStringSchema.optional(),
    source_project: ConfigStringSchema.optional(),
    source_path: ConfigStringSchema.optional(),
    source_version: ConfigStringSchema.optional(),
    destination_workspace: ConfigStringSchema.optional(),
    destination_folder: ConfigStringSchema.optional(),
    destination_path: ConfigStringSchema.optional(),
    target_schema_version: ConfigStringSchema.optional(),
    secrets: z.union([z.string(), SecretEntryArraySchema]).optional(),
  })
  .strict();
