import { describe, expect, test } from "bun:test";
import {
  createExecutionLedgerRecord,
  ExecutionLedgerRecordSchema,
  readExecutionLedgerDecision,
  transitionExecutionLedgerRecord,
} from "../xyops/voiceflow/execution-ledger";

describe("execution ledger policy", () => {
  const timestamp = "2026-09-21T20:00:00.000Z";

  test("starts a plan with no ledger record", () => {
    expect(readExecutionLedgerDecision(undefined)).toBe("start");
  });

  test("starts a plan after a confirmed non-mutating failure", () => {
    const record = createExecutionLedgerRecord(
      "plan-1",
      "failed",
      timestamp,
    );
    expect(readExecutionLedgerDecision(record)).toBe("start");
  });

  test("skips a completed plan", () => {
    const record = createExecutionLedgerRecord(
      "plan-1",
      "completed",
      timestamp,
    );
    expect(readExecutionLedgerDecision(record)).toBe("skip");
  });

  test("reconciles in-flight and unknown plans", () => {
    expect(
      readExecutionLedgerDecision(
        createExecutionLedgerRecord("plan-1", "in-flight", timestamp),
      ),
    ).toBe("reconcile");
    expect(
      readExecutionLedgerDecision(
        createExecutionLedgerRecord("plan-1", "unknown", timestamp),
      ),
    ).toBe("reconcile");
  });

  test("does not overwrite terminal completed or unknown records", () => {
    const completed = createExecutionLedgerRecord(
      "plan-1",
      "completed",
      timestamp,
    );
    const unknown = createExecutionLedgerRecord(
      "plan-1",
      "unknown",
      timestamp,
    );
    expect(
      transitionExecutionLedgerRecord(
        completed,
        "in-flight",
        "2026-09-21T20:01:00.000Z",
      ),
    ).toEqual(completed);
    expect(
      transitionExecutionLedgerRecord(
        unknown,
        "in-flight",
        "2026-09-21T20:01:00.000Z",
      ),
    ).toEqual(unknown);
  });

  test("validates the minimal secret-free record", () => {
    expect(
      ExecutionLedgerRecordSchema.safeParse({
        planId: "plan-1",
        status: "in-flight",
        timestamp,
      }).success,
    ).toBe(true);
    expect(
      ExecutionLedgerRecordSchema.safeParse({
        planId: "plan-1",
        status: "in-flight",
        timestamp,
        jobId: "secret-or-extra-state",
      }).success,
    ).toBe(false);
  });
});
