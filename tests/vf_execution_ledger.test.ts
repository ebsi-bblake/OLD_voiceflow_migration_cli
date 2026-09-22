import { describe, expect, test } from "bun:test";
import {
  claimExecutionLedger,
  createExecutionLedgerRecord,
  ExecutionLedgerRecordSchema,
  readExecutionLedgerDecision,
  transitionExecutionLedgerRecord,
} from "../xyops/voiceflow/execution-ledger";
import { createXYOpsExecutionLedgerStore } from "../xyops/voiceflow/xyops-execution-ledger-store";

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

  test("claims a missing record and writes only the minimal plan entry", async () => {
    const requests: Request[] = [];
    const store = createXYOpsExecutionLedgerStore({
      baseURL: "https://xyops.example.test",
      apiKey: "api-key",
      bucketID: "bucket-1",
      fetcher: async (input, init) => {
        requests.push(new Request(input, init));
        return new Response(JSON.stringify({ data: {} }), { status: 200 });
      },
    });

    expect(await claimExecutionLedger(store, "plan-1", timestamp)).toBe("execute");
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toContain("/api/app/get_bucket/v1?id=bucket-1");
    expect(requests[1].url).toBe(
      "https://xyops.example.test/api/app/write_bucket_data/v1",
    );
    expect(await requests[1].clone().json()).toEqual({
      id: "bucket-1",
      data: {
        "plan-1": { planId: "plan-1", status: "in-flight", timestamp },
      },
    });
  });
});
