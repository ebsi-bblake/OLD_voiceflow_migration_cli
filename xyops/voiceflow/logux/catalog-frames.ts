/* oxlint-disable complexity -- protocol frame normalization is exhaustive. */
import { isRowArray } from "../guards";
import type { CatalogEvent } from "./catalog-state-machine";
import { LoguxActionSchema } from "./schemas/action";

type NormalizeCatalogFrame = (
  frame: readonly unknown[],
  operationID: string,
  channel: string,
  byteCount: number,
  subscriptionSyncID: number,
) => CatalogEvent | undefined;
export const normalizeCatalogFrame: NormalizeCatalogFrame = (
  frame,
  operationID,
  channel,
  byteCount,
  subscriptionSyncID,
) => {
  if (frame[0] === "connected") {
    const protocolVersion = positiveNumber(frame[1]);
    return protocolVersion === undefined
      ? undefined
      : { kind: "connected", subscriptionSyncID };
  }
  if (frame[0] === "synced") {
    const syncID = positiveNumber(frame[1]);
    return syncID === undefined ? undefined : { kind: "subscription-synced", syncID };
  }
  if (frame[0] === "error") return errorEvent(frame);
  if (frame[0] !== "sync") return undefined;
  const action = LoguxActionSchema.safeParse(frame[2]);
  if (!action.success) return undefined;
  const type = action.data.type;
  const payload = action.data.payload;
  const rows = payload === undefined ? undefined : payload.values ?? payload.data;
  if (type === undefined || !isRowArray(rows)) return undefined;
  const workspaceID = rows
    .map((row) => row.workspaceID)
    .find((value): value is string => typeof value === "string");
  return {
    kind: "catalog-action",
    operationID,
    channel,
    ...(workspaceID === undefined ? {} : { workspaceID }),
    type,
    rows,
    byteCount,
  };
};
const positiveNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
const errorEvent = (frame: readonly unknown[]): CatalogEvent => {
  const code = frame[1] === "wrong-credentials" ? "AUTHENTICATION_FAILED" : "DEPENDENCY_FAILURE";
  return {
    kind: "error-frame",
    code,
    diagnostic: code === "AUTHENTICATION_FAILED" ? "logux-authentication-failed" : "logux-dependency-failure",
  };
};
