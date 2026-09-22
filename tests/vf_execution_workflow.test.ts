import { expect, test } from "bun:test";
import { main } from "../xyops/voiceflow/initialize-execution-workflow";

const selection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
} as const;

const plan = {
  planID: "plan-1",
  selection,
  labels: {
    sourceWorkspace: "Source Workspace",
    sourceProject: "Source Project",
    sourceVersion: "Source Version",
    destinationWorkspace: "Destination Workspace",
    destinationFolder: "Destination Folder",
  },
} as const;

test("initializes execution workflow data from a confirmed handoff", async () => {
  const result = await main({
    schemaVersion: 1,
    confirmed: true,
    planID: plan.planID,
    plan,
  });

  expect(result).toMatchObject({
    ok: true,
    operation: "initialize_execution_workflow",
    result: {
      schemaVersion: 1,
      stage: "EXECUTION_READY",
      planID: "plan-1",
      selection,
      plan,
    },
  });
});

test.each([
  { confirmed: false },
  { planID: "different-plan" },
  { secretFileContents: [{ name: "TOKEN", value: "secret" }] },
])("rejects an unsafe execution handoff: %o", async (change) => {
  const result = await main({
    schemaVersion: 1,
    confirmed: true,
    planID: plan.planID,
    plan,
    ...change,
  });

  expect(result).toMatchObject({
    ok: false,
    operation: "initialize_execution_workflow",
    error: { code: "INVALID_ARGUMENT" },
  });
});
