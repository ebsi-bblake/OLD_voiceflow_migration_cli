import { z } from "zod";

const catalogIDSchema = z.union([z.string(), z.number()]).optional();

/** Structural catalog row shape; identity and alias policies remain projections. */
export const CatalogRecordSchema = z
  .object({
    id: catalogIDSchema,
    _id: catalogIDSchema,
    workspaceID: catalogIDSchema,
    folderID: catalogIDSchema,
    folderId: catalogIDSchema,
    parentID: catalogIDSchema,
    parentId: catalogIDSchema,
    parentFolderID: catalogIDSchema,
    environments: z.unknown().optional(),
    name: z.unknown().optional(),
    title: z.unknown().optional(),
    label: z.unknown().optional(),
  })
  .loose();
