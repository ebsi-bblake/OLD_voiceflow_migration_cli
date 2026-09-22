import { expect, test } from "bun:test";
import { failure, OperationFault } from "../xyops/voiceflow/contracts";
import { main } from "../xyops/voiceflow/create-folder-workflow";

const workflowData = {
  schemaVersion: 1,
  stage: "EXECUTION_READY" as const,
  planID: "plan-1",
  selection: {
    sourceWorkspaceID: "source-workspace",
    sourceProjectID: "source-project",
    sourceVersionID: "source-version",
    destinationWorkspaceID: "destination-workspace",
  },
  plan: {
    planID: "plan-1",
    selection: {
      sourceWorkspaceID: "source-workspace",
      sourceProjectID: "source-project",
      sourceVersionID: "source-version",
      destinationWorkspaceID: "destination-workspace",
    },
    labels: {
      sourceWorkspace: "Source Workspace",
      sourceProject: "Source Project",
      sourceVersion: "Source Version",
      destinationWorkspace: "Destination Workspace",
      destinationFolder: "New Folder",
    },
    destinationFolderCreation: {
      workspaceID: "destination-workspace",
      requestedPath: "New Folder",
      action: "CREATE_DESTINATION_FOLDER" as const,
    },
  },
};

const folder = {
  id: "folder-1",
  label: "New Folder",
  workspaceID: "destination-workspace",
};

test("reuses a folder that appears after an uncertain create response", async () => {
  let reads = 0;
  const result = await main("token", workflowData, {
    resolveCurrentFolder: async () => {
      reads += 1;
      return reads === 1 ? undefined : folder;
    },
    createFolder: async () =>
      failure("create_folder", "operation-1", new OperationFault("DEPENDENCY_TIMEOUT", true)),
  });

  expect(result).toMatchObject({
    ok: true,
    result: {
      selection: { destinationFolderID: "folder-1" },
      plan: { planID: expect.any(String) },
    },
  });
});

test("blocks an uncertain create when the folder is still absent", async () => {
  const result = await main("token", workflowData, {
    resolveCurrentFolder: async () => undefined,
    createFolder: async () =>
      failure("create_folder", "operation-1", new OperationFault("DEPENDENCY_TIMEOUT", true)),
  });

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "DEPENDENCY_TIMEOUT",
      retryable: true,
      message: expect.stringContaining("destination-folder-creation-uncertain"),
    },
  });
});
