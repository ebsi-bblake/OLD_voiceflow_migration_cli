import { describe, expect, test } from "bun:test";
import {
  parseEventOperation,
  parseFolderID,
  parseFolderName,
  parseProjectID,
  parseSchemaVersion,
  parseWorkspaceID,
} from "../xyops/voiceflow/validation";
import { parseXYOpsURL } from "../xyops/voiceflow/urls";

describe("Voiceflow string and URL boundaries", () => {
  test("trims Unicode values while rejecting path separators and non-strings", () => {
    expect(parseWorkspaceID("  開発  ")).toBe("開発");
    for (const value of ["a/b", "a\\b", "", null, 42, [], {}, "a\nb"])
      expect(() => parseProjectID(value)).toThrow();
  });
  test("keeps folder IDs distinct from names and validates operations", () => {
    expect(parseFolderID(" 42 ")).toBe("42");
    expect(parseFolderName(" My ? # % .. ")).toBe("My ? # % ..");
    expect(parseSchemaVersion(" 13.1 ")).toBe("13.1");
    expect(parseEventOperation(" list_projects ")).toBe("list_projects");
    expect(() => parseFolderID("folder")).toThrow();
    expect(() => parseEventOperation("unknown")).toThrow();
  });
  test("accepts safe XYOps URLs and normalizes trailing slashes", () => {
    expect(parseXYOpsURL("https://xyops.example.test///")).toBe("https://xyops.example.test");
    for (const value of ["ftp://xyops.example.test", "https://user:pass@xyops.example.test", "https://xyops.example.test/#fragment"])
      expect(() => parseXYOpsURL(value)).toThrow();
  });
});
