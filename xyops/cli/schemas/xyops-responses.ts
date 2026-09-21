import { z } from "zod";
import { XYOpsStreamEventType } from "../types";

export const XYOpsRecordSchema = z.record(z.string(), z.unknown());

const responseCodeSchema = z.union([z.number(), z.string()]);
const responseDescriptionSchema = z.string().optional();
const responseIDSchema = z.string().optional();
const completedSchema = z.union([z.boolean(), z.number(), z.null()]).optional();
const outputSchema = z.union([z.string(), z.null()]).optional();

export const XYOpsResponseSchema = z
  .object({
    code: responseCodeSchema,
    description: responseDescriptionSchema,
    id: responseIDSchema,
    job: z.unknown().optional(),
    data: z.unknown().optional(),
  })
  .loose();

export const XYOpsLaunchResponseSchema = XYOpsResponseSchema.extend({
  id: z.string().refine((value) => value.trim() !== ""),
});

export const JobLaunchSchema = z
  .object({ id: z.string().refine((value) => value.trim() !== "") })
  .loose();

export const NativePluginDataSchema = z
  .object({ voiceflow: z.unknown() })
  .loose();

export const NativePluginResponseSchema = z
  .object({
    xy: z.literal(1),
    complete: z.literal(true),
    data: NativePluginDataSchema,
  })
  .loose();

export const XYOpsStreamEventSchema = z
  .object({
    type: z.enum([
      XYOpsStreamEventType.Start,
      XYOpsStreamEventType.Update,
      XYOpsStreamEventType.End,
    ]),
    data: z.record(z.string(), z.unknown()),
  })
  .loose();

const XYOpsJobSchemaBase = z
  .object({
    id: z.string().optional(),
    state: z.string().optional(),
    progress: z.number().optional(),
    completed: completedSchema,
    code: responseCodeSchema.optional(),
    description: responseDescriptionSchema,
    output: outputSchema,
    data: z.unknown().optional(),
    final: z.boolean().optional(),
    suspended: z.boolean().optional(),
    workflowData: z.record(z.string(), z.unknown()).optional(),
    input: z.unknown().optional(),
    workflow: z.unknown().optional(),
  })
  .loose();

export const XYOpsJobSchema = XYOpsJobSchemaBase.refine(
  (value) => value.code !== undefined || value.state !== undefined,
);

export const XYOpsJobResponseSchema = XYOpsResponseSchema.extend({
  job: XYOpsJobSchemaBase.extend({
    id: z.string().refine((value) => value.trim() !== ""),
  }).refine((value) => value.code !== undefined || value.state !== undefined),
});

export const XYOpsWaitJobSchema = z
  .object({
    id: z.string().refine((value) => value.trim() !== ""),
    code: responseCodeSchema,
    description: responseDescriptionSchema,
    output: outputSchema,
    completed: completedSchema,
    data: z.unknown().optional(),
  })
  .loose();

export const XYOpsWaitResponseSchema = z
  .object({
    code: responseCodeSchema,
    description: responseDescriptionSchema,
    job: XYOpsWaitJobSchema,
  })
  .loose();
