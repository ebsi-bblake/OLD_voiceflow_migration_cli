import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { parseLoguxFrame } from "./frame-contract";

export type LoguxFrame = readonly unknown[];
export type LoguxTransportEvent =
  | { readonly kind: "connection-opened" }
  | { readonly kind: "frame"; readonly frame: LoguxFrame }
  | {
      readonly kind: "connection-interrupted";
      readonly reason: "close" | "timeout";
    }
  | { readonly kind: "transport-failure"; readonly diagnostic: string };

export type LoguxSubscriptionPolicy = Readonly<{ readonly frame: LoguxFrame }>;
export type LoguxConnectionInput = Readonly<{
  readonly token: string;
  readonly origin: string;
  readonly subscription?: LoguxSubscriptionPolicy;
  readonly timeoutMs?: number;
  readonly webSocket?: typeof WebSocket;
  readonly onEvent: (event: LoguxTransportEvent) => void;
}>;
export type LoguxConnection = Readonly<{
  readonly send: (frame: LoguxFrame) => void;
  readonly cleanup: () => void;
}>;

type ConnectionResources = {
  socket: WebSocket | undefined;
  timer: ReturnType<typeof setTimeout> | undefined;
  cleaned: boolean;
  terminal: boolean;
  subscriptionSent: boolean;
};
const DEFAULT_TIMEOUT_MS = 15_000;
const CONNECT_VERSION = 4;
const SUBPROTOCOL = "1.9.0";
const closeSocket = (socket: WebSocket | undefined): void => {
  try {
    socket?.close();
  } catch {
    /* cleanup must not replace the operation failure */
  }
};
const emitTerminal = (
  resources: ConnectionResources,
  event: Extract<
    LoguxTransportEvent,
    { readonly kind: "connection-interrupted" | "transport-failure" }
  >,
  onEvent: LoguxConnectionInput["onEvent"],
): void => {
  if (resources.cleaned || resources.terminal) return;
  resources.terminal = true;
  onEvent(event);
};
const sendSerialized = (socket: WebSocket, frame: LoguxFrame): void =>
  socket.send(JSON.stringify(frame));

type SendFrame = (frame: LoguxFrame) => void;

const createSendFrame =
  (
    resources: ConnectionResources,
    onEvent: LoguxConnectionInput["onEvent"],
  ): SendFrame =>
  (frame) => {
    if (resources.cleaned || resources.socket === undefined) return;
    try {
      sendSerialized(resources.socket, frame);
    } catch {
      emitTerminal(
        resources,
        { kind: "transport-failure", diagnostic: "logux-send-failed" },
        onEvent,
      );
    }
  };

const handleHeartbeatFrame = (frame: LoguxFrame, send: SendFrame): boolean => {
  if (frame[0] === "ping") {
    send(["pong", frame[1]]);
    return true;
  }
  return frame[0] === "pong";
};

const sendSubscriptionAfterConnection = (
  frame: LoguxFrame,
  resources: ConnectionResources,
  input: LoguxConnectionInput,
  send: SendFrame,
): void => {
  if (
    frame[0] !== "connected" ||
    input.subscription === undefined ||
    resources.subscriptionSent
  )
    return;
  resources.subscriptionSent = true;
  send(input.subscription.frame);
};

const handleMessage = (
  data: unknown,
  resources: ConnectionResources,
  input: LoguxConnectionInput,
  send: SendFrame,
): void => {
  if (typeof data !== "string" || resources.cleaned) return;
  const frame = parseLoguxFrame(data);
  if (frame === undefined || handleHeartbeatFrame(frame, send)) return;
  input.onEvent({ kind: "frame", frame });
  sendSubscriptionAfterConnection(frame, resources, input, send);
};

const cleanupConnection = (resources: ConnectionResources): void => {
  if (resources.cleaned) return;
  resources.cleaned = true;
  if (resources.timer !== undefined) clearTimeout(resources.timer);
  resources.timer = undefined;
  const socket = resources.socket;
  resources.socket = undefined;
  if (socket !== undefined) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }
  closeSocket(socket);
};

const createSocketHandlers = (
  socket: WebSocket,
  resources: ConnectionResources,
  input: LoguxConnectionInput,
  send: SendFrame,
): Pick<WebSocket, "onopen" | "onmessage" | "onerror" | "onclose"> => ({
  onopen: () => {
    if (resources.cleaned || resources.terminal) return;
    input.onEvent({ kind: "connection-opened" });
    try {
      sendSerialized(socket, [
        "connect",
        CONNECT_VERSION,
        input.origin,
        0,
        { token: input.token, subprotocol: SUBPROTOCOL },
      ]);
    } catch {
      emitTerminal(
        resources,
        {
          kind: "transport-failure",
          diagnostic: "logux-connect-send-failed",
        },
        input.onEvent,
      );
    }
  },
  onmessage: (event: MessageEvent) =>
    handleMessage(event.data, resources, input, send),
  onerror: () =>
    emitTerminal(
      resources,
      { kind: "transport-failure", diagnostic: "logux-socket-error" },
      input.onEvent,
    ),
  onclose: () =>
    emitTerminal(
      resources,
      { kind: "connection-interrupted", reason: "close" },
      input.onEvent,
    ),
});

const startConnectionTimer = (
  resources: ConnectionResources,
  input: LoguxConnectionInput,
): void => {
  resources.timer = setTimeout(
    () =>
      emitTerminal(
        resources,
        { kind: "connection-interrupted", reason: "timeout" },
        input.onEvent,
      ),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
};

/** Owns raw socket mechanics and emits validated transport-boundary events only. */
export const startLoguxConnection = (
  input: LoguxConnectionInput,
): LoguxConnection => {
  const resources: ConnectionResources = {
    socket: undefined,
    timer: undefined,
    cleaned: false,
    terminal: false,
    subscriptionSent: false,
  };
  const send = createSendFrame(resources, input.onEvent);
  startConnectionTimer(resources, input);
  try {
    const Socket = input.webSocket ?? WebSocket;
    const socket = new Socket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    resources.socket = socket;
    Object.assign(socket, createSocketHandlers(socket, resources, input, send));
  } catch {
    emitTerminal(
      resources,
      { kind: "transport-failure", diagnostic: "logux-initialization-failed" },
      input.onEvent,
    );
  }
  return { send, cleanup: () => cleanupConnection(resources) };
};

export const sendSubscriptionOnce = (
  connection: LoguxConnection,
  policy: LoguxSubscriptionPolicy,
): void => connection.send(policy.frame);
