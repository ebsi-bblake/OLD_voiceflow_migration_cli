import { expect, test } from "bun:test";
import {
  createMigrationWorkflow,
  transitionMigrationWorkflow,
} from "../xyops/voiceflow/execute-migration-state-machine";

const identity = {
  operationID: "operation",
  planID: "plan",
  selection: {
    sourceWorkspaceID: "source-workspace",
    sourceProjectID: "source-project",
    sourceVersionID: "source-version",
    destinationWorkspaceID: "destination-workspace",
    destinationFolderID: "destination-folder",
  },
} as const;
const auth = { token: "token", creatorID: "creator" } as const;
const artifact = {
  status: 200,
  bytes: new ArrayBuffer(8),
  filename: "project.zip",
  contentType: "application/zip",
} as const;
const plan = {
  planID: "plan",
  selection: identity.selection,
  labels: {
    sourceWorkspace: "Source",
    sourceProject: "Project",
    sourceVersion: "Version",
    destinationWorkspace: "Destination",
    destinationFolder: "Folder",
  },
} as const;
const archive = {
  project: {
    id: "archive",
    label: "Archive",
    workspaceID: "destination-workspace",
    folderID: "destination-folder",
    environments: [],
  },
  name: "Archive_20260918_1200",
} as const;
const imported = {
  importStatus: 201,
  importBytes: 8,
  projectID: "imported",
} as const;

const advance = (
  state: ReturnType<typeof createMigrationWorkflow>,
  event: Parameters<typeof transitionMigrationWorkflow>[1],
) => transitionMigrationWorkflow(state, event).state;

test("rejects incomplete success events at the TypeScript boundary", () => {
  // @ts-expect-error authentication success requires AuthContext
  const missingAuth: Parameters<typeof transitionMigrationWorkflow>[1] = {
    kind: "authentication-succeeded",
  };
  // @ts-expect-error export success requires ExportArtifact
  const missingArtifact: Parameters<typeof transitionMigrationWorkflow>[1] = {
    kind: "export-succeeded",
  };
  // @ts-expect-error plan success requires MigrationPlan
  const missingPlan: Parameters<typeof transitionMigrationWorkflow>[1] = {
    kind: "plan-succeeded",
    planID: "plan",
  };
  // @ts-expect-error import success requires ImportedReceipt
  const missingReceipt: Parameters<typeof transitionMigrationWorkflow>[1] = {
    kind: "import-succeeded",
  };
  expect([missingAuth, missingArtifact, missingPlan, missingReceipt]).toHaveLength(4);
});

const toImport = () => {
  let state = createMigrationWorkflow(identity);
  state = advance(state, { kind: "authentication-succeeded", auth });
  state = advance(state, { kind: "export-succeeded", artifact });
  state = advance(state, { kind: "plan-succeeded", planID: "plan", plan });
  return state;
};

test("requires complete successful payloads and preserves them in context", () => {
  let state = createMigrationWorkflow(identity);
  state = advance(state, { kind: "authentication-succeeded", auth });
  expect(state.context.auth).toEqual(auth);
  state = advance(state, { kind: "export-succeeded", artifact });
  expect(state.context.artifact).toEqual(artifact);
  state = advance(state, { kind: "plan-succeeded", planID: "plan", plan });
  expect(state.context.plan).toEqual(plan);
  state = advance(state, { kind: "archive-not-needed" });
  state = advance(state, { kind: "import-succeeded", imported });
  expect(state.context.imported).toEqual(imported);
});

test("uses separate archive collision branches", () => {
  const noCollision = transitionMigrationWorkflow(toImport(), {
    kind: "archive-not-needed",
  });
  expect(noCollision.state.stage).toBe("IMPORT");
  expect(noCollision.effects).toEqual([{ kind: "import" }]);

  const collision = transitionMigrationWorkflow(toImport(), {
    kind: "archive-required",
    archive,
  });
  expect(collision.state.stage).toBe("ARCHIVE");
  expect(collision.state.context.archive).toEqual(archive);
  expect(collision.effects).toEqual([{ kind: "rename" }]);
});

test("separates empty and non-empty secret resolution", () => {
  const importedState = advance(toImport(), { kind: "archive-not-needed" });
  const secretInput = advance(importedState, {
    kind: "import-succeeded",
    imported,
  });
  const secretResolution = advance(secretInput, {
    kind: "secret-input-resolved",
  });

  const empty = transitionMigrationWorkflow(secretResolution, {
    kind: "secret-resolution-empty",
  });
  expect(empty.state.stage).toBe("COMPLETED");
  expect(empty.effects).toEqual([{ kind: "settle-success" }]);

  const nonEmpty = transitionMigrationWorkflow(secretResolution, {
    kind: "secret-resolution-completed",
    secrets: [{ name: "KEY", value: "value" }],
  });
  expect(nonEmpty.state.stage).toBe("SECRET_CREATION");
  expect(nonEmpty.state.context.secrets).toEqual([{ name: "KEY", value: "value" }]);
});

test("requires remaining count and preserves terminal behavior", () => {
  const state = advance(
    advance(
      advance(
        advance(toImport(), { kind: "archive-not-needed" }),
        { kind: "import-succeeded", imported },
      ),
      { kind: "secret-input-resolved" },
    ),
    { kind: "secret-resolution-completed", secrets: [] },
  );
  expect(state.stage).toBe("SECRET_CREATION");
  expect(advance(state, { kind: "secret-completed", remaining: 1 }).stage).toBe(
    "SECRET_CREATION",
  );
  const completed = advance(state, { kind: "secret-completed", remaining: 0 });
  expect(completed.stage).toBe("COMPLETED");
  expect(
    transitionMigrationWorkflow(completed, {
      kind: "import-succeeded",
      imported,
    }),
  ).toMatchObject({ accepted: false, effects: [] });
});

test("preserves unknown import and structured failure outcomes", () => {
  const state = toImport();
  const unknownFailure = {
    code: "IMPORT_OUTCOME_UNKNOWN",
    retryable: true,
    stage: "IMPORT" as const,
    diagnostic: "response-lost",
  };
  const unknown = transitionMigrationWorkflow(state, {
    kind: "archive-not-needed",
  });
  const terminal = transitionMigrationWorkflow(unknown.state, {
    kind: "import-unknown",
    failure: unknownFailure,
  });
  expect(terminal.state).toMatchObject({
    stage: "UNKNOWN_OUTCOME",
    code: "IMPORT_OUTCOME_UNKNOWN",
    diagnostic: "stage=IMPORT response-lost",
  });
  expect(
    transitionMigrationWorkflow(state, {
      kind: "dependency-failure",
      failure: {
        code: "DEPENDENCY_FAILURE",
        retryable: true,
        stage: "IMPORT",
      },
    }).state.stage,
  ).toBe("FAILED");
});
