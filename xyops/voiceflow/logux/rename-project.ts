import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VOICEFLOW_REALTIME_WEBSOCKET_URL } from "../urls";
import { debugLog } from "../debug";
import { createUUID } from "../uuid";
import {
  createRenameState,
  transitionRenameState,
  type RenameEvent,
  type RenameState,
} from "./state-machine";

export type RenameProject = (
  auth: AuthContext,
  workspaceID: string,
  projectID: string,
  folderID: string,
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

type SyncedForRequest = (frame: Frame, syncID: number) => boolean;
export const syncedForRequest: SyncedForRequest = (frame, syncID) =>
  frame[0] === "synced" && frame[1] === syncID;
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
const actionSummary = (frame: Frame): Readonly<Record<string, unknown>> => {
  const action = actionOf(frame);
  return {
    frameType: frame[0],
    syncID: frame[1],
    actionType: typeof action?.type === "string" ? action.type : undefined,
    actionID: isRecord(action?.meta) && typeof action.meta.actionID === "string" ? action.meta.actionID : undefined,
  };
};
const traceFrame = (direction: "in" | "out", frame: Frame): void =>
  debugLog("logux-rename", "frame", { direction, ...actionSummary(frame) });
const send = (ws: WebSocket, frame: Frame): void => {
  traceFrame("out", frame);
  ws.send(JSON.stringify(frame));
};

export const renameProject: RenameProject = (
  auth,
  workspaceID,
  projectID,
  folderID,
  name,
) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(VOICEFLOW_REALTIME_WEBSOCKET_URL);
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const subscriptionID = Math.floor(Math.random() * 1_000_000_000) + 1;
    const mutationSyncID = subscriptionID + 1;
    let time = 1;
    let settled = false;
    let mutationActionID: string | undefined;
    let state: RenameState = createRenameState({
      workspaceID,
      projectID,
      folderID,
      requestedName: name,
      origin,
    });
    const observedActionTypes = new Set<string>();
    const currentPatchObserved = (): boolean =>
      "patchObserved" in state && state.patchObserved;
    const diagnostic = (event: string, detail?: string): string =>
      `rename-${state.kind}-${event}${detail ? ` ${detail}` : ""}; observed=${[...observedActionTypes].join(",") || "none"}; mutationAck=${state.kind === "MUTATION_ACKNOWLEDGED" || state.kind === "CATALOG_RECONCILING" || state.kind === "COMPLETED"}; patchObserved=${currentPatchObserved()}`;
    const dispatch = (event: RenameEvent): boolean => {
      const transition = transitionRenameState(state, event);
      if (transition.accepted) state = transition.state;
      return transition.accepted;
    };
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
    const timer = setTimeout(() => {
      dispatch({ kind: "timeout" });
      settle(new OperationFault("DEPENDENCY_TIMEOUT", true, diagnostic("timeout")));
    }, 15_000);
    ws.onerror = () => {
      dispatch({ kind: "socket-error", diagnostic: "websocket-error" });
      settle(new OperationFault("DEPENDENCY_FAILURE", true, diagnostic("error")));
    };
    ws.onclose = () => {
      if (!settled) {
        dispatch({ kind: "socket-close" });
        settle(new OperationFault("DEPENDENCY_FAILURE", true, diagnostic("close")));
      }
    };
    ws.onopen = () => {
      dispatch({ kind: "socket-open" });
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
      traceFrame("in", frame);
      if (frame[0] === "error") {
        const errorCode =
          typeof frame[1] === "string" ||
          typeof frame[1] === "number" ||
          typeof frame[1] === "boolean"
            ? String(frame[1]).replace(/\s+/g, " ").slice(0, 80)
            : "unknown";
        dispatch({ kind: "error-frame", diagnostic: `serverCode=${errorCode}` });
        return settle(
          new OperationFault(
            "DEPENDENCY_FAILURE",
            true,
            diagnostic("received", `serverCode=${errorCode}`),
          ),
        );
      }
      const action = actionOf(frame);
      if (typeof action?.type === "string") observedActionTypes.add(action.type);
      if (frame[0] === "connected") {
        dispatch({ kind: "connected", subscriptionSyncID: subscriptionID });
        try {
          send(ws, [
            "sync",
            subscriptionID,
            {
              channel: `workspace/${workspaceID}`,
              type: "logux/subscribe",
            },
            { id: -1, time: time++ },
          ]);
        } catch {
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (frame[0] === "synced" && frame[1] === subscriptionID) {
        if (!dispatch({ kind: "subscription-synced", syncID: subscriptionID })) return;
        mutationActionID = createUUID();
        try {
          send(ws, [
            "sync",
            mutationSyncID,
            {
              type: "assistant.PATCH_ONE",
              payload: {
                id: projectID,
                patch: { name },
                context: { workspaceID },
              },
              meta: { origin, actionID: mutationActionID },
            },
            { id: -2, time: time++ },
          ]);
          dispatch({
            kind: "mutation-sent",
            mutationSyncID,
            actionID: mutationActionID,
          });
        } catch {
          dispatch({ kind: "socket-error", diagnostic: "mutation-send" });
          settle(new OperationFault("DEPENDENCY_FAILURE", true));
        }
        return;
      }
      if (state.kind !== "MUTATION_SENT") return;
      if (syncedForRequest(frame, mutationSyncID)) {
        // The matching `synced` frame acknowledges this mutation. Do not use a
        // generic `logux/processed` event: stale processed events can belong to
        // an earlier request and allow import to race the rename.
        if (dispatch({ kind: "mutation-synced", syncID: mutationSyncID })) settle();
        return;
      }
      const patchMatches = patchCompleted(frame, workspaceID, projectID, name, origin);
      if (frame[0] === "sync" && isRecord(actionOf(frame)))
        dispatch({ kind: "project-patch", matches: patchMatches });
    };
  });
