import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { handleFrame, handleIncomingMessage } from "./frames";
import { createSecret } from "./create-secret";
import { createUUID } from "../uuid";
import type { SecretEntry } from "../types";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";

type Row = Readonly<Record<string, unknown>>;

const SUPPORTED_WANTED_TYPES: ReadonlySet<string> = new Set([
  "workspace.CRUD:REPLACE",
  "project.CRUD:REPLACE",
  "assistant.REPLACE",
  "workspace-folder.REPLACE",
]);
const MAX_INCOMING_FRAME_BYTES = 1_048_576;
const MAX_INCOMING_BYTES = 8_388_608;

type Random8 = () => string;
const random8: Random8 = () =>
  createUUID().replace(VoiceflowRegex.base64UrlDash, "").slice(0, 8);

type SendFrame = (ws: WebSocket, frame: readonly unknown[]) => void;
const sendFrame: SendFrame = (ws, frame) => {
  ws.send(JSON.stringify(frame));
};

type SyncCatalog = (
  auth: AuthContext,
  channel: string,
  wanted: readonly string[],
) => Promise<readonly Row[]>;
export const syncCatalog: SyncCatalog = (auth, channel, wanted) => {
  if (!isSupportedRequest(wanted)) {
    return Promise.reject(new OperationFault("INVALID_ARGUMENT"));
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const rows: Row[] = [];
    const wantedSet = new Set(wanted);
    const seen = new Set<string>();
    const requestID = Math.floor(Math.random() * 1_000_000_000) + 1;
    let done = false;
    let actionID = -1;
    let actionTime = 1;
    let incomingBytes = 0;
    let timer: ReturnType<typeof setTimeout>;
    type Settle = (error?: OperationFault) => void;
    const settle: Settle = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      closeSocket(ws);
      settlePromise(error, rows, resolve, reject);
      ws.onmessage = null;
    };
    type SafeSend = (frame: readonly unknown[]) => void;
    const safeSend: SafeSend = (frame) => {
      try {
        sendFrame(ws, frame);
      } catch {
        settle(new OperationFault("DEPENDENCY_FAILURE", true));
      }
    };
    timer = setTimeout(
      () => settle(new OperationFault("DEPENDENCY_TIMEOUT", true)),
      15000,
    );
    ws.onerror = () => settle(new OperationFault("DEPENDENCY_FAILURE", true));
    ws.onclose = () => {
      if (!done) settle(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    ws.onopen = () =>
      safeSend([
        "connect",
        4,
        `${auth.creatorID}:${random8()}:${random8()}`,
        0,
        { token: auth.token, subprotocol: "1.9.0" },
      ]);
    ws.onmessage = (event) =>
      handleIncomingMessage(event, {
        incomingBytes,
        maxFrameBytes: MAX_INCOMING_FRAME_BYTES,
        maxBytes: MAX_INCOMING_BYTES,
        onBytes: (bytes) => {
          incomingBytes = bytes;
        },
        settle,
        handleFrame: (frame) =>
          handleFrame(
            frame,
            channel,
            requestID,
            wantedSet,
            seen,
            rows,
            () => actionID--,
            () => actionTime++,
            safeSend,
            settle,
          ),
      });
  });
};

const isSupportedRequest = (wanted: readonly string[]): boolean => {
  if (wanted.length === 0) return false;
  return wanted.every((type) => SUPPORTED_WANTED_TYPES.has(type));
};
const closeSocket = (ws: WebSocket): void => {
  try {
    ws.close();
  } catch {
    /* settlement must not be interrupted */
  }
};

type CreateProjectSecrets = (
  auth: AuthContext,
  assistantID: string,
  secrets: readonly SecretEntry[],
) => Promise<void>;
export const createProjectSecrets: CreateProjectSecrets = (
  auth,
  assistantID,
  secrets,
) =>
  secrets.reduce(
    (pending, secret) =>
      pending.then(() => createSecret(auth, assistantID, secret)),
    Promise.resolve(),
  );

const settlePromise = (
  error: OperationFault | undefined,
  rows: readonly Row[],
  resolve: (rows: readonly Row[]) => void,
  reject: (error: OperationFault) => void,
): void => {
  if (error) reject(error);
  else resolve(rows);
};
