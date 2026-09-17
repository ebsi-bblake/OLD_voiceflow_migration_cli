import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { handleIncomingMessage } from "./frames";
import { normalizeCatalogFrame } from "./catalog-frames";
import {
  createCatalogState,
  transitionCatalogState,
  type CatalogEvent,
  type CatalogState,
  type CatalogEffect,
} from "./catalog-state-machine";
import { createSecret } from "./create-secret";
import { createUUID } from "../uuid";
import type { ExistingSecret, SecretEntry } from "../types";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { loadExistingSecrets } from "../secrets";
import { updateSecret } from "./update-secret";

type Row = Readonly<Record<string, unknown>>;

const SUPPORTED_WANTED_TYPES: ReadonlySet<string> = new Set([
  "workspace.CRUD:REPLACE",
  "project.CRUD:REPLACE",
  "assistant.REPLACE",
  "workspace-folder.REPLACE",
]);
const MAX_INCOMING_FRAME_BYTES = 1_048_576;
const MAX_INCOMING_BYTES = 8_388_608;

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
  if (!isSupportedRequest(wanted))
    return Promise.reject(new OperationFault("INVALID_ARGUMENT"));
  return new Promise((resolve, reject) => {
    const operationID = createUUID();
    const subscriptionSyncID = positiveSyncID();
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    let state: CatalogState = createCatalogState(operationID, channel, wanted);
    let incomingBytes = 0;
    let timer: ReturnType<typeof setTimeout>;
    let settled = false;

    const settle = (error?: OperationFault): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      closeSocket(ws);
      ws.onmessage = null;
      if (error) reject(error);
      else if (state.kind === "COMPLETED") resolve(state.rows);
      else if (state.kind === "FAILED" || state.kind === "TIMED_OUT")
        reject(new OperationFault(state.code, state.retryable, state.diagnostic));
      else reject(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    const executeEffects = (effects: readonly CatalogEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === "send-subscription") {
          try {
            sendFrame(ws, [
              "sync",
              effect.syncID,
              { channel, type: "logux/subscribe", since: { id: "0", time: 0 } },
              { id: 1, time: 1 },
            ]);
          } catch {
            dispatch({ kind: "socket-error", diagnostic: "catalog-subscription-send-failed" });
          }
        }
        if (effect.kind === "close-socket") closeSocket(ws);
        if (effect.kind === "settle") settle();
      }
    };
    const dispatch = (event: CatalogEvent): void => {
      const transition = transitionCatalogState(state, event);
      state = transition.state;
      executeEffects(transition.effects);
    };

    timer = setTimeout(() => dispatch({ kind: "timeout" }), 15000);
    ws.onopen = () => {
      dispatch({ kind: "socket-open" });
      try {
        sendFrame(ws, [
          "connect",
          4,
          `${auth.creatorID}:${createUUID()}:${createUUID()}`,
          0,
          { token: auth.token, subprotocol: "1.9.0" },
        ]);
      } catch {
        dispatch({ kind: "socket-error", diagnostic: "catalog-connect-send-failed" });
      }
    };
    ws.onerror = () => dispatch({ kind: "socket-error", diagnostic: "catalog-socket-error" });
    ws.onclose = () => {
      if (!settled) dispatch({ kind: "socket-close" });
    };
    ws.onmessage = (event) =>
      handleIncomingMessage(event, {
        incomingBytes,
        maxFrameBytes: MAX_INCOMING_FRAME_BYTES,
        maxBytes: MAX_INCOMING_BYTES,
        onBytes: (bytes) => {
          incomingBytes = bytes;
        },
        settle: () => dispatch({ kind: "socket-error", diagnostic: "catalog-input-bound-exceeded" }),
        handleFrame: (frame) => {
          const normalized = normalizeCatalogFrame(frame, operationID, channel, incomingBytes, subscriptionSyncID);
          if (normalized?.kind === "connected")
            dispatch({ ...normalized, subscriptionSyncID });
          else if (normalized) dispatch(normalized);
        },
      });

    try {
      if (ws.readyState === 1) dispatch({ kind: "socket-open" });
    } catch {
      dispatch({ kind: "socket-error", diagnostic: "catalog-socket-initialization-failed" });
    }
  });
};

const positiveSyncID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;

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
export const createProjectSecrets: CreateProjectSecrets = async (
  auth,
  assistantID,
  secrets,
) => {
  for (const secret of secrets)
    await createSecret(auth, assistantID, secret);
};

type ReconcileProjectSecrets = (
  auth: AuthContext,
  assistantID: string,
  versionID: string,
  secrets: readonly SecretEntry[],
) => Promise<void>;
export const reconcileProjectSecrets: ReconcileProjectSecrets = async (
  auth,
  assistantID,
  versionID,
  secrets,
) => {
  const existing = await loadExistingSecrets(auth, versionID);
  for (const secret of secrets)
    await reconcileSecret(auth, assistantID, existing, secret);
};

const reconcileSecret = (
  auth: AuthContext,
  assistantID: string,
  existing: readonly ExistingSecret[],
  secret: SecretEntry,
): Promise<void> => {
  const match = existing.find((candidate) => candidate.name === secret.name);
  return match === undefined
    ? createSecret(auth, assistantID, secret)
    : updateSecret(auth, assistantID, match, secret);
};
