import { z } from "zod";

/** Structural option records used by workspace, project, version, and folder catalogs. */
export const CatalogOptionSchema = z
  .object({
    value: z.string().refine((value) => value.trim() !== ""),
    label: z.string().refine((value) => value.trim() !== ""),
  })
  .loose();

export const CatalogOptionResultSchema = z
  .object({
    options: z.array(CatalogOptionSchema),
  })
  .loose();

export const CreatedFolderResultSchema = z
  .object({
    folder: CatalogOptionSchema,
  })
  .loose();
