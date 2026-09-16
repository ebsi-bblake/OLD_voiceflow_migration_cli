import { afterEach, describe, expect, test } from "bun:test";
import { configureDebug, debugLog } from "../xyops/voiceflow/debug";

afterEach(() => configureDebug(undefined));

describe("debug logger selection", () => {
  test("enables every logger with the bare selector", () => {
    const lines: string[] = [];
    configureDebug(true, (line) => lines.push(line));
    debugLog("logux-secret", "frame", { actionType: "secret.CREATE_ONE_FAILED" });
    expect(lines).toHaveLength(1);
  });

  test("selects a logger and its subsections without enabling siblings", () => {
    const lines: string[] = [];
    configureDebug("logux", (line) => lines.push(line));
    debugLog("logux-secret", "frame");
    debugLog("logux-rename", "frame");
    debugLog("http", "request");
    expect(lines).toHaveLength(2);
  });

  test("supports comma-separated named selectors", () => {
    const lines: string[] = [];
    configureDebug("logux-secret,http", (line) => lines.push(line));
    debugLog("logux-secret", "frame");
    debugLog("http", "request");
    debugLog("catalog", "frame");
    expect(lines).toHaveLength(2);
  });
});
