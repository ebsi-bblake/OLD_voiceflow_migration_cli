import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { parseLoguxFrame } from "./frame-contract";

export type LoguxConnectionEvent =
  | { readonly kind: "open" }
  | { readonly kind: "message"; readonly data: string }
  | { readonly kind: "error"; readonly diagnostic: string }
  | { readonly kind: "close" }
  | { readonly kind: "timeout" };

export type LoguxFrame = readonly unknown[];

export type LoguxSubscriptionPolicy = Readonly<{
  readonly frame: LoguxFrame;
}>;

export type LoguxConnectionInput = Readonly<{
  readonly token: string;
  readonly origin: string;
  readonly subscription?: LoguxSubscriptionPolicy;
  readonly timeoutMs?: number;
  readonly webSocket?: typeof WebSocket;
  readonly onEvent: (event: LoguxConnectionEvent) => void;
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
    // Cleanup must not replace the operation's failure.
  }
};

const emitTerminal = (
  resources: ConnectionResources,
  event: Extract<LoguxConnectionEvent, { readonly kind: "error" | "close" | "timeout" }>,
  onEvent: LoguxConnectionInput["onEvent"],
): void => {
  if (resources.cleaned || resources.terminal) return;
  resources.terminal = true;
  onEvent(event);
};

const sendSerialized = (socket: WebSocket, frame: LoguxFrame): void => {
  socket.send(JSON.stringify(frame));
};

/* oxlint-disable complexity -- socket lifecycle branches are explicit and terminal. */
/** Owns only the Logux socket lifecycle; operation reducers own meaning and outcomes. */
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
  const onEvent = (event: LoguxConnectionEvent): void => {
    if (resources.cleaned) return;
    if (event.kind === "message") {
      const frame = parseLoguxFrame(event.data);
      if (frame?.[0] === "ping") {
        if (resources.socket !== undefined) sendSerialized(resources.socket, ["pong", frame[1]]);
        return;
      }
      if (frame?.[0] === "pong") return;
      input.onEvent(event);
      if (frame?.[0] === "connected" && input.subscription !== undefined && !resources.subscriptionSent) {
        resources.subscriptionSent = true;
        send(input.subscription.frame);
      }
      return;
    }
    input.onEvent(event);
  };
  const send = (frame: LoguxFrame): void => {
    if (resources.cleaned || resources.socket === undefined) return;
    try {
      sendSerialized(resources.socket, frame);
    } catch {
      emitTerminal(resources, { kind: "error", diagnostic: "logux-send-failed" }, input.onEvent);
    }
  };
  const cleanup = (): void => {
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

  resources.timer = setTimeout(
    () => emitTerminal(resources, { kind: "timeout" }, input.onEvent),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const Socket = input.webSocket ?? WebSocket;
    const socket = new Socket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    resources.socket = socket;
    socket.onopen = () => {
      if (resources.cleaned || resources.terminal) return;
      onEvent({ kind: "open" });
      try {
        sendSerialized(socket, [
          "connect",
          CONNECT_VERSION,
          input.origin,
          0,
          { token: input.token, subprotocol: SUBPROTOCOL },
        ]);
      } catch {
        emitTerminal(resources, { kind: "error", diagnostic: "logux-connect-send-failed" }, input.onEvent);
      }
    };
    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") onEvent({ kind: "message", data: event.data });
    };
    socket.onerror = () => emitTerminal(resources, { kind: "error", diagnostic: "logux-socket-error" }, input.onEvent);
    socket.onclose = () => emitTerminal(resources, { kind: "close" }, input.onEvent);
  } catch {
    emitTerminal(resources, { kind: "error", diagnostic: "logux-initialization-failed" }, input.onEvent);
  }

  // Subscription is sent after the operation observes the connected frame. The runner
  // does not infer channel, cursor, or correlation policy from operation names.
  return { send, cleanup };
};

export const sendSubscriptionOnce = (
  connection: LoguxConnection,
  policy: LoguxSubscriptionPolicy,
): void => connection.send(policy.frame);