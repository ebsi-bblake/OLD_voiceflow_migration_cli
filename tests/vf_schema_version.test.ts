import { describe, expect, test } from "bun:test";

import {
  readExportedSchemaVersion,
  resolveTargetSchemaVersion,
  type ExportArtifact,
} from "../xyops/voiceflow/export";
import { toOperationError } from "../xyops/voiceflow/contracts";

const artifactFor = (value: unknown): ExportArtifact => ({
  status: 200,
  bytes: new TextEncoder().encode(JSON.stringify(value)).buffer,
  filename: "voiceflow-export.vf",
  contentType: "application/octet-stream",
});

describe("exported schema version", () => {
  test("uses the version metadata when no target is configured", () => {
    expect(readExportedSchemaVersion(artifactFor({ _version: "13.1" }))).toBe("13.1");
    expect(resolveTargetSchemaVersion(artifactFor({ _version: "13.1" }))).toBe("13.1");
  });

  test("keeps an explicitly configured target", () => {
    expect(resolveTargetSchemaVersion(artifactFor({ _version: "13.1" }), "12.0")).toBe("12.0");
  });

  test("rejects missing and malformed metadata without exposing the payload", () => {
    for (const value of [{}, { _version: "not-a-schema" }]) {
      let failure: unknown;
      try {
        readExportedSchemaVersion(artifactFor(value));
      } catch (error) {
        failure = error;
      }
      const diagnostic = toOperationError(failure);
      expect(diagnostic.code).toBe("CONFIGURATION");
      expect(diagnostic.message).toMatch(/_version.*major\.minor/);
      expect(diagnostic.message).not.toContain(JSON.stringify(value));
    }
  });
});
