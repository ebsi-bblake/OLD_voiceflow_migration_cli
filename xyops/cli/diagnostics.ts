import { VoiceflowRegex } from "../voiceflow/regex";
import type { CliDiagnostic, CliDiagnosticCode } from "./types";
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
  });

type AsCliError = (error: unknown) => CliError;
export const asCliError: AsCliError = (error) =>
  error instanceof CliError ? error : fail("network", { retryable: false });

type CliErrorOutput = (error: unknown) => Readonly<Record<string, unknown>>;
export const cliErrorOutput: CliErrorOutput = (error) => {
  const diagnostic = asCliError(error).diagnostic;
  return {
    code: diagnostic.code,
    endpoint: diagnostic.endpoint,
    retryable: diagnostic.retryable,
    ...(diagnostic.status === undefined ? {} : { status: diagnostic.status }),
    nextAction: diagnostic.nextAction,
  };
};
