import { fail } from "./diagnostics";
import { isVoiceflowEnvelope } from "./guards";
import type { ResponseGuard } from "./types";
type RequireEnvelopeResult = <T>(
  value: unknown,
  operation: string,
  resultGuard: ResponseGuard<T>,
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
  resultGuard: ResponseGuard<T>,
): T => {
  if (!isVoiceflowEnvelope(resultGuard)(value))
    throw fail("envelope", {
      nextAction: `${operation} returned an invalid response.`,
    });
  return requireSuccessfulEnvelope(value, operation);
};
