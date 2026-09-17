import { z } from "zod";

const nonEmptyString = z.string().refine((value) => value.trim() !== "");

export const ExistingSecretSchema = z
  .object({
    id: nonEmptyString,
    assistantID: nonEmptyString,
    name: nonEmptyString,
    visibility: z.enum(["masked", "restricted"]),
    hasValue: z.boolean(),
  })
  .loose();
