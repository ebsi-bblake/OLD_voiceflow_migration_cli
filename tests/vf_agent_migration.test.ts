import { describe, expect, test } from "bun:test";

import {
  createVoiceflowMigrationAgent,
  type AgentMigrationSelection,
} from "../xyops/agent/voiceflow-migration";
import { createExecutionLedgerRecord } from "../xyops/voiceflow/execution-ledger";

const selection: AgentMigrationSelection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
  targetSchemaVersion: "13.12",
};
const timestamp = "2026-09-22T20:00:00.000Z";

const createStore = () => {
  let record = createExecutionLedgerRecord("plan-1", "failed", timestamp);
  return {
    read: async () => record,
    write: async (next: typeof record) => {
      record = next;
    },
  };
};

describe("Voiceflow migration agent adapter", () => {
  test("requires explicit confirmation without claiming the ledger", async () => {
    const store = createStore();
    const agent = createVoiceflowMigrationAgent({ ledgerStore: store });

    await expect(
      agent.execute({
        token: "token",
        planID: "plan-1",
        selection,
        confirmed: false,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "CONFIRMATION_REQUIRED" },
    });
    await expect(store.read()).resolves.toMatchObject({ status: "failed" });
  });

  test("blocks a completed plan before invoking Voiceflow", async () => {
    let record = createExecutionLedgerRecord("plan-1", "completed", timestamp);
    const agent = createVoiceflowMigrationAgent({
      ledgerStore: {
        read: async () => record,
        write: async (next) => {
          record = next;
        },
      },
    });

    await expect(
      agent.execute({
        token: "token",
        planID: "plan-1",
        selection,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "PLAN_MISMATCH" },
    });
  });
});
