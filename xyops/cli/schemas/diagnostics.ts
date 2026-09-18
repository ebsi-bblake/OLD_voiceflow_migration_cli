import { z } from "zod";

const SafeDiagnosticValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(SafeDiagnosticValueSchema),
    z.record(z.string(), SafeDiagnosticValueSchema),
  ]),
);

const DiagnosticCauseSchema = z
  .object({
    domain: z.enum(["core", "plugin", "cli", "logux", "transport", "protocol"]),
    code: z.string().min(1),
    stage: z.string().min(1),
    retryable: z.boolean(),
    context: z.record(z.string(), SafeDiagnosticValueSchema),
    diagnostic: z.lazy(() => DiagnosticSchema).optional(),
  })
  .loose();

export const DiagnosticSchema: z.ZodType<DiagnosticDTO> = z
  .object({
    code: z.string().min(1),
    domain: z.enum(["core", "plugin", "cli", "logux", "transport", "protocol"]),
    stage: z.string().min(1),
    retryable: z.boolean(),
    nextAction: z.string().min(1),
    context: z.record(z.string(), SafeDiagnosticValueSchema),
    causes: z.array(DiagnosticCauseSchema),
    diagnostic: z.lazy(() => DiagnosticSchema).optional(),
  })
  .loose();

export type DiagnosticCauseDTO = {
  readonly domain:
    "core" | "plugin" | "cli" | "logux" | "transport" | "protocol";
  readonly code: string;
  readonly stage: string;
  readonly retryable: boolean;
  readonly context: Readonly<Record<string, unknown>>;
  readonly diagnostic?: DiagnosticDTO;
};
export type DiagnosticDTO = {
  readonly code: string;
  readonly domain:
    "core" | "plugin" | "cli" | "logux" | "transport" | "protocol";
  readonly stage: string;
  readonly retryable: boolean;
  readonly nextAction: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly causes: readonly DiagnosticCauseDTO[];
  readonly diagnostic?: DiagnosticDTO;
};
