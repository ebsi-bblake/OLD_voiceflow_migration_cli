import { describe, expect, test } from "bun:test";
import {
  bypassRename,
  createRenameState,
  transitionRenameState,
} from "../xyops/voiceflow/logux/rename-state-machine";
import {
  createSecretState,
  transitionSecretState,
} from "../xyops/voiceflow/logux/secret-state-machine";
import {
  createCatalogState,
  transitionCatalogState,
} from "../xyops/voiceflow/logux/catalog-state-machine";
import {
  isSecretCompletion,
  isSecretFailure,
  isSubscriptionComplete,
  parseLoguxFrame,
  summarizeSecretFailureFrame,
} from "../xyops/voiceflow/logux/frame-contract";
import {
  createFolderState,
  transitionFolderState,
} from "../xyops/voiceflow/logux/folder-state-machine";
import { normalizeCatalogFrame } from "../xyops/voiceflow/logux/catalog-frames";

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
    state = transitionFolderState(state, { kind: "connection-established" }).state;
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

    const serverCompletionWithoutOrigin = transitionFolderState(
      state,
      {
        kind: "folder-completed",
        actionID: "action",
        channel: "workspace/42",
        workspaceID: "42",
        folderID: "7",
        folderName: "Imports",
      },
    );
    expect(serverCompletionWithoutOrigin.state.kind).toBe("COMPLETED");
  });

  test("classifies folder close and transport-timeout outcomes by lifecycle state", () => {
    const context = {
      workspaceID: "42",
      channel: "workspace/42",
      folderName: "Imports",
      origin: "origin",
      actionID: "action",
    } as const;
    let state = createFolderState(context);
    expect(transitionFolderState(state, { kind: "connection-interrupted" }).state.kind).toBe("FAILED");
    state = transitionFolderState(state, { kind: "connection-established" }).state;
    state = transitionFolderState(state, { kind: "connected", subscriptionSyncID: 10 }).state;
    state = transitionFolderState(state, { kind: "subscription-synced", syncID: 10, mutationSyncID: 11 }).state;
    state = transitionFolderState(state, { kind: "mutation-sent", mutationSyncID: 11 }).state;
    expect(transitionFolderState(state, { kind: "connection-interrupted" }).state.kind).toBe("UNKNOWN_OUTCOME");
    expect(transitionFolderState(state, { kind: "transport-timeout" }).state.kind).toBe("UNKNOWN_OUTCOME");
  });

  test("collects a scoped catalog snapshot through the matching subscription", () => {
    let state = createCatalogState("operation", "workspace/workspace-id", ["project"]);
    state = transitionCatalogState(state, { kind: "connection-established" }).state;
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
    state = transitionCatalogState(state, { kind: "connection-established" }).state;
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
    state = transitionCatalogState(state, { kind: "connection-established" }).state;
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
    state = transitionRenameState(state, { kind: "connection-established" }).state;
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
      { kind: "connection-established" as const },
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
      { kind: "connection-interrupted" },
    );
    expect(connected.state.kind).toBe("FAILED");

    let sent = createRenameState(renameContext);
    for (const event of [
      { kind: "connection-established" as const },
      { kind: "connected" as const, subscriptionSyncID: 10 },
      { kind: "subscription-synced" as const, syncID: 10 },
      { kind: "mutation-sent" as const, mutationSyncID: 11, actionID: "action-id" },
    ]) sent = transitionRenameState(sent, event).state;
    expect(transitionRenameState(sent, { kind: "connection-interrupted" }).state.kind).toBe(
      "UNKNOWN_OUTCOME",
    );
  });

  test("bypasses rename when no exact collision exists", () => {
    expect(bypassRename(renameContext).kind).toBe("BYPASSED_NO_COLLISION");
  });

  test("exports the wire-frame contract for BDD adapters", () => {
    expect(parseLoguxFrame("not-json")).toBeUndefined();
    expect(parseLoguxFrame("{}")).toBeUndefined();
    expect(parseLoguxFrame(JSON.stringify(["unknown", 1]))).toBeUndefined();
    expect(parseLoguxFrame(JSON.stringify(["sync", 1.5, { type: "action" }]))).toBeUndefined();
    expect(parseLoguxFrame(JSON.stringify(["error", "x".repeat(81)]))).toBeUndefined();
    expect(isSubscriptionComplete(["synced", 101], 101)).toBe(true);
    expect(isSubscriptionComplete(["synced", 102], 101)).toBe(false);
    expect(
      isSecretFailure([
        "sync",
        0,
        { type: "secret.CREATE_ONE_FAILED", meta: { actionID: "action-1" } },
      ], "action-1"),
    ).toBe(true);
    expect(
      isSecretCompletion([
        "sync",
        0,
        {
          type: "secret.CREATE_ONE_DONE",
          payload: { result: { context: { assistantID: "assistant-id" } } },
          meta: { actionID: "action-1" },
        },
      ], "action-1", "assistant-id"),
    ).toBe(true);
  });

  test("does not normalize heartbeat or non-sync frames as catalog actions", () => {
    expect(normalizeCatalogFrame(["ping", 95], "operation", "channel", 10, 1)).toBeUndefined();
    expect(normalizeCatalogFrame([
      "connected",
      4,
      "connection",
      [],
      {},
    ], "operation", "channel", 10, 1)).toEqual({
      kind: "connected",
      subscriptionSyncID: 1,
    });
    expect(normalizeCatalogFrame([
      "pong",
      0,
      { type: "project.CRUD:REPLACE", payload: { values: [{ id: "leak" }] } },
    ], "operation", "channel", 10, 1)).toBeUndefined();
  });

  test("summarizes secret failures without exposing sensitive detail", () => {
    const summary = summarizeSecretFailureFrame([
      "sync",
      20,
      {
        type: "secret.CREATE_ONE_FAILED",
        payload: {
          error: {
            code: "secret.invalid-value",
            message:
              "Bearer eyJheader.payload.signature VF.DM.fake-value https://example.test/private",
          },
        },
      },
    ]);

    expect(summary).toEqual({
      failureCause: {
        kind: "dependency-failure",
        code: "dependency-failed",
      },
    });
    expect(JSON.stringify(summary)).not.toContain("eyJheader.payload.signature");
    expect(JSON.stringify(summary)).not.toContain("fake-value");
    expect(JSON.stringify(summary)).not.toContain("secret.invalid-value");
    expect(JSON.stringify(summary)).not.toContain("private");

    const payloadWithSensitiveFields = summarizeSecretFailureFrame([
      "sync",
      20,
      {
        type: "secret.CREATE_ONE_FAILED",
        payload: {
          error: {
            code: "Bearer eyJheader.payload.signature",
            message: "secret details",
          },
        },
      },
    ]);
    expect(payloadWithSensitiveFields).toEqual(summary);
  });

  test("requires the matching secret action ID", () => {
    let state = createSecretState("assistant-id", "action-id");
    for (const event of [
      { kind: "connection-established" as const },
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

  test("preserves secret completion action and assistant correlation", () => {
    const completion = [
      "sync",
      20,
      {
        type: "secret.CREATE_ONE_DONE",
        payload: { result: { context: { assistantID: "assistant-id" } } },
        meta: { actionID: "action-id" },
      },
    ] as const;
    expect(isSecretCompletion(completion, "other", "assistant-id")).toBe(false);
    expect(isSecretCompletion(completion, "action-id", "other")).toBe(false);
    expect(isSecretCompletion(completion, "action-id", "assistant-id")).toBe(true);
  });

  test("keeps secret mutation failures unknown after dispatch", () => {
    let state = createSecretState("assistant-id", "action-id");
    for (const event of [
      { kind: "connection-established" as const },
      { kind: "connected" as const },
      { kind: "subscription-synced" as const },
      { kind: "mutation-sent" as const, mutationSyncID: 20 },
    ]) state = transitionSecretState(state, event);
    expect(transitionSecretState(state, { kind: "transport-timeout" }).kind).toBe(
      "UNKNOWN_OUTCOME",
    );
    expect(transitionSecretState(state, { kind: "connection-interrupted" }).kind).toBe(
      "UNKNOWN_OUTCOME",
    );
  });
});
