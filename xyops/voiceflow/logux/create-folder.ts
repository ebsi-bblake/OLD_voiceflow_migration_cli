import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import { startLoguxConnection, type LoguxConnection, type LoguxFrame } from "./connection";
import { createFolderState, transitionFolderState, type FolderEvent, type FolderEffect, type FolderState } from "./folder-state-machine";
import { parseLoguxFrame } from "./frame-contract";
import { isRecord } from "../guards";

export type CreatedFolder = Readonly<{ id: string; name: string }>;
const FOLDER_CHANNEL = (workspaceID: string): string => `workspace/${workspaceID}`;
const positiveSyncID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;
const isSafeFolderName = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 128 && !VoiceflowRegex.controlCharacter.test(trimmed);
};
const validFolderID = (value: unknown): value is string | number => typeof value === "number" ? Number.isSafeInteger(value) && value > 0 : typeof value === "string" && VoiceflowRegex.numericID.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const folderIDFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const folder = isRecord(data.folder) ? data.folder : {};
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  return [data.id, data._id, data.folderID, folder.id, folder._id, folder.folderID, resultData.id].find(validFolderID)?.toString();
};
const folderNameFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const folder = isRecord(data.folder) ? data.folder : {};
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  return [data.name, folder.name, resultData.name].find((candidate): candidate is string => typeof candidate === "string");
};
const errorCode = (frame: LoguxFrame): "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" => frame[1] === "wrong-credentials" ? "AUTHENTICATION_FAILED" : "DEPENDENCY_FAILURE";
const errorDiagnostic = (frame: LoguxFrame): string => errorCode(frame) === "AUTHENTICATION_FAILED" ? "logux-authentication-failed" : "logux-dependency-failure";

/* oxlint-disable complexity -- protocol payload and lifecycle guards are explicit. */
export type CreateFolder = (auth: AuthContext, workspaceID: string, name: string) => Promise<CreatedFolder>;
export const createFolder: CreateFolder = (auth, workspaceID, name) => {
  const folderName = name.trim();
  if (!isSafeFolderName(folderName) || workspaceID.trim() === "") return Promise.reject(new OperationFault("INVALID_ARGUMENT"));
  return new Promise((resolve, reject) => {
    const context = { workspaceID, channel: FOLDER_CHANNEL(workspaceID), folderName, origin: `${auth.creatorID}:${createUUID()}:${createUUID()}`, actionID: createUUID() } as const;
    const subscriptionID = positiveSyncID();
    let state: FolderState = createFolderState(context);
    let connection: LoguxConnection | undefined;
    const settle = (): void => {
      connection?.cleanup();
      if (state.kind === "COMPLETED") resolve(state.folder);
      else if (state.kind === "FAILED" || state.kind === "UNKNOWN_OUTCOME") reject(new OperationFault(state.code, state.retryable, state.diagnostic));
      else reject(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    const send = (frame: LoguxFrame): void => connection?.send(frame);
    const executeEffects = (effects: readonly FolderEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === "send-mutation") send(["sync", effect.syncID, { type: "workspace-folder.CREATE_ONE_STARTED", payload: { context: { workspaceID }, data: { name: folderName, scope: "assistant" } }, meta: { origin: context.origin, actionID: context.actionID } }, { id: -2, time: 2 }]);
        if (effect.kind === "close-socket") connection?.cleanup();
        if (effect.kind === "settle") settle();
      }
    };
    const dispatch = (event: FolderEvent): void => {
      const transition = transitionFolderState(state, event);
      state = transition.state;
      executeEffects(transition.effects);
      if (event.kind === "subscription-synced" && state.kind === "SUBSCRIBED") dispatch({ kind: "mutation-sent", mutationSyncID: event.mutationSyncID });
    };
    const normalizeFrame = (frame: LoguxFrame): FolderEvent | undefined => {
      if (frame[0] === "connected") return { kind: "connected", subscriptionSyncID: subscriptionID };
      if (frame[0] === "synced" && typeof frame[1] === "number") {
        if (state.kind === "SUBSCRIBING") return { kind: "subscription-synced", syncID: frame[1], mutationSyncID: positiveSyncID() };
        if (state.kind === "MUTATION_SENT") return { kind: "mutation-synced", syncID: frame[1] };
        return undefined;
      }
      if (frame[0] === "error") return { kind: "error-frame", code: errorCode(frame), diagnostic: errorDiagnostic(frame) };
      const action = isRecord(frame[2]) ? frame[2] : undefined;
      if (action?.type !== "workspace-folder.CREATE_ONE_DONE") return undefined;
      const meta = isRecord(action.meta) ? action.meta : undefined;
      const payload = isRecord(action.payload) ? action.payload : undefined;
      const params = isRecord(payload?.params) ? payload.params : {};
      const paramsContext = isRecord(params.context) ? params.context : {};
      const result = isRecord(payload?.result) ? payload.result : {};
      const resultData = isRecord(result.data) ? result.data : {};
      const workspace = [payload?.context, paramsContext, resultData].map((value) => isRecord(value) ? value.workspaceID : undefined).find((value): value is string => typeof value === "string");
      return { kind: "folder-completed", actionID: typeof meta?.actionID === "string" ? meta.actionID : "", origin: typeof meta?.origin === "string" ? meta.origin : undefined, channel: typeof action.channel === "string" ? action.channel : context.channel, workspaceID: workspace, folderID: folderIDFrom(payload), folderName: folderNameFrom(payload) };
    };
    connection = startLoguxConnection({
      token: auth.token,
      origin: context.origin,
      subscription: { frame: ["sync", subscriptionID, { channel: context.channel, type: "logux/subscribe", since: { id: "0", time: 0 } }, { id: -1, time: 1 }] },
      onEvent: (event) => {
        if (event.kind === "open") return dispatch({ kind: "socket-open" });
        if (event.kind === "timeout") return dispatch({ kind: "timeout" });
        if (event.kind === "close") return dispatch({ kind: "socket-close" });
        if (event.kind === "error") return dispatch({ kind: "socket-error", diagnostic: event.diagnostic });
        const frame = parseLoguxFrame(event.data);
        const normalized = frame === undefined ? undefined : normalizeFrame(frame);
        if (normalized) dispatch(normalized);
      },
    });
  });
};
