import { describe, expect, test } from "bun:test";
import {
  parseSecretEntries,
  parseSecretEntriesJSON,
  parseSecretsFile,
  resolveProjectPath,
} from "../xyops/voiceflow/secrets";

const secret = (key: string, value: string) => ({ key, value, type: "" as const });

describe("secret file parsing", () => {
  test("accepts JSON secret entries", () => {
    const contents = JSON.stringify([secret("FIRST_SECRET", "first value"), secret("SECOND_SECRET", "second value")]);
    expect(parseSecretsFile(contents)).toEqual([secret("FIRST_SECRET", "first value"), secret("SECOND_SECRET", "second value")]);
  });

  test("accepts parsed JSON arrays", () => {
    expect(parseSecretEntries([secret("TEST_SECRET", "value")])).toEqual([secret("TEST_SECRET", "value")]);
    expect(parseSecretEntriesJSON('[{"key":"TEST_SECRET","value":"value","type":""}]')).toEqual([secret("TEST_SECRET", "value")]);
  });

  test("rejects the legacy object map format", () => {
    expect(() => parseSecretEntries({ TEST_SECRET: "value" })).toThrow("JSON array");
  });

  test("rejects malformed, unsupported, and duplicate entries", () => {
    const malformed = [
      [{ key: "TEST_SECRET", type: "" }],
      [{ key: "TEST_SECRET", value: "value" }],
      [{ key: "TEST_SECRET", value: "value", type: "string" }],
      [{ key: "TEST_SECRET", value: "value", type: "", extra: true }],
    ];
    malformed.forEach((entries) => {
      expect(() => parseSecretEntries(entries)).toThrow();
    });
    const duplicate = [secret("TEST_SECRET", "first"), secret("TEST_SECRET", "second")];
    expect(() => parseSecretEntries(duplicate)).toThrow("duplicate");
  });

  test("resolves a project path through workspace and nested folders", () => {
    expect(resolveProjectPath(
      [{ id: "workspace-1", label: "Source Workspace" }],
      [
        { id: "folder-1", label: "Parent^n", workspaceID: "workspace-1" },
        { id: "folder-2", label: "Child^n", workspaceID: "workspace-1", parentID: "folder-1" },
      ],
      [{ id: "project-1", label: "Source Project", workspaceID: "workspace-1", folderID: "folder-2", environments: [] }],
      "Source Workspace/Parent^n/Child^n/Source Project",
    )).toBe("project-1");
  });

  test("resolves a project path without looking up folders", () => {
    expect(resolveProjectPath(
      [{ id: "workspace-1", label: "Source Workspace" }],
      [],
      [{ id: "project-1", label: "Source Project", workspaceID: "workspace-1", environments: [] }],
      "Source Workspace/Source Project",
    )).toBe("project-1");
  });

  test("rejects an unresolved project path without exposing its value", () => {
    const path = "Source Workspace/Missing Project/PRIVATE_VALUE";
    expect(() => resolveProjectPath(
      [{ id: "workspace-1", label: "Source Workspace" }],
      [],
      [],
      path,
    )).toThrow("Configured project path could not be resolved.");
    expect(() => resolveProjectPath([], [], [], path)).toThrowError(
      new Error("Configured project path could not be resolved."),
    );
  });
});
