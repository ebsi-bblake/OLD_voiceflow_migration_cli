import { expect, test } from "bun:test";
import {
  createRenameDurabilityState,
  transitionRenameDurability,
} from "../xyops/voiceflow/catalog/rename-durability-state-machine";
import { confirmProjectRename } from "../xyops/voiceflow/catalog/rename-barrier";

test("confirms rename durability only for the exact project identity", async () => {
  const reads: string[] = [];
  await confirmProjectRename(
    { creatorID: "creator", token: "token" },
    { projectID: "project", workspaceID: "workspace", folderID: "7", name: "Renamed" },
    {
      now: () => 1_000,
      sleep: async () => undefined,
      load: async (_auth, workspaceID) => {
        reads.push(workspaceID);
        return [{ id: "project", workspaceID: "workspace", folderID: "7", label: "Renamed", environments: [] }];
      },
    },
  );
  expect(reads).toEqual(["workspace"]);
});

test("retries mismatched catalog state and preserves the five-attempt bound", async () => {
  let reads = 0;
  await expect(
    confirmProjectRename(
      { creatorID: "creator", token: "token" },
      { projectID: "project", workspaceID: "workspace", folderID: "7", name: "Renamed" },
      {
        now: () => 1_000,
        sleep: async () => undefined,
        load: async () => {
          reads += 1;
          return [];
        },
      },
    ),
  ).rejects.toMatchObject({ code: "DEPENDENCY_TIMEOUT" });
  expect(reads).toBe(5);
});

test("ignores responses from superseded durability attempts", () => {
  const context = { projectID: "p", workspaceID: "w", folderID: "7", name: "Renamed" } as const;
  let state = createRenameDurabilityState(context);
  state = transitionRenameDurability(state, {
    kind: "start-attempt",
    attempt: 1,
    attemptID: "attempt-1",
    limit: 5,
    deadline: 20_000,
  }).state;
  state = {
    kind: "WAITING_TO_RETRY",
    context,
    attempt: 1,
    attemptID: "attempt-1",
    nextRetryDeadline: 1_250,
    limit: 5,
    deadline: 20_000,
  };
  state = transitionRenameDurability(state, {
    kind: "retry-timer",
    attemptID: "attempt-1",
    nextAttemptID: "attempt-2",
    deadline: 1_250,
  }).state;
  expect(
    transitionRenameDurability(state, {
      kind: "catalog-result",
      attemptID: "attempt-1",
      matches: true,
      project: { id: "p", workspaceID: "w", folderID: "7", name: "Renamed" },
    }).accepted,
  ).toBe(false);
});
