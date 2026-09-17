import { z } from "zod";

export const SecretEntrySchema = z
  .object({
    key: z.string().refine((value) => value.trim() !== ""),
    value: z.string(),
    type: z.enum(["projectId", "", "url"]),
  })
  .strict();
