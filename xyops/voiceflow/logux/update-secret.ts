import type { AuthContext, ExistingSecret, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { debugLog } from "../debug";

type UpdateSecret = (
  auth: AuthContext,
  assistantID: string,
  existing: ExistingSecret,
  secret: SecretEntry,
) => Promise<void>;
/* oxlint-disable complexity -- protocol lifecycle guards are intentionally explicit. */
export const updateSecret: UpdateSecret = (auth, assistantID, existing, secret) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const subscriptionID = positiveID();
    const mutationSyncID = positiveID();
    const actionID = createUUID();
    let settled = false;
    const settle = (error?: OperationFault): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch { /* cleanup must not change the outcome */ }
      if (error === undefined) resolve();
      else reject(error);
    };
    const timer = setTimeout(() => settle(new OperationFault("DEPENDENCY_TIMEOUT", true, "logux-secret-update-timeout")), 15_000);
    ws.onerror = () => settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-error"));
    ws.onclose = () => {
      if (!settled) settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-close"));
    };
    ws.onopen = () => send(ws, [
      "connect", 4, origin, 0, { token: auth.token, subprotocol: "1.9.0" },
    ]);
    ws.onmessage = (event) => {
      const frame = parseFrame(event.data);
      if (frame === undefined) return;
      traceFrame("in", frame);
      if (frame[0] === "error") return settle(new OperationFault("DEPENDENCY_FAILURE", true, "logux-secret-update-error-frame"));
      if (frame[0] === "connected") {
        return send(ws, [
          "sync", subscriptionID,
          { channel: `assistant/${assistantID}`, type: "logux/subscribe", since: { id: "0", time: 0 } },
          { id: 1, time: 1 },
        ]);
      }
      if (frame[0] === "synced" && frame[1] === subscriptionID) {
        return send(ws, [
          "sync", mutationSyncID,
          {
            type: "secret.PATCH_ONE_WITH_VALUE",
            payload: {
              context: { assistantID },
              id: existing.id,
              patch: { name: secret.name, visibility: existing.visibility, defaultValue: secret.value },
            },
            meta: { origin, actionID },
          },
          { id: 2, time: 2 },
        ]);
      }
      if (frame[0] === "synced" && frame[1] === mutationSyncID) return settle();
    };
  });

type Frame = readonly unknown[];
const parseFrame = (value: unknown): Frame | undefined => {
  if (typeof value !== "string") return undefined;
  try { const frame: unknown = JSON.parse(value); return Array.isArray(frame) ? frame : undefined; }
  catch { return undefined; }
};
const positiveID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;
const traceFrame = (direction: "in" | "out", frame: Frame): void => {
  const action = frame[2];
  debugLog("logux-secret-update", "frame", {
    direction,
    frameType: frame[0],
    syncID: frame[1],
    actionType: isRecord(action) && typeof action.type === "string" ? action.type : undefined,
  });
};
const send = (ws: WebSocket, frame: Frame): void => {
  traceFrame("out", frame);
  ws.send(JSON.stringify(frame));
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
