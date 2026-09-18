import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { debugLog } from "../debug";
import {
  startLoguxConnection,
  type LoguxConnection,
  type LoguxFrame,
  type LoguxTransportEvent,
} from "./connection";
import {
  createRenameState,
  transitionRenameState,
  type RenameEvent,
  type RenameState,
  type RenameEffect,
} from "./rename-state-machine";
import { isRecord } from "../guards";

export type RenameProject = (
  auth: AuthContext,
  workspaceID: string,
  projectID: string,
  folderID: string,
  name: string,
) => Promise<void>;
type RecordValue = Readonly<Record<string, unknown>>;
const actionOf = (frame: LoguxFrame): RecordValue | undefined =>
  isRecord(frame[2]) ? frame[2] : undefined;
export const syncedForRequest = (frame: LoguxFrame, syncID: number): boolean =>
  frame[0] === "synced" && frame[1] === syncID;
const patchPayloadMatches = (
  action: RecordValue,
  workspaceID: string,
  projectID: string,
  name: string,
): boolean => {
  const payload = isRecord(action.payload) ? action.payload : undefined;
  if (payload === undefined) return false;
  if (payload.workspaceID !== workspaceID || payload.key !== projectID)
    return false;
  const value = isRecord(payload.value) ? payload.value : undefined;
  return value?.name === name;
};

const patchOriginMatches = (
  action: RecordValue,
  expectedOrigin: string | undefined,
): boolean =>
  expectedOrigin === undefined ||
  (isRecord(action.meta) && action.meta.origin === expectedOrigin);

export const patchCompleted = (
  frame: LoguxFrame,
  workspaceID: string,
  projectID: string,
  name: string,
  expectedOrigin?: string,
): boolean => {
  const action = actionOf(frame);
  if (action?.type !== "project.CRUD:PATCH") return false;
  return (
    patchPayloadMatches(action, workspaceID, projectID, name) &&
    patchOriginMatches(action, expectedOrigin)
  );
};
const actionSummary = (
  frame: LoguxFrame,
): Readonly<Record<string, unknown>> => {
  const action = actionOf(frame);
  return {
    frameType: frame[0],
    syncID: frame[1],
    actionType: typeof action?.type === "string" ? action.type : undefined,
    actionID:
      isRecord(action?.meta) && typeof action.meta.actionID === "string"
        ? action.meta.actionID
        : undefined,
  };
};
const traceFrame = (direction: "in" | "out", frame: LoguxFrame): void =>
  debugLog("logux-rename", "frame", { direction, ...actionSummary(frame) });
const positiveID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;

