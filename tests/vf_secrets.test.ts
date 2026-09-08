import { describe, expect, test } from "bun:test";
import {
  parseSecretEntries,
  parseSecretEntriesJSON,
  parseSecretsFile,
} from "../xyops/voiceflow/vf_secrets";
import { parseSecretEntries as parseArchivedSecretEntries } from "../windmill_agent_scripts/vf_secrets";

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
      expect(() => parseArchivedSecretEntries(entries)).toThrow();
    });
    const duplicate = [secret("TEST_SECRET", "first"), secret("TEST_SECRET", "second")];
    expect(() => parseSecretEntries(duplicate)).toThrow("duplicate");
    expect(() => parseArchivedSecretEntries(duplicate)).toThrow("duplicate");
  });

  test("keeps active and archived parsers aligned for valid entries", () => {
    const entries = [secret("FIRST_SECRET", "first value"), secret("SECOND_SECRET", "second value")];
    expect(parseArchivedSecretEntries(entries)).toEqual(parseSecretEntries(entries));
  });
});
