import { z } from "zod";

/** Structural validation for string-valued XYOps operation parameters. */
export const OperationParameterStringSchema = z.string();

export type OperationParameterString = z.infer<
  typeof OperationParameterStringSchema
>;
