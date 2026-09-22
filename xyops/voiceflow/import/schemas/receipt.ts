import { z } from "zod";

const primitiveID = z.union([z.string(), z.number()]).optional();

/** Structural import receipt shape; alias precedence remains a pure policy. */
export const ImportedReceiptSchema = z
  .object({
    projectID: primitiveID,
    projectId: primitiveID,
    id: primitiveID,
    assistantID: primitiveID,
    versionID: primitiveID,
    environmentID: primitiveID,
    workspaceID: primitiveID,
    folderID: primitiveID,
    project: z
      .object({ _id: primitiveID })
      .loose()
      .optional(),
    version: z
      .object({ _id: primitiveID, _version: z.unknown().optional() })
      .strict()
      .optional(),
  })
  .loose();
