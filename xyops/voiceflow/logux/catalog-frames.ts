import type { CatalogEvent } from "./catalog-state-machine";
import { debugLog } from "../debug";
import { LoguxActionSchema } from "./schemas/action";
import { CatalogRecordSchema } from "../catalog/schemas/catalog_record";

type NormalizeCatalogFrame = (
  frame: readonly unknown[],
  operationID: string,
  channel: string,
  byteCount: number,
  subscriptionSyncID: number,
) => CatalogEvent | undefined;
const normalizeConnectedFrame = (
  frame: readonly unknown[],
  subscriptionSyncID: number,
): CatalogEvent | undefined =>
  positiveNumber(frame[1]) === undefined
    ? undefined
    : { kind: "connected", subscriptionSyncID };

const normalizeSyncedFrame = (
  frame: readonly unknown[],
): CatalogEvent | undefined => {
  const syncID = positiveNumber(frame[1]);
  return syncID === undefined
    ? undefined
    : { kind: "subscription-synced", syncID };
};

/* oxlint-disable complexity -- frame validation reports each boundary outcome. */
const normalizeActionFrame = (
  frame: readonly unknown[],
  operationID: string,
  channel: string,
  byteCount: number,
): CatalogEvent | undefined => {
  const action = LoguxActionSchema.safeParse(frame[2]);
  if (!action.success || action.data.type === undefined) return undefined;
  const payload = action.data.payload;
  const rowsValue =
    payload === undefined ? undefined : (payload.values ?? payload.data);
  const rawRows = Array.isArray(rowsValue) ? rowsValue : [];
  const rowResults = rawRows.map((row) => CatalogRecordSchema.safeParse(row));
  const rows = CatalogRecordSchema.array().safeParse(rowsValue);
  debugLog("catalog", "schema", {
    actionType: action.data.type,
    channel,
    rawRowCount: rawRows.length,
    schemaValidRowCount: rowResults.filter((result) => result.success).length,
    schemaInvalidRowCount: rowResults.filter((result) => !result.success).length,
    schemaInvalidRows: rowResults.flatMap((result, index) =>
      result.success
        ? []
        : [{
            index,
            issues: result.error.issues.map(({ code, path }) => ({
              code,
              path: path.map(String),
            })),
          }],
    ),
    frameAccepted: rows.success,
  });
  if (!rows.success) return undefined;
  const workspaceID = rows.data
    .map((row) => row.workspaceID)
    .find((value): value is string => typeof value === "string");
  return {
    kind: "catalog-action",
    operationID,
    channel,
    ...(workspaceID === undefined ? {} : { workspaceID }),
    type: action.data.type,
    rows: rows.data,
    byteCount,
  };
};

export const normalizeCatalogFrame: NormalizeCatalogFrame = (
  frame,
  operationID,
  channel,
  byteCount,
  subscriptionSyncID,
) => {
  if (frame[0] === "connected")
    return normalizeConnectedFrame(frame, subscriptionSyncID);
  if (frame[0] === "synced") return normalizeSyncedFrame(frame);
  if (frame[0] === "error") return errorEvent(frame);
  if (frame[0] !== "sync") return undefined;
  return normalizeActionFrame(frame, operationID, channel, byteCount);
};
const positiveNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
const errorEvent = (frame: readonly unknown[]): CatalogEvent => {
  const code =
    frame[1] === "wrong-credentials"
      ? "AUTHENTICATION_FAILED"
      : "DEPENDENCY_FAILURE";
  return {
    kind: "error-frame",
    code,
    diagnostic:
      code === "AUTHENTICATION_FAILED"
        ? "logux-authentication-failed"
        : "logux-dependency-failure",
  };
};
