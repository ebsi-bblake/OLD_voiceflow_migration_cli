import { describe, expect, test } from "bun:test";
import { findArchiveCandidate } from "../xyops/voiceflow/archive";
import {
  patchCompleted,
  syncedForRequest,
} from "../xyops/voiceflow/logux/rename-project";
import type { ProjectRecord } from "../xyops/voiceflow/types";

const project = (
  id: string,
  label: string,
  workspaceID: string,
  folderID?: string,
): ProjectRecord => ({ id, label, workspaceID, folderID, environments: [] });

describe("project archive preflight", () => {
  test("archives only an exact collision in the destination folder", () => {
    const result = findArchiveCandidate(
      [
        project("outside-folder", "Customer Assistant", "destination", "2"),
        project("outside-workspace", "Customer Assistant", "other", "1"),
        project("collision", "Customer Assistant", "destination", "1"),
      ],
      "destination",
      "1",
      "Customer Assistant",
      { now: () => new Date(2026, 1, 3, 14, 5) },
    );

    expect(result).toMatchObject({
      project: { id: "collision" },
      name: "Customer Assistant_20260203_1405",
    });
  });

  test("does not archive when there is no collision", () => {
    expect(
      findArchiveCandidate(
        [project("other", "Another Project", "destination", "1")],
        "destination",
        "1",
        "Customer Assistant",
        { now: () => new Date(2026, 1, 3, 14, 5) },
      ),
    ).toBeUndefined();
  });

  test("recognizes only the matching Logux sync acknowledgement", () => {
    expect(syncedForRequest(["synced", 42], 42)).toBe(true);
    expect(syncedForRequest(["synced", 41], 42)).toBe(false);
    expect(syncedForRequest(["sync", 42], 42)).toBe(false);
  });

  test("recognizes the Logux rename completion envelope", () => {
    expect(
      patchCompleted(
        [
          "sync",
          35,
          {
            type: "project.CRUD:PATCH",
            payload: {
              workspaceID: "24W6RebVXA",
              key: "6aa33b3fda9d809ac4182ae3",
              value: { name: "BoazMasterOfTheUniversePoC" },
            },
            meta: {
              origin: "30:Whi1SwmX:HAbi8j04",
              actionID: "cmtwen696000k3d7f5rlpzjc1",
            },
          },
        ],
        "24W6RebVXA",
        "6aa33b3fda9d809ac4182ae3",
        "BoazMasterOfTheUniversePoC",
      ),
    ).toBe(true);
  });

  test("adds a suffix when the timestamped archive name exists", () => {
    const result = findArchiveCandidate(
      [
        project("collision", "Customer Assistant", "destination", "1"),
        project(
          "archive",
          "Customer Assistant_20260203_1405",
          "destination",
          "1",
        ),
      ],
      "destination",
      "1",
      "Customer Assistant",
      { now: () => new Date(2026, 1, 3, 14, 5) },
    );

    expect(result?.name).toBe("Customer Assistant_20260203_1405_1");
  });
});
