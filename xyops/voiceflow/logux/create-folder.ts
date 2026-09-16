import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { createUUID } from "../uuid";
import {
  createFolderState,
  transitionFolderState,
  type FolderEvent,
  type FolderEffect,
  type FolderState,
} from "./folder-state-machine";

export type CreatedFolder = Readonly<{ id: string; name: string }>;
type RecordValue = Readonly<Record<string, unknown>>;
type Frame = readonly unknown[];
const FOLDER_CHANNEL = (workspaceID: string): string => `workspace/${workspaceID}`;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const parseFrame = (value: string): Frame | undefined => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};
const isSafeFolderName = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 128 && !VoiceflowRegex.controlCharacter.test(trimmed);
};
const positiveSyncID = (): number => Math.floor(Math.random() * 1_000_000_000) + 1;
const validFolderID = (value: unknown): value is string | number => {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
  if (typeof value !== "string" || !VoiceflowRegex.numericID.test(value)) return false;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0;
};
const folderIDCandidates = (data: RecordValue): readonly unknown[] => {
  const folder = isRecord(data.folder) ? data.folder : {};
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  return [data.id, data._id, data.folderID, folder.id, folder._id, folder.folderID, resultData.id];
};
const folderIDFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const id = folderIDCandidates(data).find(validFolderID);
  return id === undefined ? undefined : String(id);
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
const errorCode = (frame: Frame): "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" =>
  frame[1] === "wrong-credentials" ? "AUTHENTICATION_FAILED" : "DEPENDENCY_FAILURE";
const errorDiagnostic = (frame: Frame): string =>
  errorCode(frame) === "AUTHENTICATION_FAILED"
    ? "logux-authentication-failed"
    : "logux-dependency-failure";

export type CreateFolder = (
  auth: AuthContext,
  workspaceID: string,
  name: string,
) => Promise<CreatedFolder>;
/* oxlint-disable complexity -- protocol lifecycle has explicit terminal states. */
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
    let state: FolderState = createFolderState(context);
    let ws: WebSocket | undefined;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const closeSocket = (): void => {
      try {
        ws?.close();
      } catch {
        /* cleanup cannot change the terminal outcome */
      }
    };
    const settle = (): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      closeSocket();
      if (state.kind === "COMPLETED") resolve(state.folder);
      else if (state.kind === "FAILED" || state.kind === "UNKNOWN_OUTCOME")
        reject(new OperationFault(state.code, state.retryable, state.diagnostic));
      else reject(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    const send = (frame: Frame): void => {
      try {
        ws?.send(JSON.stringify(frame));
      } catch {
        dispatch({ kind: "socket-error", diagnostic: "folder-send-failed" });
      }
    };
    const executeEffects = (effects: readonly FolderEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === "send-subscription")
          send([
            "sync",
            effect.syncID,
            { channel: context.channel, type: "logux/subscribe", since: { id: "0", time: 0 } },
            { id: -1, time: 1 },
          ]);
        if (effect.kind === "send-mutation")
          send([
            "sync",
            effect.syncID,
            {
              type: "workspace-folder.CREATE_ONE_STARTED",
              payload: { context: { workspaceID }, data: { name: folderName, scope: "assistant" } },
              meta: { origin: context.origin, actionID: context.actionID },
            },
            { id: -2, time: 2 },
          ]);
        if (effect.kind === "close-socket") closeSocket();
        if (effect.kind === "settle") settle();
      }
    };
    const dispatch = (event: FolderEvent): void => {
      const transition = transitionFolderState(state, event);
      state = transition.state;
      executeEffects(transition.effects);
      if (event.kind === "subscription-synced" && state.kind === "SUBSCRIBED")
        dispatch({ kind: "mutation-sent", mutationSyncID: event.mutationSyncID });
    };
    const normalizeFrame = (frame: Frame): FolderEvent | undefined => {
      if (frame[0] === "connected") return { kind: "connected", subscriptionSyncID: positiveSyncID() };
      if (frame[0] === "synced" && typeof frame[1] === "number") {
        if (state.kind === "SUBSCRIBING")
          return { kind: "subscription-synced", syncID: frame[1], mutationSyncID: positiveSyncID() };
        if (state.kind === "MUTATION_SENT") return { kind: "mutation-synced", syncID: frame[1] };
        return undefined;
      }
      if (frame[0] === "error") return { kind: "error-frame", code: errorCode(frame), diagnostic: errorDiagnostic(frame) };
      const action = isRecord(frame[2]) ? frame[2] : undefined;
      if (action?.type !== "workspace-folder.CREATE_ONE_DONE") return undefined;
      const meta = isRecord(action.meta) ? action.meta : undefined;
      const payload = action.payload;
      const payloadRecord = isRecord(payload) ? payload : undefined;
      const completionWorkspaceID = isRecord(payloadRecord?.context) && typeof payloadRecord.context.workspaceID === "string"
        ? payloadRecord.context.workspaceID
        : undefined;
      const completionChannel = typeof action.channel === "string" ? action.channel : context.channel;
      return {
        kind: "folder-completed",
        actionID: typeof meta?.actionID === "string" ? meta.actionID : "",
        origin: typeof meta?.origin === "string" ? meta.origin : undefined,
        channel: completionChannel,
        workspaceID: completionWorkspaceID,
        folderID: folderIDFrom(payload),
        folderName: folderNameFrom(payload),
      };
    };

    try {
      timer = setTimeout(() => dispatch({ kind: "timeout" }), 15_000);
      ws = new WebSocket("wss://realtime.empyrean.voiceflow.com/");
      ws.onerror = () => dispatch({ kind: "socket-error", diagnostic: "folder-socket-error" });
      ws.onclose = () => {
        if (!settled) dispatch({ kind: "socket-close" });
      };
      ws.onopen = () => {
        dispatch({ kind: "socket-open" });
        send(["connect", 4, context.origin, 0, { token: auth.token, subprotocol: "1.9.0" }]);
      };
      ws.onmessage = (event) => {
        if (typeof event.data !== "string") return;
        const frame = parseFrame(event.data);
        const normalized = frame === undefined ? undefined : normalizeFrame(frame);
        if (normalized) dispatch(normalized);
      };
    } catch {
      dispatch({ kind: "socket-error", diagnostic: "folder-initialization-failed" });
    }
  });
};