export const renameProject: RenameProject = (
  auth,
  workspaceID,
  projectID,
  folderID,
  name,
) =>
  new Promise((resolve, reject) => {
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const subscriptionID = positiveID();
    const mutationSyncID = subscriptionID + 1;
    let state: RenameState = createRenameState({
      workspaceID,
      projectID,
      folderID,
      requestedName: name,
      origin,
    });
    let connection: LoguxConnection | undefined;
    const observedActionTypes = new Set<string>();
    const currentPatchObserved = (): boolean =>
      "patchObserved" in state && state.patchObserved;
    const diagnostic = (event: string, detail?: string): string =>
      `rename-${state.kind}-${event}${detail ? ` ${detail}` : ""}; observed=${[...observedActionTypes].join(",") || "none"}; mutationAck=${state.kind === "MUTATION_ACKNOWLEDGED" || state.kind === "CATALOG_RECONCILING" || state.kind === "COMPLETED"}; patchObserved=${currentPatchObserved()}`;
    const settle = (error?: OperationFault): void => {
      connection?.cleanup();
      if (
        error === undefined &&
        (state.kind === "COMPLETED" || state.kind === "MUTATION_ACKNOWLEDGED")
      )
        resolve();
      else
        reject(
          error ??
            new OperationFault(
              "DEPENDENCY_FAILURE",
              true,
              diagnostic("incomplete"),
            ),
        );
    };
    const executeEffect = (effect: RenameEffect): void => {
      if (effect.kind === "send-mutation") {
        const frame: LoguxFrame = [
          "sync",
          effect.syncID,
          {
            type: "assistant.PATCH_ONE",
            payload: {
              id: projectID,
              patch: { name },
              context: { workspaceID },
            },
            meta: { origin, actionID: effect.actionID },
          },
          { id: -2, time: 2 },
        ];
        traceFrame("out", frame);
        connection?.send(frame);
      }
      if (effect.kind === "close-socket") connection?.cleanup();
      if (effect.kind === "settle") settle();
    };
    const executeEffects = (effects: readonly RenameEffect[]): void => {
      for (const effect of effects) {
        try {
          executeEffect(effect);
        } catch {
          dispatch({
            kind: "transport-failure",
            diagnostic: "rename-effect-failed",
          });
        }
      }
    };
    const dispatch = (event: RenameEvent): boolean => {
      const transition = transitionRenameState(state, event);
      if (!transition.accepted) return false;
      state = transition.state;
      executeEffects(transition.effects);
      return true;
    };
    const handleTransportEvent = (
      event: Exclude<LoguxTransportEvent, { readonly kind: "frame" }>,
    ): void => {
      if (event.kind === "connection-opened")
        return void dispatch({ kind: "connection-established" });
      if (
        event.kind === "connection-interrupted" &&
        event.reason === "timeout"
      ) {
        dispatch({ kind: "transport-timeout" });
        settle(
          new OperationFault("DEPENDENCY_TIMEOUT", true, diagnostic("timeout")),
        );
        return;
      }
      if (event.kind === "connection-interrupted") {
        dispatch({ kind: "connection-interrupted" });
        settle(
          new OperationFault("DEPENDENCY_FAILURE", true, diagnostic("close")),
        );
        return;
      }
      dispatch({ kind: "transport-failure", diagnostic: event.diagnostic });
      settle(
        new OperationFault("DEPENDENCY_FAILURE", true, diagnostic("error")),
      );
    };
    const handleServerError = (frame: LoguxFrame): boolean => {
      if (frame[0] !== "error") return false;
      dispatch({ kind: "error-frame", diagnostic: "server-error" });
      settle(
        new OperationFault("DEPENDENCY_FAILURE", true, diagnostic("received")),
      );
      return true;
    };
    const handleConnectedFrame = (frame: LoguxFrame): boolean => {
      if (frame[0] !== "connected") return false;
      dispatch({ kind: "connected", subscriptionSyncID: subscriptionID });
      return true;
    };
    const handleSubscriptionFrame = (frame: LoguxFrame): boolean => {
      if (frame[0] !== "synced" || frame[1] !== subscriptionID) return false;
      if (!dispatch({ kind: "subscription-synced", syncID: subscriptionID }))
        return true;
      dispatch({
        kind: "mutation-sent",
        mutationSyncID,
        actionID: createUUID(),
      });
      return true;
    };
    const handleMutationFrame = (frame: LoguxFrame): boolean => {
      if (state.kind !== "MUTATION_SENT") return false;
      if (!syncedForRequest(frame, mutationSyncID)) return false;
      if (dispatch({ kind: "mutation-synced", syncID: mutationSyncID }))
        settle();
      return true;
    };
    const handlePatchFrame = (
      frame: LoguxFrame,
      action: RecordValue | undefined,
    ): void => {
      if (frame[0] !== "sync" || !isRecord(action)) return;
      dispatch({
        kind: "project-patch",
        matches: patchCompleted(frame, workspaceID, projectID, name, origin),
      });
    };
    const handleFrame = (frame: LoguxFrame): void => {
      traceFrame("in", frame);
      const action = actionOf(frame);
      if (typeof action?.type === "string")
        observedActionTypes.add(action.type);
      if (handleServerError(frame)) return;
      if (handleConnectedFrame(frame)) return;
      if (handleSubscriptionFrame(frame)) return;
      if (handleMutationFrame(frame)) return;
      handlePatchFrame(frame, action);
    };
    connection = startLoguxConnection({
      token: auth.token,
      origin,
      subscription: {
        frame: [
          "sync",
          subscriptionID,
          { channel: `workspace/${workspaceID}`, type: "logux/subscribe" },
          { id: -1, time: 1 },
        ],
      },
      onEvent: (event) => {
        if (event.kind === "frame") handleFrame(event.frame);
        else handleTransportEvent(event);
      },
    });
  });
