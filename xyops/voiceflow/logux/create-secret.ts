import type { AuthContext, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import { debugLog } from "../debug";
import {
  startLoguxConnection,
  type LoguxConnection,
  type LoguxFrame,
} from "./connection";
import {
  createSecretState,
  transitionSecretStateWithEffects,
  type SecretEffect,
  type SecretEvent,
  type SecretState,
} from "./secret-state-machine";
import {
  isSecretCompletion,
  isSecretFailure,
  summarizeLoguxAction,
  summarizeSecretFailureFrame,
  type TraceFields,
} from "./frame-contract";

type CreateSecretDependencies = Readonly<{
  readonly webSocket?: typeof WebSocket;
}>;
type CreateSecret = (
  auth: AuthContext,
  assistantID: string,
  secret: SecretEntry,
  dependencies?: CreateSecretDependencies,
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
const randomActionNumber = (): number =>
  Math.floor(Math.random() * 1_000_000_000) + 1;

/* oxlint-disable complexity -- protocol lifecycle branches are explicit. */
export const createSecret: CreateSecret = (
  auth,
  assistantID,
  secret,
  dependencies = {},
) =>
  new Promise((resolve, reject) => {
    const clientID = createUUID()
      .replace(VoiceflowRegex.base64UrlDash, "")
      .slice(0, 8);
    const origin = `${auth.creatorID}:${clientID}:${createUUID().replace(VoiceflowRegex.base64UrlDash, "").slice(0, 8)}`;
    const actionID = createUUID();
    const subscriptionID = randomActionNumber();
    const mutationSyncID = subscriptionID + 1;
    let actionTime = 1;
    let state: SecretState = createSecretState(assistantID, actionID);
    let connection: LoguxConnection | undefined;

    const settle = (error?: OperationFault): void => {
      connection?.cleanup();
      if (error !== undefined) return reject(error);
      if (state.kind === "COMPLETED") return resolve();
      const code =
        state.kind === "UNKNOWN_OUTCOME" && state.code === "DEPENDENCY_TIMEOUT"
          ? "DEPENDENCY_TIMEOUT"
          : "DEPENDENCY_FAILURE";
      reject(
        new OperationFault(
          code,
          true,
          `logux-${state.kind.toLowerCase()}-terminal`,
        ),
      );
    };
    const dispatch = (event: SecretEvent): void => {
      const transition = transitionSecretStateWithEffects(state, event);
      state = transition.state;
      executeEffects(transition.effects);
    };
    const send = (frame: LoguxFrame): void => {
      traceFrame("out", frame);
      connection?.send(frame);
    };
    const executeEffects = (effects: readonly SecretEffect[]): void => {
      for (const effect of effects) {
        try {
          if (effect.kind === "send-mutation")
            send([
              "sync",
              effect.mutationSyncID,
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
              { id: randomActionNumber(), time: actionTime++ },
            ]);
          if (effect.kind === "close-socket") connection?.cleanup();
          if (effect.kind === "settle") settle();
        } catch {
          dispatch({ kind: "transport-failure" });
          settle(
            new OperationFault(
              "DEPENDENCY_FAILURE",
              true,
              `logux-${state.kind.toLowerCase()}-error`,
            ),
          );
        }
      }
    };

    connection = startLoguxConnection({
      token: auth.token,
      origin,
      webSocket: dependencies.webSocket,
      subscription: {
        frame: [
          "sync",
          subscriptionID,
          {
            channel: `assistant/${assistantID}`,
            type: "logux/subscribe",
            since: { id: "0", time: 0 },
          },
          { id: randomActionNumber(), time: actionTime++ },
        ],
      },
      onEvent: (event) => {
        if (event.kind === "connection-opened")
          return dispatch({ kind: "connection-established" });
        if (
          event.kind === "connection-interrupted" &&
          event.reason === "timeout"
        ) {
          dispatch({ kind: "transport-timeout" });
          return settle(
            new OperationFault(
              "DEPENDENCY_TIMEOUT",
              true,
              `logux-${state.kind.toLowerCase()}-timeout`,
            ),
          );
        }
        if (event.kind === "connection-interrupted") {
          dispatch({ kind: "connection-interrupted" });
          return settle(
            new OperationFault(
              "DEPENDENCY_FAILURE",
              true,
              `logux-${state.kind.toLowerCase()}-close`,
            ),
          );
        }
        if (event.kind === "transport-failure") {
          dispatch({ kind: "transport-failure" });
          return settle(
            new OperationFault(
              "DEPENDENCY_FAILURE",
              true,
              `logux-${state.kind.toLowerCase()}-${event.diagnostic}`,
            ),
          );
        }
        const frame = event.frame;
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
        if (frame[0] === "connected") return dispatch({ kind: "connected" });
        if (frame[0] === "synced" && frame[1] === subscriptionID) {
          dispatch({ kind: "subscription-synced" });
          dispatch({ kind: "mutation-sent", mutationSyncID });
          return;
        }
        if (isSecretFailure(frame, actionID)) {
          dispatch({ kind: "error-frame" });
          return settle(
            new OperationFault(
              "DEPENDENCY_FAILURE",
              true,
              `logux-${state.kind.toLowerCase()}-failed`,
            ),
          );
        }
        if (isSecretCompletion(frame, actionID, assistantID)) {
          dispatch({ kind: "secret-done", actionID });
          return settle();
        }
      },
    });
  });
