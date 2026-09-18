import type { AuthContext, ExistingSecret, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { debugLog } from "../debug";
import { parseLoguxFrame } from "./frame-contract";
import { isRecord } from "../guards";
import { startLoguxConnection, type LoguxConnection, type LoguxFrame } from "./connection";

type UpdateSecret = (auth: AuthContext, assistantID: string, existing: ExistingSecret, secret: SecretEntry) => Promise<void>;
const positiveID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;
const traceFrame = (direction: "in" | "out", frame: LoguxFrame): void => {
  const action = frame[2];
  debugLog("logux-secret-update", "frame", { direction, frameType: frame[0], syncID: frame[1], actionType: isRecord(action) && typeof action.type === "string" ? action.type : undefined });
};
/* oxlint-disable complexity -- protocol lifecycle branches are explicit. */
export const updateSecret: UpdateSecret = (auth, assistantID, existing, secret) => new Promise((resolve, reject) => {
  const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
  const subscriptionID = positiveID();
  const mutationSyncID = positiveID();
  const actionID = createUUID();
  let connection: LoguxConnection | undefined;
  const settle = (error?: OperationFault): void => {
    connection?.cleanup();
    if (error === undefined) resolve(); else reject(error);
  };
  const send = (frame: LoguxFrame): void => { traceFrame("out", frame); connection?.send(frame); };
  connection = startLoguxConnection({
    token: auth.token,
    origin,
    subscription: { frame: ["sync", subscriptionID, { channel: `assistant/${assistantID}`, type: "logux/subscribe", since: { id: "0", time: 0 } }, { id: 1, time: 1 }] },
    onEvent: (event) => {
      if (event.kind === "open") return;
      if (event.kind === "timeout") return settle(new OperationFault("DEPENDENCY_TIMEOUT", true, "logux-secret-update-timeout"));
      if (event.kind === "close") return settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-close"));
      if (event.kind === "error") return settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-error"));
      const frame = parseLoguxFrame(event.data);
      if (!frame) return;
      traceFrame("in", frame);
      if (frame[0] === "error") return settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-error-frame"));
      if (frame[0] === "connected") return;
      if (frame[0] === "synced" && frame[1] === subscriptionID) return send(["sync", mutationSyncID, { type: "secret.PATCH_ONE_WITH_VALUE", payload: { context: { assistantID }, id: existing.id, patch: { name: secret.name, visibility: existing.visibility, defaultValue: secret.value } }, meta: { origin, actionID } }, { id: 2, time: 2 }]);
      if (frame[0] === "synced" && frame[1] === mutationSyncID) return settle();
    },
  });
});
