import { z } from "zod";

/** Common action envelope; operation-specific payload policies stay in consumers. */
export const LoguxActionSchema = z
  .object({
    type: z.string().min(1),
    id: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();
