import type { AuthContext, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";

type CreateSecret = (
  auth: AuthContext,
  assistantID: string,
  secret: SecretEntry,
) => Promise<void>;
export const createSecret: CreateSecret = (auth, assistantID, secret) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const clientID = createUUID()
      .replace(VoiceflowRegex.base64UrlDash, "")
      .slice(0, 8);
    const origin = `${auth.creatorID}:${clientID}:${createUUID().replace(VoiceflowRegex.base64UrlDash, "").slice(0, 8)}`;
    const actionID = createUUID();
    const subscriptionID = Math.floor(Math.random() * 1_000_000_000) + 1;
    let actionTime = 1;
    let lifecycle = "connecting";
    let settled = false;
    const settle = (error?: OperationFault): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* settlement must not be interrupted */
      }
      /* oxlint-disable complexity, no-unused-expressions */
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(
      () =>
        settle(
          new OperationFault(
            "DEPENDENCY_TIMEOUT",
            true,
            `logux-${lifecycle}-timeout`,
          ),
        ),
      15_000,
    );
    ws.onerror = () =>
      settle(
        new OperationFault(
          "DEPENDENCY_FAILURE",
          true,
          `logux-${lifecycle}-error`,
        ),
      );
    ws.onclose = () => {
      if (!settled)
        settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${lifecycle}-close`,
          ),
        );
    };
    ws.onopen = () => {
      lifecycle = "connected";
      ws.send(
        JSON.stringify([
          "connect",
          4,
          origin,
          0,
          { token: auth.token, subprotocol: "1.9.0" },
        ]),
      );
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const frame = parseFrame(event.data);
      if (!frame) return;
      if (frame[0] === "error")
        return settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${lifecycle}-error-frame`,
          ),
        );
      if (frame[0] === "connected") {
        lifecycle = "subscribing";
        return sendSubscription(ws, assistantID, subscriptionID, actionTime++);
      }
      if (isSubscriptionComplete(frame, subscriptionID)) {
        lifecycle = "creating";
        return sendCreateAction(
          ws,
          assistantID,
          secret,
          origin,
          actionID,
          actionTime++,
        );
      }
      if (isDoneFrame(frame, actionID)) {
        lifecycle = "completed";
        settle();
      }
    };
  });

const sendSubscription = (
  ws: WebSocket,
  assistantID: string,
  subscriptionID: number,
  time: number,
): void =>
  ws.send(
    JSON.stringify([
      "sync",
      subscriptionID,
      {
        channel: `assistant/${assistantID}`,
        type: "logux/subscribe",
        since: { id: "0", time: 0 },
      },
      { id: randomActionNumber(), time },
    ]),
  );
const isSubscriptionComplete = (
  frame: Frame,
  subscriptionID: number,
): boolean => frame[0] === "synced" && frame[1] === subscriptionID;

const sendCreateAction = (
  ws: WebSocket,
  assistantID: string,
  secret: SecretEntry,
  origin: string,
  actionID: string,
  time: number,
): void =>
  ws.send(
    JSON.stringify([
      "sync",
      0,
      {
        type: "secret.CREATE_ONE_STARTED",
        payload: {
          context: { assistantID },
          data: {
            name: secret.name,
            visibility: "masked",
            defaultValue: secret.value,
          },
        },
        meta: { origin, actionID },
      },
      { id: randomActionNumber(), time },
    ]),
  );
const randomActionNumber = (): number =>
  Math.floor(Math.random() * 1_000_000_000) + 1;

type Frame = readonly unknown[];
const parseFrame = (text: string): Frame | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
};
const isDoneFrame = (frame: Frame, actionID: string): boolean => {
  const action = frame[2];
  if (!isRecord(action) || action.type !== "secret.CREATE_ONE_DONE")
    return false;
  const meta = action.meta;
  return isRecord(meta) && meta.actionID === actionID;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
