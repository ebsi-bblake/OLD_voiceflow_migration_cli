import { z } from "zod";
import { SecretEntryArraySchema } from "../../voiceflow/schemas/secret_entry";
import { VoiceflowRegex } from "../../voiceflow/regex";

const ConfigStringSchema = z.string().trim().min(1);
const PathSafeSegmentSchema = ConfigStringSchema.max(256)
  .refine((value) => !VoiceflowRegex.controlCharacter.test(value))
  .refine((value) => !VoiceflowRegex.pathSeparator.test(value));
const PathSchema = ConfigStringSchema.refine((value) =>
  value.split("/").every((segment) =>
    PathSafeSegmentSchema.safeParse(segment).success,
  ),
);

/** Process environment boundary; named variables are interpreted by config policies. */
export const XYOpsEnvironmentSchema = z.record(
  z.string(),
  z.string().optional(),
);

/** Structural shape only; resource and secret policies remain named functions. */
export const MigrationFileConfigSchema = z
  .object({
    source_workspace: PathSafeSegmentSchema.optional(),
    source_folder: PathSafeSegmentSchema.optional(),
    source_project: PathSafeSegmentSchema.optional(),
    source_path: PathSchema.optional(),
    source_version: PathSafeSegmentSchema.optional(),
    destination_workspace: PathSafeSegmentSchema.optional(),
    destination_folder: PathSafeSegmentSchema.optional(),
    destination_path: PathSchema.optional(),
    target_schema_version: ConfigStringSchema.optional(),
    secrets: z.union([z.string(), SecretEntryArraySchema]).optional(),
  })
  .strict();
