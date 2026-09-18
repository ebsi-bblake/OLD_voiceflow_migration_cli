import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import {
  startLoguxConnection,
  type LoguxConnection,
  type LoguxFrame,
} from "./connection";
import {
  createFolderState,
  transitionFolderState,
  type FolderEvent,
  type FolderEffect,
  type FolderState,
} from "./folder-state-machine";
import { isRecord } from "../guards";

export type CreatedFolder = Readonly<{ id: string; name: string }>;
const FOLDER_CHANNEL = (workspaceID: string): string =>
  `workspace/${workspaceID}`;
const positiveSyncID = (): number =>
  Math.floor(Math.random() * 1_000_000_000) + 1;
const isSafeFolderName = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 128 &&
    !VoiceflowRegex.controlCharacter.test(trimmed)
  );
};
const validFolderID = (value: unknown): value is string | number =>
  typeof value === "number"
    ? Number.isSafeInteger(value) && value > 0
    : typeof value === "string" &&
      VoiceflowRegex.numericID.test(value) &&
      Number.isSafeInteger(Number(value)) &&
      Number(value) > 0;
const folderIDFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const folder = isRecord(data.folder) ? data.folder : {};
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  return [
    data.id,
    data._id,
    data.folderID,
    folder.id,
    folder._id,
    folder.folderID,
    resultData.id,
  ]
    .find(validFolderID)
    ?.toString();
};
const folderNameFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const folder = isRecord(data.folder) ? data.folder : {};
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  return [data.name, folder.name, resultData.name].find(
    (candidate): candidate is string => typeof candidate === "string",
  );
};
const errorCode = (
  frame: LoguxFrame,
): "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" =>
  frame[1] === "wrong-credentials"
    ? "AUTHENTICATION_FAILED"
    : "DEPENDENCY_FAILURE";
const errorDiagnostic = (frame: LoguxFrame): string =>
  errorCode(frame) === "AUTHENTICATION_FAILED"
    ? "logux-authentication-failed"
    : "logux-dependency-failure";

const nestedRecord = (value: unknown, key: string): Record<string, unknown> =>
  isRecord(value) && isRecord(value[key]) ? value[key] : {};
const stringField = (
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined =>
  value !== undefined && typeof value[key] === "string"
    ? value[key]
    : undefined;
const completionAction = (
  frame: LoguxFrame,
): Record<string, unknown> | undefined => {
  const action = isRecord(frame[2]) ? frame[2] : undefined;
  return action?.type === "workspace-folder.CREATE_ONE_DONE"
    ? action
    : undefined;
};
const workspaceIDFromCompletion = (
  payload: Record<string, unknown> | undefined,
): string | undefined => {
  const paramsContext = nestedRecord(
    nestedRecord(payload, "params"),
    "context",
  );
  const resultData = nestedRecord(nestedRecord(payload, "result"), "data");
  return [nestedRecord(payload, "context"), paramsContext, resultData]
    .map((value) => stringField(value, "workspaceID"))
    .find((value): value is string => value !== undefined);
};

const normalizeCompletionFrame = (
  frame: LoguxFrame,
  channel: string,
): FolderEvent | undefined => {
  const action = completionAction(frame);
  if (action === undefined) return undefined;
  const meta = isRecord(action.meta) ? action.meta : undefined;
  const payload = isRecord(action.payload) ? action.payload : undefined;
  return {
    kind: "folder-completed",
    actionID: stringField(meta, "actionID") ?? "",
    origin: stringField(meta, "origin"),
    channel: stringField(action, "channel") ?? channel,
    workspaceID: workspaceIDFromCompletion(payload),
    folderID: folderIDFrom(payload),
    folderName: folderNameFrom(payload),
  };
};

const normalizeFolderFrame = (
  frame: LoguxFrame,
  stateKind: FolderState["kind"],
  subscriptionID: number,
  channel: string,
): FolderEvent | undefined => {
  if (frame[0] === "connected")
    return { kind: "connected", subscriptionSyncID: subscriptionID };
  if (frame[0] === "synced" && typeof frame[1] === "number") {
    if (stateKind === "SUBSCRIBING")
      return {
        kind: "subscription-synced",
        syncID: frame[1],
        mutationSyncID: positiveSyncID(),
      };
    if (stateKind === "MUTATION_SENT")
      return { kind: "mutation-synced", syncID: frame[1] };
    return undefined;
  }
  if (frame[0] === "error")
    return {
      kind: "error-frame",
      code: errorCode(frame),
      diagnostic: errorDiagnostic(frame),
    };
  return normalizeCompletionFrame(frame, channel);
};

export type CreateFolder = (
  auth: AuthContext,
  workspaceID: string,
  name: string,
) => Promise<CreatedFolder>;
export const createFolder: CreateFolder = (auth, workspaceID, name) => {
  const folderName = name.trim();
  if (!isSafeFolderName(folderName) || workspaceID.trim() === "")
    return Promise.reject(new OperationFault("INVALID_ARGUMENT"));
  return new Promise((resolve, reject) => {
    const context = {
      workspaceID,
      channel: FOLDER_CHANNEL(workspaceID),
      folderName,
      origin: `${auth.creatorID}:${createUUID()}:${createUUID()}`,
      actionID: createUUID(),
    } as const;
    const subscriptionID = positiveSyncID();
    let state: FolderState = createFolderState(context);
    let connection: LoguxConnection | undefined;
    const settle = (): void => {
      connection?.cleanup();
      if (state.kind === "COMPLETED") resolve(state.folder);
      else if (state.kind === "FAILED" || state.kind === "UNKNOWN_OUTCOME")
        reject(
          new OperationFault(state.code, state.retryable, state.diagnostic),
        );
      else reject(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    const send = (frame: LoguxFrame): void => connection?.send(frame);
    const executeEffects = (effects: readonly FolderEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === "send-mutation")
          send([
            "sync",
            effect.syncID,
            {
              type: "workspace-folder.CREATE_ONE_STARTED",
              payload: {
                context: { workspaceID },
                data: { name: folderName, scope: "assistant" },
              },
              meta: { origin: context.origin, actionID: context.actionID },
            },
            { id: -2, time: 2 },
          ]);
        if (effect.kind === "close-socket") connection?.cleanup();
        if (effect.kind === "settle") settle();
      }
    };
    const dispatch = (event: FolderEvent): void => {
      const transition = transitionFolderState(state, event);
      state = transition.state;
      executeEffects(transition.effects);
      if (event.kind === "subscription-synced" && state.kind === "SUBSCRIBED")
        dispatch({
          kind: "mutation-sent",
          mutationSyncID: event.mutationSyncID,
        });
    };
    connection = startLoguxConnection({
      token: auth.token,
      origin: context.origin,
      subscription: {
        frame: [
          "sync",
          subscriptionID,
          {
            channel: context.channel,
            type: "logux/subscribe",
            since: { id: "0", time: 0 },
          },
          { id: -1, time: 1 },
        ],
      },
      onEvent: (event) => {
        if (event.kind === "connection-opened")
          return dispatch({ kind: "connection-established" });
        if (
          event.kind === "connection-interrupted" &&
          event.reason === "timeout"
        )
          return dispatch({ kind: "transport-timeout" });
        if (event.kind === "connection-interrupted")
          return dispatch({ kind: "connection-interrupted" });
        if (event.kind === "transport-failure")
          return dispatch({
            kind: "transport-failure",
            diagnostic: event.diagnostic,
          });
        const normalized = normalizeFolderFrame(
          event.frame,
          state.kind,
          subscriptionID,
          context.channel,
        );
        if (normalized) dispatch(normalized);
      },
    });
  });
};
