import { describe, expect, test } from "bun:test";
import {
  bypassRename,
  createRenameState,
  createSecretState,
  transitionRenameState,
  transitionSecretState,
} from "../xyops/voiceflow/logux/state-machine";

const renameContext = {
  workspaceID: "workspace-id",
  projectID: "project-id",
  folderID: "folder-id",
  requestedName: "Project_20260203_1405",
  origin: "origin",
} as const;

describe("Logux state machines", () => {
  test("advances rename only through matching subscription and mutation sync IDs", () => {
    let state = createRenameState(renameContext);
    state = transitionRenameState(state, { kind: "socket-open" }).state;
    state = transitionRenameState(state, {
      kind: "connected",
      subscriptionSyncID: 10,
    }).state;
    state = transitionRenameState(state, {
      kind: "subscription-synced",
      syncID: 10,
    }).state;
    state = transitionRenameState(state, {
      kind: "mutation-sent",
      mutationSyncID: 11,
      actionID: "action-id",
    }).state;

    expect(
      transitionRenameState(state, {
        kind: "mutation-synced",
        syncID: 10,
      }).state.kind,
    ).toBe("MUTATION_SENT");
    expect(
      transitionRenameState(state, {
        kind: "mutation-synced",
        syncID: 11,
      }).state.kind,
    ).toBe("MUTATION_ACKNOWLEDGED");
  });

  test("requires catalog durability after mutation acknowledgement", () => {
    let state = createRenameState(renameContext);
    for (const event of [
      { kind: "socket-open" as const },
      { kind: "connected" as const, subscriptionSyncID: 10 },
      { kind: "subscription-synced" as const, syncID: 10 },
      { kind: "mutation-sent" as const, mutationSyncID: 11, actionID: "action-id" },
      { kind: "mutation-synced" as const, syncID: 11 },
    ]) state = transitionRenameState(state, event).state;

    const pending = transitionRenameState(state, {
      kind: "catalog-result",
      matches: false,
      retryCount: 1,
      retryLimit: 5,
      deadline: 123,
    });
    expect(pending.state.kind).toBe("CATALOG_RECONCILING");

    const completed = transitionRenameState(pending.state, {
      kind: "catalog-result",
      matches: true,
      retryCount: 2,
      retryLimit: 5,
      deadline: 123,
    });
    expect(completed.state.kind).toBe("COMPLETED");
  });

  test("classifies close before and after mutation dispatch differently", () => {
    const connected = transitionRenameState(
      createRenameState(renameContext),
      { kind: "socket-close" },
    );
    expect(connected.state.kind).toBe("FAILED");

    let sent = createRenameState(renameContext);
    for (const event of [
      { kind: "socket-open" as const },
      { kind: "connected" as const, subscriptionSyncID: 10 },
      { kind: "subscription-synced" as const, syncID: 10 },
      { kind: "mutation-sent" as const, mutationSyncID: 11, actionID: "action-id" },
    ]) sent = transitionRenameState(sent, event).state;
    expect(transitionRenameState(sent, { kind: "socket-close" }).state.kind).toBe(
      "UNKNOWN_OUTCOME",
    );
  });

  test("bypasses rename when no exact collision exists", () => {
    expect(bypassRename(renameContext).kind).toBe("BYPASSED_NO_COLLISION");
  });

  test("requires the matching secret action ID", () => {
    let state = createSecretState("assistant-id", "action-id");
    for (const event of [
      { kind: "socket-open" as const },
      { kind: "connected" as const },
      { kind: "subscription-synced" as const },
      { kind: "mutation-sent" as const, mutationSyncID: 20 },
    ]) state = transitionSecretState(state, event);

    expect(
      transitionSecretState(state, { kind: "secret-done", actionID: "other" }).kind,
    ).toBe("MUTATION_SENT");
    expect(
      transitionSecretState(state, { kind: "secret-done", actionID: "action-id" }).kind,
    ).toBe("COMPLETED");
  });
});
