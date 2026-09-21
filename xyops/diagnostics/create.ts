import { redactDiagnosticValue } from "./redact";
import type {
  Diagnostic,
  DiagnosticCause,
  DiagnosticDomain,
  SafeContext,
} from "./types";

export type OutcomeState =
  "before-dispatch-failure" | "confirmed-rejection" | "unknown-outcome";

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

const isSafeContext = (
  value: ReturnType<typeof redactDiagnosticValue>,
): value is SafeContext =>
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
const boundedField = (value: string): string =>
  value.slice(0, MAX_FIELD_LENGTH);
const safeDiagnosticDetail = (value: string): string | undefined =>
  /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value)
    ? value
    : value.match(/^stage=[A-Z_]+ ([a-z0-9][a-z0-9_-]{0,79})$/i)?.[1];
const safeCause = (cause: DiagnosticCause): DiagnosticCause => ({
  domain: cause.domain,
  code: boundedField(cause.code),
  stage: boundedField(cause.stage),
  retryable: cause.retryable,
  context: safeContext(cause.context),
});

const actionFor = (code: string): string => {
  switch (code) {
    case "AUTHENTICATION_FAILED":
      return "Check authentication and sign in again";
    case "INVALID_ARGUMENT":
    case "CONFIGURATION":
      return "Check configuration and migration inputs";
    case "IMPORT_OUTCOME_UNKNOWN":
      return "Reconcile the destination project before retrying";
    case "EXECUTE_OUTCOME_UNKNOWN":
      return "Reconcile the execute job before retrying";
    case "PLAN_MISMATCH":
      return "Re-run planning and confirm the plan ID";
    default:
      return "Retry only when the diagnostic policy permits it";
  }
};

const safeDetailContext = (diagnostic: string | undefined): SafeContext => {
  if (diagnostic === undefined) return {};
  const detail = safeDiagnosticDetail(diagnostic);
  return detail === undefined ? {} : { detail };
};

const mergeDiagnosticContext = (
  context: unknown,
  details: FaultShape["details"],
  diagnostic: string | undefined,
): SafeContext =>
  safeContext({
    ...safeContext(context),
    ...safeContext(details?.context),
    ...safeDetailContext(diagnostic),
  });

const diagnosticCause = (
  fault: FaultShape,
  domain: DiagnosticDomain,
  stage: string,
  context: SafeContext,
): DiagnosticCause => causeFromFault(fault, domain, stage, context);

const boundedCauses = (
  causes: readonly DiagnosticCause[] | undefined,
): readonly DiagnosticCause[] =>
  (causes ?? []).slice(0, MAX_CAUSES - 1).map(safeCause);

export const createDiagnostic: CreateDiagnostic = (
  fault,
  domain,
  stage,
  context,
) => {
  const diagnosticDomain = fault.details?.domain ?? domain;
  const diagnosticStage = fault.details?.stage ?? stage;
  const safe = mergeDiagnosticContext(context, fault.details, fault.diagnostic);
  return {
    code: boundedField(fault.code),
    domain: diagnosticDomain,
    stage: boundedField(diagnosticStage),
    retryable: fault.retryable,
    nextAction: actionFor(fault.code),
    context: safe,
    causes: [
      ...boundedCauses(fault.details?.causes),
      diagnosticCause(fault, diagnosticDomain, diagnosticStage, safe),
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
  causes: [...diagnostic.causes, safeCause(cause)].slice(-MAX_CAUSES),
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
