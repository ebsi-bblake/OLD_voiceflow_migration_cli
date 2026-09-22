import { describe, expect, test } from "bun:test";
import {
  claimExecutionLedger,
  createExecutionLedgerRecord,
  ExecutionLedgerRecordSchema,
  readExecutionLedgerDecision,
  settleExecutionLedger,
  transitionExecutionLedgerRecord,
} from "../xyops/voiceflow/execution-ledger";
import { createXYOpsExecutionLedgerStore } from "../xyops/voiceflow/xyops-execution-ledger-store";
import { main as executeWorkflow } from "../xyops/voiceflow/execute-migration-workflow";

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

  test("settles a claimed record once and preserves a terminal duplicate settlement", async () => {
    const writes = [] as string[];
    const record = createExecutionLedgerRecord("plan-1", "in-flight", timestamp);
    const store = {
      read: async () => record,
      write: async (next: typeof record) => {
        writes.push(next.status);
      },
    };

    await expect(
      settleExecutionLedger(store, "plan-1", "completed", "2026-09-21T20:01:00.000Z"),
    ).resolves.toMatchObject({ status: "completed" });
    await expect(
      settleExecutionLedger(
        {
          ...store,
          read: async () => createExecutionLedgerRecord("plan-1", "completed", "2026-09-21T20:01:00.000Z"),
        },
        "plan-1",
        "failed",
        "2026-09-21T20:02:00.000Z",
      ),
    ).resolves.toMatchObject({ status: "completed" });
    expect(writes).toEqual(["completed"]);
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

  test("blocks a completed workflow before the migration executor", async () => {
    const result = await executeWorkflow(
      "voiceflow-token",
      {
        schemaVersion: 1,
        stage: "EXECUTION_READY",
        planID: "plan-1",
        selection: {
          sourceWorkspaceID: "source-workspace",
          sourceProjectID: "source-project",
          sourceVersionID: "source-version",
          destinationWorkspaceID: "destination-workspace",
          destinationFolderID: "destination-folder",
        },
        plan: {
          planID: "plan-1",
          selection: {
            sourceWorkspaceID: "source-workspace",
            sourceProjectID: "source-project",
            sourceVersionID: "source-version",
            destinationWorkspaceID: "destination-workspace",
            destinationFolderID: "destination-folder",
          },
          labels: {
            sourceWorkspace: "Source Workspace",
            sourceProject: "Source Project",
            sourceVersion: "Source Version",
            destinationWorkspace: "Destination Workspace",
            destinationFolder: "Destination Folder",
          },
        },
      },
      undefined,
      {
        ledgerStore: {
          read: async () =>
            createExecutionLedgerRecord("plan-1", "completed", timestamp),
          write: async () => {},
        },
        executeMigration: async () => {
          throw new Error("executor must not run");
        },
        now: () => timestamp,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      operation: "execute_migration_workflow",
      error: { code: "PLAN_MISMATCH" },
    });
  });

  test.each(["in-flight", "unknown"] as const)(
    "blocks a %s workflow before the migration executor",
    async (status) => {
      let executed = false;
      const result = await executeWorkflow(
        "voiceflow-token",
        {
          schemaVersion: 1,
          stage: "EXECUTION_READY",
          planID: "plan-1",
          selection: {
            sourceWorkspaceID: "source-workspace",
            sourceProjectID: "source-project",
            sourceVersionID: "source-version",
            destinationWorkspaceID: "destination-workspace",
            destinationFolderID: "destination-folder",
          },
          plan: {
            planID: "plan-1",
            selection: {
              sourceWorkspaceID: "source-workspace",
              sourceProjectID: "source-project",
              sourceVersionID: "source-version",
              destinationWorkspaceID: "destination-workspace",
              destinationFolderID: "destination-folder",
            },
            labels: {
              sourceWorkspace: "Source Workspace",
              sourceProject: "Source Project",
              sourceVersion: "Source Version",
              destinationWorkspace: "Destination Workspace",
              destinationFolder: "Destination Folder",
            },
          },
        },
        undefined,
        {
          ledgerStore: {
            read: async () => createExecutionLedgerRecord("plan-1", status, timestamp),
            write: async () => {},
          },
          executeMigration: async () => {
            executed = true;
            throw new Error("executor must not run");
          },
          now: () => timestamp,
        },
      );

      expect(executed).toBe(false);
      expect(result).toMatchObject({
        ok: false,
        error: { code: "IMPORT_OUTCOME_UNKNOWN" },
      });
    },
  );

  test("serializes concurrent claims for the same plan", async () => {
    let record: ReturnType<typeof createExecutionLedgerRecord> | undefined;
    const store = {
      read: async () => record,
      write: async (next: typeof record) => {
        record = next;
      },
    };

    const claims = await Promise.all([
      claimExecutionLedger(store, "plan-concurrent", timestamp),
      claimExecutionLedger(store, "plan-concurrent", timestamp),
    ]);

    expect(claims.sort()).toEqual(["execute", "reconcile"]);
    expect(record?.status).toBe("in-flight");
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
