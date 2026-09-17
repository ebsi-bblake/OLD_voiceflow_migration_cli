import { z } from "zod";

const ConfigSecretEntrySchema = z
  .object({
    key: z.string(),
    value: z.string(),
    type: z.enum(["projectId", "", "url"]),
  })
  .strict();

/** Structural shape only; resource and secret policies remain named functions. */
export const MigrationFileConfigSchema = z
  .object({
    source_workspace: z.string().optional(),
    source_folder: z.string().optional(),
    source_project: z.string().optional(),
    source_path: z.string().optional(),
    source_version: z.string().optional(),
    destination_workspace: z.string().optional(),
    destination_folder: z.string().optional(),
    destination_path: z.string().optional(),
    target_schema_version: z.string().optional(),
    secrets: z
      .union([z.string(), z.array(ConfigSecretEntrySchema)])
      .optional(),
  })
  .loose();
