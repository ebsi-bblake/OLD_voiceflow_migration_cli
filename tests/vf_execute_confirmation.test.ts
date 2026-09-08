import { afterAll, describe, expect, mock, test } from "bun:test";
import { resolveVoiceflowAuth as importedResolveVoiceflowAuth } from "../xyops/voiceflow/auth";

const originalResolveVoiceflowAuth = importedResolveVoiceflowAuth;

let authenticationCalls = 0;

mock.module("../xyops/voiceflow/auth", () => ({
  resolveVoiceflowAuth: async () => {
    authenticationCalls += 1;
    throw new Error("controlled downstream boundary");
  },
}));

const { main } = await import("../xyops/voiceflow/execute_migration");

afterAll(() => {
  mock.module("../xyops/voiceflow/auth", () => ({
    resolveVoiceflowAuth: originalResolveVoiceflowAuth,
  }));
});

const executeArguments = [
  "token",
  "plan-id",
  "source-workspace",
  "source-project",
  "source-version",
  "destination-workspace",
  "destination-folder",
] as const;

async function executeWithConfirmation(confirmed?: unknown) {
  if (confirmed === undefined) {
    return main(...executeArguments);
  }
  return main(...executeArguments, "13.1", confirmed as boolean);
}

describe("execute migration confirmation guard", () => {
  test.each([
    ["undefined", undefined],
    ["default", false],
    ["false string", "false"],
    ["true string", "true"],
    ["number", 1],
    ["object", {}],
  ])("rejects %s before downstream effects", async (_label, confirmed) => {
    authenticationCalls = 0;

    const result = await executeWithConfirmation(confirmed);

    expect(result).toMatchObject({
      ok: false,
      operation: "execute_migration",
      error: { code: "CONFIRMATION_REQUIRED" },
    });
    expect(authenticationCalls).toBe(0);
  });

  test("allows literal true through the confirmation guard", async () => {
    authenticationCalls = 0;

    const result = await executeWithConfirmation(true);

    expect(result).toMatchObject({
      ok: false,
      operation: "execute_migration",
      error: { code: "INTERNAL_ERROR" },
    });
    expect(authenticationCalls).toBe(1);
  });
});
