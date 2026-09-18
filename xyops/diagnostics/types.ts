export type DiagnosticDomain =
  "core" | "plugin" | "cli" | "logux" | "transport" | "protocol";

export type DiagnosticPrimitive = string | number | boolean | null;
export interface SafeContextObject {
  readonly [key: string]: SafeContextValue;
}
export type SafeContextValue =
  DiagnosticPrimitive | readonly SafeContextValue[] | SafeContextObject;
export type SafeContext = Readonly<Record<string, SafeContextValue>>;

export type DiagnosticCause = Readonly<{
  domain: DiagnosticDomain | string;
  code: string;
  stage: string;
  retryable: boolean;
  context: SafeContext;
  diagnostic?: Diagnostic;
}>;

export type Diagnostic = Readonly<{
  code: string;
  domain: DiagnosticDomain;
  stage: string;
  retryable: boolean;
  nextAction: string;
  context: SafeContext;
  causes: readonly DiagnosticCause[];
  diagnostic?: Diagnostic;
}>;
