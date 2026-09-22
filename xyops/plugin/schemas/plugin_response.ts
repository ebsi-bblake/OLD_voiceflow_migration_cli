import { z } from "zod";

const VoiceflowWarningSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .loose();

const VoiceflowSuccessSchema = z
  .object({
    ok: z.literal(true),
    operation: z.string(),
    operationID: z.string(),
    result: z.unknown(),
    warnings: z.array(VoiceflowWarningSchema),
  })
  .loose();

const VoiceflowFailureSchema = z
  .object({
    ok: z.literal(false),
    operation: z.string(),
    operationID: z.string(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        retryable: z.boolean(),
      })
      .loose(),
  })
  .loose();

export const VoiceflowEnvelopeSchema = z.discriminatedUnion("ok", [
  VoiceflowSuccessSchema,
  VoiceflowFailureSchema,
]);

export const XYOpsPluginResponseSchema = z
  .object({
    xy: z.literal(1),
    complete: z.literal(true),
    code: z.union([z.literal(0), z.string()]),
    data: z.object({ voiceflow: VoiceflowEnvelopeSchema }).loose().optional(),
    workflowData: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
  })
  .loose();
