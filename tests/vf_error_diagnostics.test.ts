import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { OperationFault, toOperationError } from "../xyops/voiceflow/contracts";
import { ErrorCode, VoiceflowOperation, WarningCode } from "../xyops/voiceflow/types";
import { createVoiceflowEnvelopeSchema } from "../xyops/cli/schemas/voiceflow-envelope";
import { createPluginDiagnostic } from "../xyops/plugin/diagnostics";
import { mapVoiceflowEnvelope } from "../xyops/plugin/wire_protocol";
import { requireEnvelopeResult } from "../xyops/cli/validation";
import { CliError, cliErrorOutput, fail, formatCliError } from "../xyops/cli/diagnostics";
import { appendDiagnosticCause, createDiagnostic } from "../xyops/diagnostics/create";

describe("Voiceflow unexpected error diagnostics", () => {
  test("preserves every finite wire value during JSON serialization", () => {
    expect(Object.values(VoiceflowOperation)).toEqual([
      "check_session", "check_session_workflow", "list_workspaces", "load_workspaces", "load_source_catalog", "resolve_source_selection", "resolve_source_schema_workflow", "load_destination_catalog", "resolve_destination_selection", "plan_migration_workflow", "list_projects", "list_versions",
      "list_folders", "create_folder", "plan_migration", "execute_migration",
      "initialize_migration_workflow", "initialize_execution_workflow",
      "execute_migration_workflow", "create_folder_workflow",
    ]);
    expect(Object.values(ErrorCode)).toContain("INTERNAL_ERROR");
    expect(Object.values(WarningCode)).toEqual(["API_KEY_RETRIEVAL_FAILED"]);
    expect(Object.values(ErrorCode).map((code) => toOperationError(new OperationFault(code)).code)).toEqual(
      Object.values(ErrorCode),
    );
    expect(JSON.parse(JSON.stringify(ErrorCode.InternalError))).toBe("INTERNAL_ERROR");
  });

  test("rejects unknown error and warning codes at the response boundary", () => {
    const guard = createVoiceflowEnvelopeSchema(z.unknown());
    const valid = {
      ok: true,
      operation: "check_session",
      operationID: "operation-1",
      result: {},
      warnings: [{ code: "API_KEY_RETRIEVAL_FAILED", message: "warning" }],
    };
    expect(guard.safeParse(valid).success).toBe(true);
    expect(guard.safeParse({ ...valid, warnings: [{ code: "UNKNOWN", message: "warning" }] }).success).toBe(false);
    expect(guard.safeParse({ ...valid, warnings: [], result: {}, operation: "unknown" }).success).toBe(false);
  });

  test("preserves the canonical cause chain from core through plugin to CLI", () => {
    const coreFailure = new OperationFault("DEPENDENCY_FAILURE", true, undefined, {
      domain: "transport",
      stage: "export",
      context: { requestID: "request-1", token: "secret-token" },
      causes: [{
        domain: "core",
        code: "BACKEND_REJECTED",
        stage: "export-response",
        retryable: true,
        context: { status: 502 },
      }],
    });
    const core = toOperationError(coreFailure);
    const plugin = createPluginDiagnostic("dispatch", coreFailure);
    const envelope = mapVoiceflowEnvelope({
      ok: false,
      operation: "execute_migration",
      operationID: "operation-1",
      error: { ...core, diagnostic: plugin },
    });
    let cliError: unknown;
    try {
      requireEnvelopeResult(
        envelope.data?.voiceflow,
        "execute_migration",
        createVoiceflowEnvelopeSchema(z.unknown()),
      );
    } catch (error: unknown) {
      cliError = error;
    }

    expect(core.diagnostic).toMatchObject({
      code: "DEPENDENCY_FAILURE",
      domain: "transport",
      stage: "export",
      retryable: true,
      context: { requestID: "request-1", token: "[REDACTED]" },
    });
    expect(plugin.causes.map(({ code }) => code)).toEqual([
      "BACKEND_REJECTED",
      "DEPENDENCY_FAILURE",
      "DEPENDENCY_FAILURE",
    ]);
    expect(cliError).toBeInstanceOf(CliError);
    if (!(cliError instanceof CliError)) return;
    expect(cliError.diagnostic.diagnostic?.causes).toHaveLength(3);
    expect(cliError.diagnostic.nextAction).toBe("Retry only when the diagnostic policy permits it");
  });

  test("presents a safe actionable root cause without mutating its source", () => {
    const source = createDiagnostic(
      { code: "AUTHENTICATION_FAILED", retryable: false },
      "core",
      "auth",
      { requestID: "request-1", apiKey: "do-not-show" },
    );
    const withCliCause = appendDiagnosticCause(source, {
      domain: "cli",
      code: "AUTHENTICATION_FAILED",
      stage: "presentation",
      retryable: false,
      context: { password: "do-not-show", operator: "alice" },
    });
    const output = cliErrorOutput(fail("envelope", {
      nextAction: source.nextAction,
      diagnostic: withCliCause,
    }));

    expect(output).toMatchObject({
      nextAction: "Check authentication and sign in again",
      diagnostic: { code: "AUTHENTICATION_FAILED", stage: "auth" },
    });
    expect(JSON.stringify(output)).not.toContain("do-not-show");
    expect(source.causes).toHaveLength(1);
    expect(withCliCause.causes[1].context.password).toBe("[REDACTED]");
  });

  test("formats nested execution causes instead of generic job failures", () => {
    const output = formatCliError(
      fail("job", {
        nextAction: "The execution workflow failed.",
        diagnostic: createDiagnostic(
          { code: "PLAN_MISMATCH", retryable: false },
          "core",
          "execution-already-completed",
        ),
      }),
    );

    expect(output).toBe(
      "Migration failed: PLAN_MISMATCH. The execution workflow failed.",
    );
  });

  test("keeps confirmed rejection distinct from unknown outcome", () => {
    expect(toOperationError(new OperationFault("DEPENDENCY_FAILURE")).code).toBe("DEPENDENCY_FAILURE");
    expect(toOperationError(new OperationFault("IMPORT_OUTCOME_UNKNOWN", true)).code).toBe("IMPORT_OUTCOME_UNKNOWN");
    expect(toOperationError(new OperationFault("DEPENDENCY_FAILURE")).diagnostic?.nextAction).not.toBe(
      toOperationError(new OperationFault("IMPORT_OUTCOME_UNKNOWN", true)).diagnostic?.nextAction,
    );
  });

  test("preserves staged secret failure details without exposing secret data", () => {
    const result = toOperationError(
      new OperationFault(
        "DEPENDENCY_TIMEOUT",
        true,
        "stage=SECRET_CREATION logux-unknown-outcome",
        { stage: "SECRET_CREATION" },
      ),
    );

    expect(result.message).toContain("stage=logux-unknown-outcome");
    expect(result.diagnostic).toMatchObject({
      stage: "SECRET_CREATION",
      context: { detail: "logux-unknown-outcome" },
    });
  });

  test("redacts Zod issue inputs while preserving safe issue metadata", () => {
    const schema = z.object({ token: z.string() });
    const result = schema.safeParse({ token: { value: "secret-token" } });
    if (result.success) throw new Error("test fixture unexpectedly parsed");
    const source = result.error.issues;
    const diagnostic = createDiagnostic(
      { code: "INVALID_ARGUMENT", retryable: false },
      "plugin",
      "input",
      { issues: source.map((issue) => ({ ...issue, input: "secret-token" })) },
    );

    expect(diagnostic.context.issues[0]).toMatchObject({
      path: ["token"],
      expected: "string",
      input: "[REDACTED]",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("secret-token");
    expect(source[0]).not.toHaveProperty("input", "[REDACTED]");
  });

  test("returns a bounded safe error message", () => {
    const result = toOperationError(new Error(
      "WebSocket connection failed for Bearer abc VF.DM.xyz-value https://user:pass@example.test/path",
    ));

    expect(result).toMatchObject({ code: "INTERNAL_ERROR", retryable: false });
    expect(result.message).toContain("WebSocket connection failed");
    expect(result.message).toContain("Bearer [redacted]");
    expect(result.message).toContain("VF.DM.[redacted]");
    expect(result.message).toContain("[redacted-url]");
    expect(result.message).not.toContain("abc");
    expect(result.message).not.toContain("xyz-value");
  });
});
