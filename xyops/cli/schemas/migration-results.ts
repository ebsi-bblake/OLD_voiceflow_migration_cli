import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim() !== "");

export const MigrationSelectionSchema = z
  .object({
    sourceWorkspaceID: nonEmptyString,
    sourceProjectID: nonEmptyString,
    sourceVersionID: nonEmptyString,
    destinationWorkspaceID: nonEmptyString,
    destinationFolderID: nonEmptyString,
    targetSchemaVersion: nonEmptyString.optional(),
  })
  .loose();

export const MigrationPlanSchema = z
  .object({
    planID: nonEmptyString,
    selection: MigrationSelectionSchema,
    labels: z
      .object({
        sourceWorkspace: nonEmptyString,
        sourceProject: nonEmptyString,
        sourceVersion: nonEmptyString,
        destinationWorkspace: nonEmptyString,
        destinationFolder: nonEmptyString,
      })
      .loose(),
  })
  .loose();

export const ExecuteResultSchema = z
  .object({
    planID: nonEmptyString,
    selected: MigrationSelectionSchema,
    exportStatus: z.number(),
    exportBytes: z.number(),
    importStatus: z.number(),
    importBytes: z.number(),
    imported: z.object({ projectID: nonEmptyString }).loose(),
    apiKeyRetrieved: z.boolean().optional(),
  })
  .loose();
