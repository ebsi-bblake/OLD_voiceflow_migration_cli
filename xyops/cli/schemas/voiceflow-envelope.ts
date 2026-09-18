import { z } from "zod";
import type { VoiceflowEnvelope } from "../types";
import {
  ErrorCode,
  VoiceflowOperation,
  WarningCode,
} from "../../voiceflow/types";

const operationSchema = z
  .string()
  .refine((value) =>
    Object.values(VoiceflowOperation).some((operation) => operation === value),
  );
const errorCodeSchema = z
  .string()
  .refine((value) => Object.values(ErrorCode).some((code) => code === value));
const warningCodeSchema = z
  .string()
  .refine((value) => Object.values(WarningCode).some((code) => code === value));
const operationIDSchema = z.string().refine((value) => value.trim() !== "");
const warningSchema = z
  .object({
    code: warningCodeSchema,
    message: z.string().refine((value) => value.trim() !== ""),
  })
  .loose();
const failureSchema = z
  .object({
    code: errorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
  })
  .loose();

type CreateVoiceflowEnvelopeSchema = <T>(
  result: z.ZodType<T>,
) => z.ZodType<VoiceflowEnvelope<T>>;
export const createVoiceflowEnvelopeSchema: CreateVoiceflowEnvelopeSchema = <T>(
  result: z.ZodType<T>,
) => {
  return z.union([
    z
      .object({
        ok: z.literal(true),
        operation: operationSchema,
        operationID: operationIDSchema,
        result,
        warnings: z.array(warningSchema),
      })
      .loose(),
    z
      .object({
        ok: z.literal(false),
        operation: operationSchema,
        operationID: operationIDSchema,
        error: failureSchema,
      })
      .loose(),
  ]);
};
