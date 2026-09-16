import { describe, expect, test } from "bun:test";

import { folderOptions } from "../xyops/voiceflow/catalog";
import { importVersion } from "../xyops/voiceflow/import";
import { requireVoiceflowString } from "../xyops/voiceflow/validation";
import { VoiceflowRegex } from "../xyops/voiceflow/regex";

describe("Voiceflow destination-folder validation", () => {
  test("shares required-string trimming and rejection across Voiceflow boundaries", () => {
    expect(requireVoiceflowString("  workspace-1 ")).toBe("workspace-1");
    expect(() => requireVoiceflowString(" \t ")).toThrow("invalid");
    expect(() => requireVoiceflowString(undefined)).toThrow("invalid");
  });

  test("recognizes ordinary folder names without accepting control characters", () => {
    expect(VoiceflowRegex.controlCharacter.test("temp folder for testing")).toBe(false);
    expect(VoiceflowRegex.controlCharacter.test("temp\u0000folder")).toBe(true);
  });

  test("excludes project IDs from folder options", () => {
    const options = folderOptions("workspace-1")([
      {
        id: "6a8353e05b254446fc52750e",
        label: "Project record",
        workspaceID: "workspace-1",
      },
      { id: "42", label: "boaz-test", workspaceID: "workspace-1" },
    ]);

    expect(options).toEqual([{ value: "42", label: "boaz-test" }]);
  });

  test("rejects a project ID before the import request", async () => {
    const previousFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("unexpected import request");
    }) as typeof fetch;

    try {
      const result = importVersion(
        { token: "header.payload.signature", creatorID: "creator-1" },
        {
          status: 200,
          bytes: new ArrayBuffer(0),
          filename: "voiceflow-export.vf",
          contentType: "application/octet-stream",
        },
        "workspace-1",
        "6a8353e05b254446fc52750e",
        "13.1",
      );

      await expect(result).rejects.toMatchObject({ code: "INVALID_ARGUMENT" });
      expect(fetchCalls).toBe(0);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
