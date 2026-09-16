import { describe, expect, test } from "bun:test";
import {
  bypassRename,
  createRenameState,
  createSecretState,
  transitionRenameState,
  transitionSecretState,
} from "../xyops/voiceflow/logux/state-machine";
import {
  createCatalogState,
  transitionCatalogState,
} from "../xyops/voiceflow/logux/catalog-state-machine";
import {
  createFolderState,
  transitionFolderState,
} from "../xyops/voiceflow/logux/folder-state-machine";

const renameContext = {
  workspaceID: "workspace-id",
  projectID: "project-id",
  folderID: "folder-id",
  requestedName: "Project_20260203_1405",
  origin: "origin",
} as const;

describe("Logux state machines", () => {
  test("creates a folder only after subscription and matching completion correlation", () => {
    let state = createFolderState({
      workspaceID: "42",
      channel: "workspace/42",
      folderName: "Imports",
      origin: "origin",
      actionID: "action",
    });
    state = transitionFolderState(state, { kind: "socket-open" }).state;
    state = transitionFolderState(state, { kind: "connected", subscriptionSyncID: 10 }).state;
    expect(state.kind).toBe("SUBSCRIBING");
    state = transitionFolderState(state, {
      kind: "subscription-synced",
      syncID: 10,
      mutationSyncID: 11,
    }).state;
    expect(state.kind).toBe("SUBSCRIBED");
    const sent = transitionFolderState(state, { kind: "mutation-sent", mutationSyncID: 11 });
    expect(sent.state.kind).toBe("MUTATION_SENT");
    state = sent.state;
    expect(
      transitionFolderState(state, { kind: "mutation-synced", syncID: 11 }).state.kind,
    ).toBe("MUTATION_SENT");
    const completed = transitionFolderState(state, {
      kind: "folder-completed",
      actionID: "action",
      origin: "origin",
      channel: "workspace/42",
      workspaceID: "42",
      folderID: "7",
      folderName: "Imports",
    });
    expect(completed.state.kind).toBe("COMPLETED");
    expect(completed.effects).toEqual([{ kind: "close-socket" }, { kind: "settle" }]);
  });

  test("classifies folder close and timeout outcomes by lifecycle state", () => {
    const context = {
      workspaceID: "42",
      channel: "workspace/42",
      folderName: "Imports",
      origin: "origin",
      actionID: "action",
    } as const;
    let state = createFolderState(context);
    expect(transitionFolderState(state, { kind: "socket-close" }).state.kind).toBe("FAILED");
    state = transitionFolderState(state, { kind: "socket-open" }).state;
    state = transitionFolderState(state, { kind: "connected", subscriptionSyncID: 10 }).state;
    state = transitionFolderState(state, { kind: "subscription-synced", syncID: 10, mutationSyncID: 11 }).state;
    state = transitionFolderState(state, { kind: "mutation-sent", mutationSyncID: 11 }).state;
    expect(transitionFolderState(state, { kind: "socket-close" }).state.kind).toBe("UNKNOWN_OUTCOME");
    expect(transitionFolderState(state, { kind: "timeout" }).state.kind).toBe("UNKNOWN_OUTCOME");
  });

  test("collects a scoped catalog snapshot through the matching subscription", () => {
    let state = createCatalogState("operation", "workspace/workspace-id", ["project"]);
    state = transitionCatalogState(state, { kind: "socket-open" }).state;
    const subscribing = transitionCatalogState(state, {
      kind: "connected",
      subscriptionSyncID: 10,
    });
    expect(subscribing.effects).toEqual([{ kind: "send-subscription", syncID: 10 }]);
    state = subscribing.state;
    expect(
      transitionCatalogState(state, { kind: "subscription-synced", syncID: 11 }).state.kind,
    ).toBe("SUBSCRIBING");
    state = transitionCatalogState(state, { kind: "subscription-synced", syncID: 10 }).state;
    const completed = transitionCatalogState(state, {
      kind: "catalog-action",
      operationID: "operation",
      channel: "workspace/workspace-id",
      workspaceID: "workspace-id",
      type: "project",
      rows: [{ id: "project-id" }],
      byteCount: 100,
    });
    expect(completed.state.kind).toBe("COMPLETED");
    if (completed.state.kind === "COMPLETED")
      expect(completed.state.rows).toEqual([{ id: "project-id" }]);
  });

  test("ignores duplicate and out-of-scope catalog actions", () => {
    let state = createCatalogState("operation", "workspace/workspace-id", ["project", "assistant"]);
    state = transitionCatalogState(state, { kind: "socket-open" }).state;
    state = transitionCatalogState(state, { kind: "connected", subscriptionSyncID: 10 }).state;
    state = transitionCatalogState(state, { kind: "subscription-synced", syncID: 10 }).state;
    const first = {
      kind: "catalog-action" as const,
      operationID: "operation",
      channel: "workspace/workspace-id",
      type: "project",
      rows: [{ id: "project-id" }],
      byteCount: 1,
    };
    state = transitionCatalogState(state, first).state;
    const duplicate = transitionCatalogState(state, { ...first, byteCount: 2 }).state;
    expect(duplicate.kind).toBe("COLLECTING");
    if (duplicate.kind === "COLLECTING") expect(duplicate.rows).toHaveLength(1);
    const foreign = transitionCatalogState(state, {
      ...first,
      operationID: "other-operation",
      byteCount: 3,
    });
    expect(foreign.state.kind).toBe("COLLECTING");
  });

  test("fails catalog collection when the row bound is exceeded", () => {
    let state = createCatalogState("operation", "workspace/workspace-id", ["project"]);
    state = transitionCatalogState(state, { kind: "socket-open" }).state;
    state = transitionCatalogState(state, { kind: "connected", subscriptionSyncID: 10 }).state;
    state = transitionCatalogState(state, { kind: "subscription-synced", syncID: 10 }).state;
    const result = transitionCatalogState(state, {
      kind: "catalog-action",
      operationID: "operation",
      channel: "workspace/workspace-id",
      type: "project",
      rows: Array.from({ length: 100001 }, () => ({ id: "row" })),
      byteCount: 1,
    });
    expect(result.state.kind).toBe("FAILED");
    expect(result.effects).toEqual([{ kind: "close-socket" }, { kind: "settle" }]);
  });

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
