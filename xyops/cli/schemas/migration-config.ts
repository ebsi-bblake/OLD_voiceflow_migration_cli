import { z } from "zod";

const ConfigSecretEntrySchema = z
  .object({
    key: z.string().trim().min(1),
    value: z.string(),
    type: z.enum(["projectId", "", "url"]),
  })
  .strict();
const ConfigStringSchema = z.string().trim().min(1);

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
    secrets: z
      .union([z.string(), z.array(ConfigSecretEntrySchema)])
      .optional(),
  })
  .strict();
