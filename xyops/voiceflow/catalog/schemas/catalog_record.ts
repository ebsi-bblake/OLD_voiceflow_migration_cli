import { z } from "zod";

// Catalog payloads contain provider-specific ID aliases. Validate identity when
// projecting rows rather than rejecting an entire snapshot for one malformed alias.
const catalogIDSchema = z.unknown().optional();

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
    draftVersionID: catalogIDSchema,
    publishedVersionID: catalogIDSchema,
    name: z.unknown().optional(),
    title: z.unknown().optional(),
    label: z.unknown().optional(),
  })
  .loose();

export type CatalogRecord = z.infer<typeof CatalogRecordSchema>;
