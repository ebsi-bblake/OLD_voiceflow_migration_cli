import { expect, test } from "bun:test";
import {
  ConfirmedMigrationHandoffSchema,
  MigrationWorkflowDataSchema,
  type MigrationWorkflowData,
} from "../xyops/migration-workflow-data";

const config = {
  source_path: "Source Workspace/Source Project",
  destination_path: "Destination Workspace/Folder",
  target_schema_version: "13.1",
} as const;

const workspaces = [
  { id: "source-workspace", label: "Source Workspace" },
  { id: "destination-workspace", label: "Destination Workspace" },
] as const;

const sourceProjects = [
  {
    id: "source-project",
    label: "Source Project",
    workspaceID: "source-workspace",
    folderID: "source-folder",
    environments: [
      {
        label: "Development",
        draftVersionID: "source-version",
        publishedVersionID: "published-version",
      },
    ],
  },
] as const;

const sourceFolders = [
  {
    id: "source-folder",
    label: "Source Folder",
    workspaceID: "source-workspace",
  },
] as const;

const destinationFolders = [
  {
    id: "destination-folder",
    label: "Destination Folder",
    workspaceID: "destination-workspace",
    parentID: "destination-parent",
  },
] as const;

const selection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
  targetSchemaVersion: "13.1",
} as const;

const plan = {
  planID: "plan-1",
  selection,
  labels: {
    sourceWorkspace: "Source Workspace",
    sourceProject: "Source Project",
    sourceVersion: "[Draft] Source Project — Development",
    destinationWorkspace: "Destination Workspace",
    destinationFolder: "Destination Folder",
  },
} as const;

test("accepts minimal initial workflow data", () => {
  const result = MigrationWorkflowDataSchema.safeParse({
    schemaVersion: 1,
    stage: "CONFIGURED",
    config: {},
    catalog: {},
    selection: {},
  });

  expect(result.success).toBe(true);
});

test("accepts progressive workflow milestones and complete planning data", () => {
  const milestones: readonly MigrationWorkflowData[] = [
    {
      schemaVersion: 1,
      stage: "WORKSPACES_LOADED",
      config,
      catalog: { workspaces },
      selection: {},
    },
    {
      schemaVersion: 1,
      stage: "SOURCE_CATALOG_LOADED",
      config,
      catalog: { workspaces, sourceProjects, sourceFolders },
      selection: { sourceWorkspaceID: selection.sourceWorkspaceID },
    },
    {
      schemaVersion: 1,
      stage: "SOURCE_RESOLVED",
      config,
      catalog: { workspaces, sourceProjects, sourceFolders },
      selection: {
        sourceWorkspaceID: selection.sourceWorkspaceID,
        sourceProjectID: selection.sourceProjectID,
        sourceVersionID: selection.sourceVersionID,
      },
    },
    {
      schemaVersion: 1,
      stage: "DESTINATION_CATALOG_LOADED",
      config,
      catalog: {
        workspaces,
        sourceProjects,
        sourceFolders,
        destinationFolders,
      },
      selection: {
        sourceWorkspaceID: selection.sourceWorkspaceID,
        sourceProjectID: selection.sourceProjectID,
        sourceVersionID: selection.sourceVersionID,
        destinationWorkspaceID: selection.destinationWorkspaceID,
      },
    },
    {
      schemaVersion: 1,
      stage: "DESTINATION_RESOLVED",
      config,
      catalog: {
        workspaces,
        sourceProjects,
        sourceFolders,
        destinationFolders,
      },
      selection,
    },
    {
      schemaVersion: 1,
      stage: "PLANNED",
      config,
      catalog: {
        workspaces,
        sourceProjects,
        sourceFolders,
        destinationFolders,
      },
      selection,
      plan,
    },
  ];

  milestones.forEach((milestone) => {
    expect(MigrationWorkflowDataSchema.safeParse(milestone).success).toBe(true);
  });
});

