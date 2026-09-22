import { describe, expect, test } from "bun:test";

import { receipt } from "../xyops/voiceflow/import/input";

describe("Voiceflow import receipts", () => {
  test("accepts the project-shaped success response", () => {
    expect(
      receipt(
        {
          project: {
            _id: "6ab2b76e688d5de669763fd8",
            name: "BoazMasterOfTheUniversePoC",
            _version: 1.2,
          },
        },
        201,
        54_548,
      ),
    ).toMatchObject({
      importStatus: 201,
      importBytes: 54_548,
      projectID: "6ab2b76e688d5de669763fd8",
    });
  });
});
