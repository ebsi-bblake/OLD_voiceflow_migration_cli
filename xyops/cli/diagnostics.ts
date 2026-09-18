import { VoiceflowRegex } from "../voiceflow/regex";
import type { CliDiagnostic, CliDiagnosticCode } from "./types";
import type { Diagnostic, SafeContext } from "../diagnostics/types";
import { redactDiagnosticValue } from "../diagnostics/redact";
export type { CliDiagnostic, CliDiagnosticCode } from "./types";

type SafeEndpoint = (endpoint: string) => string;
const safeEndpoint: SafeEndpoint = (endpoint) =>
  endpoint.replace(VoiceflowRegex.safeEndpoint, "").slice(0, 80) || "xyops";

type CreateCliError = (
  diagnostic: Omit<CliDiagnostic, "endpoint"> & { endpoint?: string },
) => CliError;
const createCliError: CreateCliError = (diagnostic) =>
  new CliError({
    ...diagnostic,
    endpoint: safeEndpoint(diagnostic.endpoint ?? "xyops"),
  });

export class CliError extends Error {
  constructor(readonly diagnostic: CliDiagnostic) {
    super(diagnostic.code);
    this.name = "CliError";
  }
}

type DiagnosticOptions = Readonly<{
  endpoint?: string;
  retryable?: boolean;
  status?: number;
  nextAction?: string;
  diagnostic?: Diagnostic;
}>;

type Fail = (code: CliDiagnosticCode, options?: DiagnosticOptions) => CliError;
const defaultNextAction = (retryable: boolean | undefined): string =>
  retryable
    ? "Retry the operation."
    : "Check configuration and migration inputs.";
const resolveNextAction = (options: DiagnosticOptions): string =>
  options.nextAction ?? defaultNextAction(options.retryable);
const resolveRetryable = (options: DiagnosticOptions): boolean =>
  options.retryable ?? false;
export const fail: Fail = (code, options = {}) =>
  createCliError({
    code,
    endpoint: options.endpoint,
    retryable: resolveRetryable(options),
    status: options.status,
    nextAction: resolveNextAction(options),
    ...(options.diagnostic === undefined ? {} : { diagnostic: options.diagnostic }),
  });

type AsCliError = (error: unknown) => CliError;
export const asCliError: AsCliError = (error) =>
  error instanceof CliError ? error : fail("network", { retryable: false });

type CliErrorOutput = (error: unknown) => Readonly<Record<string, unknown>>;
const isSafeContextObject = (value: unknown): value is SafeContext =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeDiagnostic = (diagnostic: Diagnostic): SafeContext => {
  const redacted = redactDiagnosticValue(diagnostic);
  return isSafeContextObject(redacted) ? redacted : {};
};
export const cliErrorOutput: CliErrorOutput = (error) => {
  const diagnostic = asCliError(error).diagnostic;
  const safeNestedDiagnostic = diagnostic.diagnostic === undefined
    ? undefined
    : safeDiagnostic(diagnostic.diagnostic);
  return {
    code: diagnostic.code,
    endpoint: diagnostic.endpoint,
    retryable: diagnostic.retryable,
    ...(diagnostic.status === undefined ? {} : { status: diagnostic.status }),
    nextAction: diagnostic.nextAction,
    ...(safeNestedDiagnostic === undefined ? {} : { diagnostic: safeNestedDiagnostic }),
  };
};
