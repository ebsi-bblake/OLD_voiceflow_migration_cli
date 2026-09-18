import { fail } from "./diagnostics";
import type { ResponseSchema } from "./types";
type RequireEnvelopeResult = <T>(
  value: unknown,
  operation: string,
  envelopeSchema: ResponseSchema<import("./types").VoiceflowEnvelope<T>>,
) => T;
const requireSuccessfulEnvelope = <T>(
  value: import("./types").VoiceflowEnvelope<T>,
  operation: string,
): T => {
  if (value.ok === false)
    throw fail("envelope", {
      nextAction:
        value.error.diagnostic?.nextAction ??
        `${operation} was rejected by the migration runner.`,
      diagnostic: value.error.diagnostic,
    });
  return value.result;
};
export const requireEnvelopeResult: RequireEnvelopeResult = <T>(
  value: unknown,
  operation: string,
  envelopeSchema: ResponseSchema<import("./types").VoiceflowEnvelope<T>>,
): T => {
  const parsed = envelopeSchema.safeParse(value);
  if (!parsed.success)
    throw fail("envelope", {
      nextAction: `${operation} returned an invalid response.`,
    });
  return requireSuccessfulEnvelope(parsed.data, operation);
};
