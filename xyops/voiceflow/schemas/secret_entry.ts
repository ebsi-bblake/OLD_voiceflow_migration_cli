import { z } from "zod";

export const SecretEntrySchema = z
  .object({
    key: z.string().refine((value) => value.trim() !== ""),
    value: z.string(),
    type: z.enum(["projectId", "", "url"]),
  })
  .strict();

/** Canonical wire shape for a complete secret-entry collection. */
export const SecretEntryArraySchema = z
  .array(SecretEntrySchema)
  .superRefine((entries, context) => {
    const names = new Set<string>();
    entries.forEach((entry, index) => {
      if (names.has(entry.key))
        context.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "secret names must be unique",
        });
      names.add(entry.key);
    });
  });
