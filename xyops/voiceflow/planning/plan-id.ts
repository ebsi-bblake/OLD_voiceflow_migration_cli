import { createHash } from "crypto";
import type { MigrationPlanIdentity } from "../types";

type FormatPlanID = (bytes: Uint8Array) => string;
const formatPlanID: FormatPlanID = (bytes) =>
  [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);

type PlanID = (selection: MigrationPlanIdentity) => Promise<string>;
export const planID: PlanID = async (selection) => {
  const canonicalSelection = {
    sourceWorkspaceID: selection.sourceWorkspaceID,
    sourceProjectID: selection.sourceProjectID,
    sourceVersionID: selection.sourceVersionID,
    destinationWorkspaceID: selection.destinationWorkspaceID,
    ...(selection.destinationFolderID === undefined
      ? {}
      : { destinationFolderID: selection.destinationFolderID }),
    ...(selection.targetSchemaVersion === undefined
      ? {}
      : { targetSchemaVersion: selection.targetSchemaVersion }),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalSelection));
  return Promise.resolve().then(() =>
    formatPlanID(createHash("sha256").update(bytes).digest()),
  );
};
