import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { createUUID } from "../uuid";

export type RenameProject = (
  auth: AuthContext,
  workspaceID: string,
  projectID: string,
  name: string,
) => Promise<void>;

type Frame = readonly unknown[];
type RecordValue = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const parseFrame = (value: unknown): Frame | undefined => {
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};
const actionOf = (frame: Frame): RecordValue | undefined =>
  isRecord(frame[2]) ? frame[2] : undefined;

type ProcessedForOrigin = (frame: Frame, origin: string) => boolean;
const processedForOrigin: ProcessedForOrigin = (frame, origin) => {
  const action = actionOf(frame);
  return (
    action?.type === "logux/processed" &&
    typeof action.id === "string" &&
    action.id.includes(` ${origin} `)
  );
};
/* oxlint-disable complexity -- protocol payload validation has explicit guards. */
export const patchCompleted = (
  frame: Frame,
  workspaceID: string,
  projectID: string,
  name: string,
  expectedOrigin?: string,
): boolean => {
  const action = actionOf(frame);
  if (action?.type !== "project.CRUD:PATCH") return false;
  const payload = isRecord(action.payload) ? action.payload : undefined;
  const value = payload && isRecord(payload.value) ? payload.value : undefined;
  const meta = isRecord(action.meta) ? action.meta : undefined;
  return (
    payload?.workspaceID === workspaceID &&
    payload.key === projectID &&
    value?.name === name &&
    (expectedOrigin === undefined || meta?.origin === expectedOrigin)
  );
};
const send = (ws: WebSocket, frame: Frame): void => ws.send(JSON.stringify(frame));

export const renameProject: RenameProject = (
  auth,
  workspaceID,
  projectID,
  name,
) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const subscriptionID = Math.floor(Math.random() * 1_000_000_000) + 1;
    let time = 1;
    let settled = false;
    let subscriptionComplete = false;
    let mutationSent = false;
    const observedActionTypes = new Set<string>();
    const settle = (error?: OperationFault): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* cleanup must not change the outcome */
      }
      if (error === undefined) resolve();
      else reject(error);
    };
    const timer = setTimeout(
      () =>
        settle(
          new OperationFault(
            "DEPENDENCY_TIMEOUT",
            true,
            `rename acknowledgement timeout; observed=${[...observedActionTypes].join(",") || "none"}`,
          ),
        ),
      15_000,
    );
    ws.onerror = () => settle(new OperationFault("DEPENDENCY_FAILURE", true));
    ws.onclose = () => {
      if (!settled) settle(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    ws.onopen = () => {
      try {
        send(ws, [
          "connect",
          4,
          origin,
          0,
          { token: auth.token, subprotocol: "1.9.0" },
        ]);
      } catch {
        settle(new OperationFault("DEPENDENCY_FAILURE", true));
      }
    };
    ws.onmessage = (event) => {
      const frame = parseFrame(event.data);
      if (frame === undefined) return;
      if (frame[0] === "error")
        return settle(new OperationFault("DEPENDENCY_FAILURE", true));
      const action = actionOf(frame);
      if (typeof action?.type === "string") observedActionTypes.add(action.type);
      if (frame[0] === "connected") {
        try {
          send(ws, [
            "sync",
            subscriptionID,
            {
              channel: `workspace/${workspaceID}`,
              type: "logux/subscribe",
              since: { id: "0", time: 0 },
            },
            { id: -1, time: time++ },
          ]);
        } catch {
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (frame[0] === "synced" && frame[1] === subscriptionID) {
        subscriptionComplete = true;
        if (mutationSent) return;
        mutationSent = true;
        try {
          send(ws, [
            "sync",
            0,
            {
              type: "assistant.PATCH_ONE",
              payload: {
                id: projectID,
                patch: { name },
                context: { workspaceID },
              },
              meta: { origin, actionID: createUUID() },
            },
            { id: -2, time: time++ },
          ]);
        } catch {
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (!subscriptionComplete || !mutationSent) return;
      if (processedForOrigin(frame, origin)) {
        // Logux processed confirms transport handling only. The caller performs
        // the authoritative catalog read before allowing import to proceed.
        settle();
        return;
      }
      if (patchCompleted(frame, workspaceID, projectID, name, origin)) settle();
    };
  });
