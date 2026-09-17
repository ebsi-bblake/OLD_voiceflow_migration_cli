import { redactDiagnosticValue } from "./redact";
import type {
  Diagnostic,
  DiagnosticCause,
  DiagnosticDomain,
  SafeContext,
} from "./types";

export type OutcomeState =
  | "before-dispatch-failure"
  | "confirmed-rejection"
  | "unknown-outcome";

type FaultShape = Readonly<{
  code: string;
  retryable: boolean;
  diagnostic?: string;
}>;

type CreateDiagnostic = (
  fault: FaultShape,
  domain: DiagnosticDomain,
  stage: string,
  context?: unknown,
) => Diagnostic;

const isSafeContext = (value: ReturnType<typeof redactDiagnosticValue>): value is SafeContext =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const safeContext = (context: unknown): SafeContext => {
  const redacted = redactDiagnosticValue(context ?? {});
  return isSafeContext(redacted) ? redacted : {};
};

const causeFromFault = (
  fault: FaultShape,
  domain: DiagnosticDomain,
  stage: string,
  context: SafeContext,
): DiagnosticCause => ({
  domain,
  code: fault.code,
  stage,
  retryable: fault.retryable,
  context,
});

const actionFor = (code: string): string => {
  if (code === "AUTHENTICATION_FAILED")
    return "Check authentication and sign in again";
  if (code === "INVALID_ARGUMENT" || code === "CONFIGURATION")
    return "Check configuration and migration inputs";
  if (code === "IMPORT_OUTCOME_UNKNOWN")
    return "Reconcile the destination project before retrying";
  if (code === "PLAN_MISMATCH")
    return "Re-run planning and confirm the plan ID";
  return "Retry only when the diagnostic policy permits it";
};

export const createDiagnostic: CreateDiagnostic = (
  fault,
  domain,
  stage,
  context,
) => {
  const safe = safeContext({ ...safeContext(context), ...(fault.diagnostic === undefined ? {} : { detail: fault.diagnostic }) });
  return {
    code: fault.code,
    domain,
    stage,
    retryable: fault.retryable,
    nextAction: actionFor(fault.code),
    context: safe,
    causes: [causeFromFault(fault, domain, stage, safe)],
  };
};

type AppendDiagnosticCause = (
  diagnostic: Diagnostic,
  cause: DiagnosticCause,
) => Diagnostic;
export const appendDiagnosticCause: AppendDiagnosticCause = (
  diagnostic,
  cause,
) => ({ ...diagnostic, causes: [...diagnostic.causes, cause] });

type CreateUnexpectedDiagnostic = (
  error: unknown,
  domain: DiagnosticDomain,
  stage: string,
  context?: unknown,
) => Diagnostic;
export const createUnexpectedDiagnostic: CreateUnexpectedDiagnostic = (
  error,
  domain,
  stage,
  context,
) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  return createDiagnostic(
    { code: "INTERNAL_ERROR", retryable: false, diagnostic: errorType },
    domain,
    stage,
    context,
  );
};
