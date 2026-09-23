import { VoiceflowRegex } from "../voiceflow/regex";
import type { CliDiagnostic, CliDiagnosticCode } from "./types";
import type { Diagnostic, SafeContext } from "../diagnostics/types";
import { redactDiagnosticValue } from "../diagnostics/redact";
import { DiagnosticSchema, type DiagnosticDTO } from "./schemas/diagnostics";
export type { CliDiagnostic, CliDiagnosticCode } from "./types";

const isSafeContext = (value: unknown): value is SafeContext =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeContext = (value: Readonly<Record<string, unknown>>): SafeContext => {
  const redacted = redactDiagnosticValue(value);
  return isSafeContext(redacted) ? redacted : {};
};
const toDiagnostic = (value: DiagnosticDTO): Diagnostic => ({
  code: value.code,
  domain: value.domain,
  stage: value.stage,
  retryable: value.retryable,
  nextAction: value.nextAction,
  context: safeContext(value.context),
  causes: value.causes.map((cause) => ({
    domain: cause.domain,
    code: cause.code,
    stage: cause.stage,
    retryable: cause.retryable,
    context: safeContext(cause.context),
    ...(cause.diagnostic === undefined
      ? {}
      : { diagnostic: toDiagnostic(cause.diagnostic) }),
  })),
  ...(value.diagnostic === undefined
    ? {}
    : { diagnostic: toDiagnostic(value.diagnostic) }),
});

export const parseDiagnostic = (value: unknown): Diagnostic | undefined => {
  const parsed = DiagnosticSchema.safeParse(value);
  return parsed.success ? toDiagnostic(parsed.data) : undefined;
};

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
    ...(options.diagnostic === undefined
      ? {}
      : { diagnostic: options.diagnostic }),
  });

type AsCliError = (error: unknown) => CliError;
export const asCliError: AsCliError = (error) =>
  error instanceof CliError ? error : fail("network", { retryable: false });

type CliErrorOutput = (error: unknown) => Readonly<Record<string, unknown>>;
const safeDiagnostic = (diagnostic: Diagnostic): SafeContext => {
  const redacted = redactDiagnosticValue(diagnostic);
  return isSafeContext(redacted) ? redacted : {};
};
export const cliErrorOutput: CliErrorOutput = (error) => {
  const diagnostic = asCliError(error).diagnostic;
  const safeNestedDiagnostic =
    diagnostic.diagnostic === undefined
      ? undefined
      : safeDiagnostic(diagnostic.diagnostic);
  return {
    code: diagnostic.code,
    endpoint: diagnostic.endpoint,
    retryable: diagnostic.retryable,
    ...(diagnostic.status === undefined ? {} : { status: diagnostic.status }),
    nextAction: diagnostic.nextAction,
    ...(safeNestedDiagnostic === undefined
      ? {}
      : { diagnostic: safeNestedDiagnostic }),
  };
};

type FormatCliError = (error: unknown) => string;
export const formatCliError: FormatCliError = (error) => {
  const output = cliErrorOutput(error);
  const nested = output.diagnostic;
  const code =
    isSafeContext(nested) && typeof nested.code === "string"
      ? nested.code
      : output.code;
  return `Migration failed: ${code}. ${String(output.nextAction)}`;
};
