import { expect, test } from "bun:test";
import { main } from "../xyops/voiceflow/resolve-migration-source";

const workflowData = {
  schemaVersion: 1,
  stage: "SOURCE_CATALOG_LOADED" as const,
  config: { source_path: "Workspace/boaz/boazmasteroftheuniversepoc" },
  catalog: {
    workspaces: [{ id: "workspace-1", label: "Workspace" }],
    sourceProjects: [{
      id: "project-1",
      label: "BoazMasterOfTheUniversePoC",
      workspaceID: "workspace-1",
      folderID: "folder-1",
      environments: [{ label: "Development", draftVersionID: "version-1" }],
    }],
    sourceFolders: [{
      id: "folder-1",
      label: "Boaz",
      workspaceID: "workspace-1",
    }],
  },
  selection: { sourceWorkspaceID: "workspace-1" },
};

test("resolves a configured source path without the option ID suffix", async () => {
  const result = await main(workflowData);

  expect(result).toMatchObject({
    ok: true,
    result: {
      stage: "SOURCE_RESOLVED",
      selection: {
        sourceWorkspaceID: "workspace-1",
        sourceProjectID: "project-1",
        sourceVersionID: "version-1",
      },
    },
  });
});
