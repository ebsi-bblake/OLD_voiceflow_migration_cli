import type { AuthContext, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import {
  createSecretState,
  transitionSecretState,
  type SecretEvent,
  type SecretState,
} from "./state-machine";

type CreateSecret = (
  auth: AuthContext,
  assistantID: string,
  secret: SecretEntry,
) => Promise<void>;

type TraceFields = Readonly<Record<string, unknown>>;
const trace = (event: string, fields: TraceFields = {}): void =>
  console.error(`[logux-secret] ${JSON.stringify({ event, ...fields })}`);

const actionSummary = (frame: Frame): TraceFields => {
  const action = frame[2];
  if (!isRecord(action)) return {};
  const meta = isRecord(action.meta) ? action.meta : {};
  return {
    actionType: typeof action.type === "string" ? action.type : undefined,
    actionID: typeof meta.actionID === "string" ? meta.actionID : undefined,
    processedID: typeof action.id === "string" ? action.id : undefined,
  };
};

const traceFrame = (direction: "in" | "out", frame: Frame): void =>
  trace(`${direction} frame`, {
    frameType: frame[0],
    syncID: frame[1],
    ...actionSummary(frame),
  });

export const createSecret: CreateSecret = (auth, assistantID, secret) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const clientID = createUUID()
      .replace(VoiceflowRegex.base64UrlDash, "")
      .slice(0, 8);
    const origin = `${auth.creatorID}:${clientID}:${createUUID().replace(VoiceflowRegex.base64UrlDash, "").slice(0, 8)}`;
    const actionID = createUUID();
    const subscriptionID = Math.floor(Math.random() * 1_000_000_000) + 1;
    const mutationSyncID = subscriptionID + 1;
    let actionTime = 1;
    let state: SecretState = createSecretState(assistantID, actionID);
    let settled = false;
    const dispatch = (event: SecretEvent): void => {
      state = transitionSecretState(state, event);
    };
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
      () => {
        dispatch({ kind: "timeout" });
        settle(
          new OperationFault(
            "DEPENDENCY_TIMEOUT",
            true,
            `logux-${state.kind.toLowerCase()}-timeout`,
          ),
        );
      },
      15_000,
    );
    ws.onerror = () => {
      dispatch({ kind: "socket-error" });
      settle(
        new OperationFault(
          "DEPENDENCY_FAILURE",
          true,
          `logux-${state.kind.toLowerCase()}-error`,
        ),
      );
    };
    ws.onclose = () => {
      if (!settled) {
        dispatch({ kind: "socket-close" });
        settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${state.kind.toLowerCase()}-close`,
          ),
        );
      }
    };
    ws.onopen = () => {
      dispatch({ kind: "socket-open" });
      const frame: Frame = [
        "connect",
        4,
        origin,
        0,
        { token: "[redacted]", subprotocol: "1.9.0" },
      ];
      traceFrame("out", frame);
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
      traceFrame("in", frame);
      if (frame[0] === "error") {
        dispatch({ kind: "error-frame" });
        return settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${state.kind.toLowerCase()}-error-frame`,
          ),
        );
      }
      if (frame[0] === "connected") {
        dispatch({ kind: "connected" });
        try {
          sendSubscription(ws, assistantID, subscriptionID, actionTime++);
        } catch {
          dispatch({ kind: "socket-error" });
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (isSubscriptionComplete(frame, subscriptionID)) {
        dispatch({ kind: "subscription-synced" });
        try {
          sendCreateAction(
            ws,
            assistantID,
            secret,
            origin,
            actionID,
            mutationSyncID,
            actionTime++,
          );
          dispatch({ kind: "mutation-sent", mutationSyncID });
        } catch {
          dispatch({ kind: "socket-error" });
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (isDoneFrame(frame, actionID, assistantID)) {
        dispatch({ kind: "secret-done", actionID });
        settle();
      }
    };
  });

const sendSubscription = (
  ws: WebSocket,
  assistantID: string,
  subscriptionID: number,
  time: number,
): void => {
  const frame: Frame = [
    "sync",
    subscriptionID,
    {
      channel: `assistant/${assistantID}`,
      type: "logux/subscribe",
      since: { id: "0", time: 0 },
    },
    { id: randomActionNumber(), time },
  ];
  traceFrame("out", frame);
  ws.send(JSON.stringify(frame));
};
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
  mutationSyncID: number,
  time: number,
): void => {
  const frame: Frame = [
    "sync",
    mutationSyncID,
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
  ];
  traceFrame("out", frame);
  ws.send(JSON.stringify(frame));
};
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
const isDoneFrame = (
  frame: Frame,
  actionID: string,
  assistantID: string,
): boolean => {
  const action = frame[2];
  if (!isRecord(action) || action.type !== "secret.CREATE_ONE_DONE")
    return false;
  const meta = action.meta;
  if (!isRecord(meta) || meta.actionID !== actionID) return false;
  const payload = isRecord(action.payload) ? action.payload : undefined;
  const context = payload && isRecord(payload.context) ? payload.context : undefined;
  return context?.assistantID === undefined || context.assistantID === assistantID;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
