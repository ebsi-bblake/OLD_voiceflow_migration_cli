import { describe, expect, test } from "bun:test";

import {
  createVoiceflowMigrationAgent,
  type AgentMigrationSelection,
} from "../xyops/agent/voiceflow-migration";

const selection: AgentMigrationSelection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
  targetSchemaVersion: "13.12",
};

describe("Voiceflow migration agent adapter", () => {
  test("requires explicit confirmation before executing", async () => {
    const agent = createVoiceflowMigrationAgent({});

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
  });
});
