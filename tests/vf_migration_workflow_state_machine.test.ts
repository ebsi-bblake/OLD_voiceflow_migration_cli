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

const advance = (state: ReturnType<typeof createMigrationWorkflow>, event: Parameters<typeof transitionMigrationWorkflow>[1]) =>
  transitionMigrationWorkflow(state, event).state;

test("enforces the migration stage order and blocks stale events", () => {
  let state = createMigrationWorkflow(identity);
  expect(state.stage).toBe("AUTHENTICATION");
  state = advance(state, { kind: "authentication-succeeded" });
  state = advance(state, { kind: "export-succeeded" });
  state = advance(state, { kind: "plan-succeeded", planID: "plan" });
  expect(state.stage).toBe("ARCHIVE_PREFLIGHT");
  expect(transitionMigrationWorkflow(state, { kind: "import-succeeded", importedProjectID: "imported" }).accepted).toBe(false);
  state = advance(state, { kind: "archive-preflight-result", collision: true });
  state = advance(state, { kind: "archive-renamed" });
  expect(state.stage).toBe("ARCHIVE");
  state = advance(state, { kind: "archive-durability-confirmed" });
  expect(state.stage).toBe("IMPORT");
});

test("settles unknown outcomes and ignores late events", () => {
  let state = createMigrationWorkflow(identity);
  state = advance(state, { kind: "authentication-succeeded" });
  state = advance(state, { kind: "export-succeeded" });
  state = advance(state, { kind: "plan-succeeded", planID: "plan" });
  state = advance(state, { kind: "archive-preflight-result", collision: false });
  state = advance(state, { kind: "import-unknown" });
  expect(state).toMatchObject({ stage: "UNKNOWN_OUTCOME", code: "IMPORT_OUTCOME_UNKNOWN" });
  expect(transitionMigrationWorkflow(state, { kind: "import-succeeded", importedProjectID: "late" })).toMatchObject({
    accepted: false,
    state,
    effects: [],
  });
});

test("completes an empty secret workflow without creating a secret", () => {
  let state = createMigrationWorkflow(identity);
  for (const event of [
    { kind: "authentication-succeeded" as const },
    { kind: "export-succeeded" as const },
    { kind: "plan-succeeded" as const, planID: "plan" },
    { kind: "archive-preflight-result" as const, collision: false },
    { kind: "import-succeeded" as const, importedProjectID: "imported" },
    { kind: "secret-input-resolved" as const },
    { kind: "secret-resolution-completed" as const, empty: true },
  ]) state = advance(state, event);
  expect(state.stage).toBe("COMPLETED");
});
