import type { AuthContext, ExistingSecret, SecretEntry } from "../types";
import { debugLog } from "../debug";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { loadExistingSecrets } from "../secrets";
import { createSecret } from "./create-secret";
import { updateSecret } from "./update-secret";
import {
  startLoguxConnection,
  type LoguxConnection,
  type LoguxFrame,
} from "./connection";
import { normalizeCatalogFrame } from "./catalog-frames";
import {
  createCatalogState,
  transitionCatalogState,
  type CatalogEffect,
  type CatalogEvent,
  type CatalogState,
} from "./catalog-state-machine";

export type Row = Readonly<Record<string, unknown>>;
const SUPPORTED_WANTED_TYPES: ReadonlySet<string> = new Set([
  "workspace.CRUD:REPLACE",
  "project.CRUD:REPLACE",
  "assistant.REPLACE",
  "workspace-folder.REPLACE",
]);
const MAX_INCOMING_FRAME_BYTES = 1_048_576;
const MAX_INCOMING_BYTES = 8_388_608;
const positiveSyncID = (): number =>
  Math.floor(Math.random() * 1_000_000_000) + 1;

/* oxlint-disable complexity -- catalog frame classification is explicit. */
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
    let state: CatalogState = createCatalogState(operationID, channel, wanted);
    let incomingBytes = 0;
    let connection: LoguxConnection | undefined;
    const settle = (): void => {
      connection?.cleanup();
      if (state.kind === "COMPLETED") resolve(state.rows);
      else if (state.kind === "FAILED" || state.kind === "TIMED_OUT")
        reject(
          new OperationFault(state.code, state.retryable, state.diagnostic),
        );
      else reject(new OperationFault("DEPENDENCY_FAILURE", true));
    };
    const executeEffects = (effects: readonly CatalogEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === "close-socket") connection?.cleanup();
        if (effect.kind === "settle") settle();
      }
    };
    const dispatch = (event: CatalogEvent): void => {
      const previousState = state;
      const transition = transitionCatalogState(state, event);
      state = transition.state;
      if (event.kind === "catalog-action")
        debugLog("catalog", "action", {
          actionType: event.type,
          channel: event.channel,
          eventRowCount: event.rows.length,
          accepted: transition.accepted,
          previousState: previousState.kind,
          nextState: transition.state.kind,
          seenTypes:
            "seenTypes" in transition.state
              ? [...transition.state.seenTypes]
              : [],
          accumulatedRowCount:
            "rows" in transition.state ? transition.state.rows.length : 0,
        });
      state = transition.state;
      executeEffects(transition.effects);
    };
    connection = startLoguxConnection({
      token: auth.token,
      origin: `${auth.creatorID}:${createUUID()}:${createUUID()}`,
      subscription: {
        frame: [
          "sync",
          subscriptionSyncID,
          { channel, type: "logux/subscribe", since: { id: "0", time: 0 } },
          { id: 1, time: 1 },
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
        const frameBytes = new TextEncoder().encode(
          JSON.stringify(event.frame),
        ).byteLength;
        incomingBytes += frameBytes;
        if (
          frameBytes > MAX_INCOMING_FRAME_BYTES ||
          incomingBytes > MAX_INCOMING_BYTES
        )
          return dispatch({
            kind: "transport-failure",
            diagnostic: "catalog-input-bound-exceeded",
          });
        const frame: LoguxFrame = event.frame;
        const normalized = normalizeCatalogFrame(
          frame,
          operationID,
          channel,
          incomingBytes,
          subscriptionSyncID,
        );
        if (normalized?.kind === "connected") dispatch(normalized);
        else if (normalized) dispatch(normalized);
      },
    });
  });
};
const isSupportedRequest = (wanted: readonly string[]): boolean =>
  wanted.length > 0 && wanted.every((type) => SUPPORTED_WANTED_TYPES.has(type));

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
  for (const secret of secrets) await createSecret(auth, assistantID, secret);
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
