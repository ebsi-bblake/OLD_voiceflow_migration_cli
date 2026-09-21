import { expect, test } from "bun:test";
import { main as planMigration } from "../xyops/voiceflow/plan-migration-workflow";
import { main as resolveDestination } from "../xyops/voiceflow/resolve-migration-destination";

const workflowData = {
  schemaVersion: 1,
  stage: "DESTINATION_CATALOG_LOADED" as const,
  config: {
    destination_path: "Destination Workspace/New Folder",
  },
  catalog: {
    workspaces: [
      { id: "source-workspace", label: "Source Workspace" },
      { id: "destination-workspace", label: "Destination Workspace" },
    ],
    sourceProjects: [
      {
        id: "source-project",
        label: "Source Project",
        workspaceID: "source-workspace",
        environments: [{ label: "Development", draftVersionID: "source-version" }],
      },
    ],
    sourceFolders: [],
    destinationFolders: [],
  },
  selection: {
    sourceWorkspaceID: "source-workspace",
    sourceProjectID: "source-project",
    sourceVersionID: "source-version",
    destinationWorkspaceID: "destination-workspace",
  },
};

test("plans a missing destination folder as an explicit creation action", async () => {
  const resolved = await resolveDestination(workflowData);
  expect(resolved).toMatchObject({
    ok: true,
    result: {
      stage: "DESTINATION_RESOLVED",
      destinationFolderCreation: {
        workspaceID: "destination-workspace",
        requestedPath: "New Folder",
        action: "CREATE_DESTINATION_FOLDER",
      },
    },
  });

  if (!resolved.ok) return;
  const planned = await planMigration(resolved.result);
  expect(planned).toMatchObject({
    ok: true,
    result: {
      stage: "PLANNED",
      plan: {
        labels: { destinationFolder: "New Folder" },
        destinationFolderCreation: {
          action: "CREATE_DESTINATION_FOLDER",
        },
      },
    },
  });
});
