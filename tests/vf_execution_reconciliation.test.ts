import { expect, test } from "bun:test";
import { reconcileExecution } from "../xyops/voiceflow/execution-reconciliation";

test.each([
  [{ kind: "confirmed-non-start" }, "start"],
  [{ kind: "job-active" }, "resume-observation"],
  [{ kind: "job-completed" }, "settle-completed"],
  [{ kind: "job-failed", mutation: "none" }, "settle-failed"],
  [{ kind: "job-failed", mutation: "unknown" }, "settle-unknown"],
  [{ kind: "ambiguous" }, "block"],
] as const)("reconciles %o as %s", (observation, decision) => {
  expect(reconcileExecution(observation)).toBe(decision);
});

test("never treats an absent job as a confirmed non-start", () => {
  expect(reconcileExecution({ kind: "ambiguous" })).not.toBe("start");
});
