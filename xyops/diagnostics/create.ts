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
  details?: Readonly<{
    readonly domain?: DiagnosticDomain;
    readonly stage?: string;
    readonly context?: unknown;
    readonly causes?: readonly DiagnosticCause[];
  }>;
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

const MAX_CAUSES = 32;
const MAX_FIELD_LENGTH = 120;
const boundedField = (value: string): string => value.slice(0, MAX_FIELD_LENGTH);
const safeDiagnosticDetail = (value: string): string | undefined =>
  /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value) ? value : undefined;
const safeCause = (cause: DiagnosticCause): DiagnosticCause => ({
  domain: cause.domain,
  code: boundedField(cause.code),
  stage: boundedField(cause.stage),
  retryable: cause.retryable,
  context: safeContext(cause.context),
});

const actionFor = (code: string): string => {
  if (code === "AUTHENTICATION_FAILED")
    return "Check authentication and sign in again";
  if (code === "INVALID_ARGUMENT" || code === "CONFIGURATION")
    return "Check configuration and migration inputs";
  if (code === "IMPORT_OUTCOME_UNKNOWN")
    return "Reconcile the destination project before retrying";
  if (code === "EXECUTE_OUTCOME_UNKNOWN")
    return "Reconcile the execute job before retrying";
  if (code === "PLAN_MISMATCH")
    return "Re-run planning and confirm the plan ID";
  return "Retry only when the diagnostic policy permits it";
};

/* oxlint-disable complexity -- diagnostic construction branches only on trusted optional fields. */
export const createDiagnostic: CreateDiagnostic = (
  fault,
  domain,
  stage,
  context,
) => {
  const safe = safeContext({
    ...safeContext(context),
    ...safeContext(fault.details?.context),
    ...(fault.diagnostic === undefined || safeDiagnosticDetail(fault.diagnostic) === undefined
      ? {}
      : { detail: safeDiagnosticDetail(fault.diagnostic) }),
  });
  return {
    code: boundedField(fault.code),
    domain: fault.details?.domain ?? domain,
    stage: boundedField(fault.details?.stage ?? stage),
    retryable: fault.retryable,
    nextAction: actionFor(fault.code),
    context: safe,
    causes: [
      ...(fault.details?.causes ?? []).slice(0, MAX_CAUSES).map(safeCause),
      causeFromFault(
        fault,
        fault.details?.domain ?? domain,
        fault.details?.stage ?? stage,
        safe,
      ),
    ],
  };
};

type AppendDiagnosticCause = (
  diagnostic: Diagnostic,
  cause: DiagnosticCause,
) => Diagnostic;
export const appendDiagnosticCause: AppendDiagnosticCause = (
  diagnostic,
  cause,
) => ({
  ...diagnostic,
  causes: [
    ...diagnostic.causes,
    safeCause(cause),
  ].slice(-MAX_CAUSES),
});

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
