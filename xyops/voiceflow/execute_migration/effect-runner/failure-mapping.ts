import { OperationFault } from "../../contracts";
import type {
  MigrationWorkflowFailure,
  MigrationWorkflowState,
} from "../../execute-migration-state-machine";

export const workflowFailure = (
  error: unknown,
  stage: MigrationWorkflowState["stage"],
): MigrationWorkflowFailure =>
  error instanceof OperationFault
    ? {
        code: error.code,
        retryable: error.retryable,
        stage,
        diagnostic: error.diagnostic,
      }
    : { code: "INTERNAL_ERROR", retryable: false, stage };

type SupportedFailureCode =
  | "IMPORT_OUTCOME_UNKNOWN"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"
  | "AUTHENTICATION_FAILED"
  | "PLAN_MISMATCH"
  | "CONFIRMATION_REQUIRED"
  | "DEPENDENCY_TIMEOUT"
  | "DEPENDENCY_FAILURE";
const supportedFailureCodes: readonly SupportedFailureCode[] = [
  "IMPORT_OUTCOME_UNKNOWN",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "INVALID_ARGUMENT",
  "AUTHENTICATION_FAILED",
  "PLAN_MISMATCH",
  "CONFIRMATION_REQUIRED",
  "DEPENDENCY_TIMEOUT",
  "DEPENDENCY_FAILURE",
];
const failureCode = (code: string | undefined): SupportedFailureCode =>
  code !== undefined &&
  supportedFailureCodes.includes(code as SupportedFailureCode)
    ? (code as SupportedFailureCode)
    : "DEPENDENCY_FAILURE";

const terminalFailureCode = (
  state: MigrationWorkflowState,
): string | undefined => state.context.terminalFailure?.code ?? state.code;
const terminalFailureRetryable = (state: MigrationWorkflowState): boolean =>
  state.context.terminalFailure?.retryable ?? state.retryable ?? false;
const terminalFailureDiagnostic = (
  state: MigrationWorkflowState,
): string | undefined =>
  state.context.terminalFailure?.diagnostic ?? state.diagnostic;
const terminalFailureStage = (state: MigrationWorkflowState): string =>
  state.context.terminalFailure?.stage ?? state.stage;

export const failureForState = (
  state: MigrationWorkflowState,
): OperationFault =>
  new OperationFault(
    failureCode(terminalFailureCode(state)),
    terminalFailureRetryable(state),
    terminalFailureDiagnostic(state),
    { stage: terminalFailureStage(state) },
  );

export const addFailureStage = (error: unknown, stage: string): unknown =>
  error instanceof OperationFault
    ? new OperationFault(
        error.code,
        error.retryable,
        [stage, error.diagnostic]
          .filter((value): value is string => value !== undefined)
          .join(" "),
        error.details,
      )
    : new Error(
        `stage=${stage} error=${error instanceof Error ? error.message : String(error)}`,
      );

type ReducerFailureCode =
  | "AUTHENTICATION_FAILED"
  | "DEPENDENCY_FAILURE"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT";
export const reducerFailureCode = (error: unknown): ReducerFailureCode => {
  if (!(error instanceof OperationFault)) return "INTERNAL_ERROR";
  switch (error.code) {
    case "AUTHENTICATION_FAILED":
    case "DEPENDENCY_FAILURE":
    case "INTERNAL_ERROR":
    case "NOT_FOUND":
    case "INVALID_ARGUMENT":
      return error.code;
    default:
      return "INTERNAL_ERROR";
  }
};
