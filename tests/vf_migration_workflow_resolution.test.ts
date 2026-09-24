import { expect, test } from "bun:test";
import { main } from "../xyops/voiceflow/resolve-migration-source";
import { resolveWorkspace as resolveSourceWorkspace } from "../xyops/voiceflow/load-migration-source-catalog";

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

test("resolves a configured source path and defaults to development", async () => {
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

test("reports unknown source workspaces with candidate labels", () => {
  let error: unknown;
  try {
    resolveSourceWorkspace(
      { source_path: "Missing/Project" },
      [{ id: "workspace-1", label: "Workspace One" }, { id: "workspace-2", label: "Workspace Two" }],
    );
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({
    diagnostic: "source-workspace-resolution-mismatch",
    details: {
      context: {
        configuredSelection: { source_path: "Missing/Project" },
        candidateLabels: ["Workspace One", "Workspace Two"],
      },
    },
  });
});

test("reports unknown source projects with candidate labels", async () => {
  const result = await main({
    ...workflowData,
    config: { source_path: "Workspace/Missing Project" },
  });

  expect(result).toMatchObject({
    ok: false,
    error: {
      code: "CONFIGURATION",
      diagnostic: {
        code: "CONFIGURATION",
        stage: "source-resolution",
        context: {
          configuredSelection: { source_path: "Workspace/Missing Project" },
          candidateLabels: ["Boaz/BoazMasterOfTheUniversePoC (project-1)"],
        },
      },
    },
  });
});
