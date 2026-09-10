import { describe, expect, test } from "bun:test";
import { OperationFault, toOperationError } from "../xyops/voiceflow/contracts";
import { ErrorCode, VoiceflowOperation, WarningCode } from "../xyops/voiceflow/types";
import { isVoiceflowEnvelope } from "../xyops/cli/guards";

describe("Voiceflow unexpected error diagnostics", () => {
  test("preserves every finite wire value during JSON serialization", () => {
    expect(Object.values(VoiceflowOperation)).toEqual([
      "check_session", "list_workspaces", "list_projects", "list_versions",
      "list_folders", "create_folder", "plan_migration", "execute_migration",
    ]);
    expect(Object.values(ErrorCode)).toContain("INTERNAL_ERROR");
    expect(Object.values(WarningCode)).toEqual(["NOT_IDEMPOTENT", "API_KEY_RETRIEVAL_FAILED"]);
    expect(Object.values(ErrorCode).map((code) => toOperationError(new OperationFault(code)).code)).toEqual(
      Object.values(ErrorCode),
    );
    expect(JSON.parse(JSON.stringify(ErrorCode.InternalError))).toBe("INTERNAL_ERROR");
  });

  test("rejects unknown error and warning codes at the response boundary", () => {
    const guard = isVoiceflowEnvelope(() => true);
    const valid = {
      ok: true,
      operation: "check_session",
      operationID: "operation-1",
      result: {},
      warnings: [{ code: "NOT_IDEMPOTENT", message: "warning" }],
    };
    expect(guard(valid)).toBe(true);
    expect(guard({ ...valid, warnings: [{ code: "UNKNOWN", message: "warning" }] })).toBe(false);
    expect(guard({ ...valid, warnings: [], result: {}, operation: "unknown" })).toBe(false);
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
