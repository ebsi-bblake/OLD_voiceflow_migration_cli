import { z } from "zod";

export const CheckSessionResultSchema = z
  .object({
    active: z.boolean(),
  })
  .loose();
