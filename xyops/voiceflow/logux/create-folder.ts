import type { AuthContext } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";

export type CreatedFolder = Readonly<{ id: string; name: string }>;
type Frame = readonly unknown[];
type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const frameOf = (text: string): Frame | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
};
const actionIDFrom = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.actionID === "string"
    ? value.actionID
    : undefined;
const isFolderID = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";
const folderIDCandidates = (data: RecordValue): readonly unknown[] => {
  const folder = isRecord(data.folder) ? data.folder : {};
  return [data.id, data._id, data.folderID, folder.id, folder._id, folder.folderID];
};
const folderIDFrom = (value: unknown): string | undefined => {
  if (!isRecord(value)) return undefined;
  const data = isRecord(value.data) ? value.data : value;
  const result = isRecord(data.result) ? data.result : {};
  const resultData = isRecord(result.data) ? result.data : {};
  const id = [...folderIDCandidates(data), ...folderIDCandidates(resultData)].find(isFolderID);
  return id === undefined ? undefined : String(id);
};

export type CreateFolder = (
  auth: AuthContext,
  workspaceID: string,
  name: string,
) => Promise<CreatedFolder>;
/* oxlint-disable complexity -- protocol lifecycle has explicit terminal states. */
export const createFolder: CreateFolder = (auth, workspaceID, name) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket("wss://realtime.empyrean.voiceflow.com/");
    const origin = `${auth.creatorID}:${createUUID()}:${createUUID()}`;
    const actionID = createUUID();
    const subscriptionID = Math.floor(Math.random() * 1_000_000_000) + 1;
    let time = 1;
    let settled = false;
    const settle = (error?: OperationFault, folder?: CreatedFolder): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* cleanup cannot change the outcome */
      }
      if (error !== undefined) return reject(error);
      if (folder !== undefined) return resolve(folder);
      reject(new OperationFault("DEPENDENCY_FAILURE"));
    };
    const timer = setTimeout(
      () => settle(new OperationFault("DEPENDENCY_TIMEOUT", true)),
      15_000,
    );
    ws.onerror = () => settle(new OperationFault("DEPENDENCY_FAILURE", true));
    ws.onclose = () => {
      if (!settled) settle(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    ws.onopen = () =>
      ws.send(
        JSON.stringify([
          "connect",
          4,
          origin,
          0,
          { token: auth.token, subprotocol: "1.9.0" },
        ]),
      );
    ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      const frame = frameOf(event.data);
      if (!frame) return;
      if (frame[0] === "error")
        return settle(new OperationFault("DEPENDENCY_FAILURE", true));
      if (frame[0] === "connected")
        return ws.send(
          JSON.stringify([
            "sync",
            subscriptionID,
            {
              channel: `workspace/${workspaceID}`,
              type: "logux/subscribe",
              since: { id: "0", time: 0 },
            },
            { id: -1, time: time++ },
          ]),
        );
      if (frame[0] === "synced" && frame[1] === subscriptionID)
        return ws.send(
          JSON.stringify([
            "sync",
            subscriptionID,
            {
              type: "workspace-folder.CREATE_ONE_STARTED",
              payload: {
                context: { workspaceID },
                data: { name, scope: "assistant" },
              },
              meta: { origin, actionID },
            },
            { id: -2, time: time++ },
          ]),
        );
      const action = isRecord(frame[2]) ? frame[2] : undefined;
      if (
        actionIDFrom(action?.meta) !== actionID ||
        action?.type !== "workspace-folder.CREATE_ONE_DONE"
      )
        return;
      const id = folderIDFrom(action.payload);
      return id === undefined
        ? settle(new OperationFault("DEPENDENCY_FAILURE"))
        : settle(undefined, { id, name });
    };
  });
