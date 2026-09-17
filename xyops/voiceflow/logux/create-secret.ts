import type { AuthContext, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { debugLog } from "../debug";
import {
  createSecretState,
  transitionSecretState,
  type SecretEvent,
  type SecretState,
} from "./state-machine";
import {
  isSecretCompletion,
  isSecretFailure,
  isSubscriptionComplete,
  parseLoguxFrame,
  summarizeLoguxAction,
  summarizeSecretFailureFrame,
  type LoguxFrame,
  type TraceFields,
} from "./frame-contract";

type CreateSecret = (
  auth: AuthContext,
  assistantID: string,
  secret: SecretEntry,
) => Promise<void>;

const trace = (event: string, fields: TraceFields = {}): void =>
  debugLog("logux-secret", event, fields);

const traceFrame = (direction: "in" | "out", frame: LoguxFrame): void =>
  trace(`${direction} frame`, {
    frameType: frame[0],
    syncID: frame[1],
    ...summarizeLoguxAction(frame),
    ...summarizeSecretFailureFrame(frame),
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
      const frame: LoguxFrame = [
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
      const frame = parseLoguxFrame(event.data);
      if (!frame) return;
      traceFrame("in", frame);
      if (frame[0] === "error") {
        const lifecycle = state.kind.toLowerCase();
        dispatch({ kind: "error-frame" });
        return settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${lifecycle}-error-frame`,
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
      if (isSecretFailure(frame, actionID)) {
        const lifecycle = state.kind.toLowerCase();
        dispatch({ kind: "error-frame" });
        return settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            `logux-${lifecycle}-failed`,
          ),
        );
      }
      if (isSecretCompletion(frame, actionID, assistantID)) {
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
  const frame: LoguxFrame = [
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
const sendCreateAction = (
  ws: WebSocket,
  assistantID: string,
  secret: SecretEntry,
  origin: string,
  actionID: string,
  mutationSyncID: number,
  time: number,
): void => {
  const frame: LoguxFrame = [
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
