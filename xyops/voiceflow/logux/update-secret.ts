import type { AuthContext, ExistingSecret, SecretEntry } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { debugLog } from "../debug";
import { isRecord } from "../guards";
import {
  startLoguxConnection,
  type LoguxConnection,
  type LoguxFrame,
  type LoguxTransportEvent,
} from "./connection";

type UpdateSecret = (
  auth: AuthContext,
  assistantID: string,
  existing: ExistingSecret,
  secret: SecretEntry,
) => Promise<void>;
const positiveID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;
const traceFrame = (direction: "in" | "out", frame: LoguxFrame): void => {
  const action = frame[2];
  debugLog("logux-secret-update", "frame", {
    direction,
    frameType: frame[0],
    syncID: frame[1],
    actionType:
      isRecord(action) && typeof action.type === "string"
        ? action.type
        : undefined,
  });
};
type SecretUpdateRuntime = Readonly<{
  readonly subscriptionID: number;
  readonly mutationSyncID: number;
  readonly settle: (error?: OperationFault) => void;
  readonly send: (frame: LoguxFrame) => void;
}>;

const secretFailure = (
  code: "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT",
  diagnostic: string,
): OperationFault => new OperationFault(code, true, diagnostic);

const handleSecretFrame = (
  frame: LoguxFrame,
  runtime: SecretUpdateRuntime,
  mutationFrame: LoguxFrame,
): void => {
  traceFrame("in", frame);
  if (frame[0] === "error")
    return runtime.settle(
      secretFailure("DEPENDENCY_FAILURE", "logux-secret-update-error-frame"),
    );
  if (frame[0] === "connected") return;
  if (frame[0] === "synced" && frame[1] === runtime.subscriptionID)
    return runtime.send(mutationFrame);
  if (frame[0] === "synced" && frame[1] === runtime.mutationSyncID)
    return runtime.settle();
};

const handleSecretTransportEvent = (
  event: LoguxTransportEvent,
  runtime: SecretUpdateRuntime,
  mutationFrame: LoguxFrame,
): void => {
  if (event.kind === "connection-opened") return;
  if (event.kind === "connection-interrupted")
    return runtime.settle(
      event.reason === "timeout"
        ? secretFailure("DEPENDENCY_TIMEOUT", "logux-secret-update-timeout")
        : secretFailure("DEPENDENCY_FAILURE", "logux-secret-update-close"),
    );
  if (event.kind === "transport-failure")
    return runtime.settle(
      secretFailure("DEPENDENCY_FAILURE", "logux-secret-update-error"),
    );
  handleSecretFrame(event.frame, runtime, mutationFrame);
};

const createMutationFrame = (
  origin: string,
  actionID: string,
  assistantID: string,
  existing: ExistingSecret,
  secret: SecretEntry,
  mutationSyncID: number,
): LoguxFrame => [
  "sync",
  mutationSyncID,
  {
    type: "secret.PATCH_ONE_WITH_VALUE",
    payload: {
      context: { assistantID },
      id: existing.id,
      patch: {
        name: secret.name,
        visibility: existing.visibility,
        defaultValue: secret.value,
      },
    },
    meta: { origin, actionID },
  },
  { id: 2, time: 2 },
];

export const updateSecret: UpdateSecret = (
  auth,
  assistantID,
  existing,
  secret,
) =>
  new Promise((resolve, reject) => {
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const subscriptionID = positiveID();
    const mutationSyncID = positiveID();
    const actionID = createUUID();
    let connection: LoguxConnection | undefined;
    const settle = (error?: OperationFault): void => {
      connection?.cleanup();
      if (error === undefined) resolve();
      else reject(error);
    };
    const send = (frame: LoguxFrame): void => {
      traceFrame("out", frame);
      connection?.send(frame);
    };
    const runtime = {
      subscriptionID,
      mutationSyncID,
      settle,
      send,
    } satisfies SecretUpdateRuntime;
    const mutationFrame = createMutationFrame(
      origin,
      actionID,
      assistantID,
      existing,
      secret,
      mutationSyncID,
    );
    connection = startLoguxConnection({
      token: auth.token,
      origin,
      subscription: {
        frame: [
          "sync",
          subscriptionID,
          {
            channel: `assistant/${assistantID}`,
            type: "logux/subscribe",
            since: { id: "0", time: 0 },
          },
          { id: 1, time: 1 },
        ],
      },
      onEvent: (event) =>
        handleSecretTransportEvent(event, runtime, mutationFrame),
    });
  });