test("rejects secret config and unknown top-level workflow data", () => {
  expect(
    MigrationWorkflowDataSchema.safeParse({
      schemaVersion: 1,
      stage: "CONFIGURED",
      config: { secrets: [{ key: "TOKEN", value: "secret", type: "" }] },
      catalog: {},
      selection: {},
    }).success,
  ).toBe(false);

  expect(
    MigrationWorkflowDataSchema.safeParse({
      schemaVersion: 1,
      stage: "CONFIGURED",
      config: {},
      catalog: {},
      selection: {},
      credentials: { apiKey: "secret" },
    }).success,
  ).toBe(false);
});

test("rejects malformed catalog and selection records", () => {
  expect(
    MigrationWorkflowDataSchema.safeParse({
      schemaVersion: 1,
      stage: "WORKSPACES_LOADED",
      config: {},
      catalog: { workspaces: [{ id: "workspace-only" }] },
      selection: {},
    }).success,
  ).toBe(false);

  expect(
    MigrationWorkflowDataSchema.safeParse({
      schemaVersion: 1,
      stage: "DESTINATION_RESOLVED",
      config: {},
      catalog: {
        workspaces,
        sourceProjects,
        sourceFolders,
        destinationFolders,
      },
      selection: {
        sourceWorkspaceID: "source-workspace",
        sourceProjectID: "source-project",
        sourceVersionID: "source-version",
        destinationWorkspaceID: "destination-workspace",
        destinationFolderID: "",
      },
    }).success,
  ).toBe(false);
});

test("accepts a planned destination-folder creation action without a folder ID", () => {
  const pendingSelection = {
    sourceWorkspaceID: selection.sourceWorkspaceID,
    sourceProjectID: selection.sourceProjectID,
    sourceVersionID: selection.sourceVersionID,
    destinationWorkspaceID: selection.destinationWorkspaceID,
    targetSchemaVersion: selection.targetSchemaVersion,
  };
  const pendingPlan = {
    ...plan,
    selection: pendingSelection,
    destinationFolderCreation: {
      workspaceID: selection.destinationWorkspaceID,
      requestedPath: "Boaz new hero folder",
      action: "CREATE_DESTINATION_FOLDER",
    },
  } as const;
  const result = MigrationWorkflowDataSchema.safeParse({
    schemaVersion: 1,
    stage: "PLANNED",
    config,
    catalog: { workspaces, sourceProjects, sourceFolders, destinationFolders },
    selection: pendingSelection,
    plan: pendingPlan,
  });

  expect(result.success).toBe(true);
});

test("binds confirmed execution handoff to the exact plan and excludes secrets", () => {
  const handoff = {
    schemaVersion: 1,
    confirmed: true,
    planID: plan.planID,
    plan,
  };

  expect(ConfirmedMigrationHandoffSchema.safeParse(handoff).success).toBe(true);
  expect(
    ConfirmedMigrationHandoffSchema.safeParse({
      ...handoff,
      planID: "different-plan",
    }).success,
  ).toBe(false);
  expect(
    ConfirmedMigrationHandoffSchema.safeParse({
      ...handoff,
      secrets: [{ name: "TOKEN", value: "secret" }],
    }).success,
  ).toBe(false);
  expect(
    ConfirmedMigrationHandoffSchema.safeParse({
      ...handoff,
      confirmed: false,
    }).success,
  ).toBe(false);
});

test("accepts only JSON-safe normalized values", () => {
  const valid = {
    schemaVersion: 1,
    stage: "CONFIGURED",
    config: {},
    catalog: {},
    selection: {},
  };

  expect(MigrationWorkflowDataSchema.safeParse(valid).success).toBe(true);
  expect(
    MigrationWorkflowDataSchema.safeParse({
      ...valid,
      catalog: new Map(),
    }).success,
  ).toBe(false);
  expect(
    MigrationWorkflowDataSchema.safeParse({
      ...valid,
      config: { source_path: new Date() },
    }).success,
  ).toBe(false);
});
