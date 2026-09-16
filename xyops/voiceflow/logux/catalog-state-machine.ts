/* oxlint-disable complexity -- protocol transitions are intentionally exhaustive. */
export type CatalogRow = Readonly<Record<string, unknown>>;
const MAX_CATALOG_ROWS = 100_000;

export type CatalogErrorCode =
  | "AUTHENTICATION_FAILED"
  | "DEPENDENCY_FAILURE"
  | "DEPENDENCY_TIMEOUT";

type CatalogContext = Readonly<{
  readonly operationID: string;
  readonly channel: string;
  readonly requestedTypes: readonly string[];
}>;

export type CatalogState =
  | { readonly kind: "CONNECTING"; readonly context: CatalogContext }
  | { readonly kind: "CONNECTED"; readonly context: CatalogContext }
  | {
      readonly kind: "SUBSCRIBING";
      readonly context: CatalogContext;
      readonly subscriptionSyncID: number;
    }
  | {
      readonly kind: "COLLECTING";
      readonly context: CatalogContext;
      readonly subscriptionSyncID: number;
      readonly seenTypes: ReadonlySet<string>;
      readonly rows: readonly CatalogRow[];
      readonly byteCount: number;
    }
  | {
      readonly kind: "COMPLETED";
      readonly context: CatalogContext;
      readonly seenTypes: ReadonlySet<string>;
      readonly rows: readonly CatalogRow[];
    }
  | {
      readonly kind: "FAILED";
      readonly context: CatalogContext;
      readonly code: Exclude<CatalogErrorCode, "DEPENDENCY_TIMEOUT">;
      readonly diagnostic: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "TIMED_OUT";
      readonly context: CatalogContext;
      readonly code: "DEPENDENCY_TIMEOUT";
      readonly diagnostic: string;
      readonly retryable: true;
    };

export type CatalogEvent =
  | { readonly kind: "socket-open" }
  | { readonly kind: "connected"; readonly subscriptionSyncID: number }
  | { readonly kind: "subscription-synced"; readonly syncID: number }
  | {
      readonly kind: "catalog-action";
      readonly operationID: string;
      readonly channel: string;
      readonly workspaceID?: string;
      readonly type: string;
      readonly rows: readonly CatalogRow[];
      readonly byteCount: number;
    }
  | {
      readonly kind: "error-frame";
      readonly code: "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE";
      readonly diagnostic: string;
    }
  | { readonly kind: "socket-error"; readonly diagnostic: string }
  | { readonly kind: "socket-close" }
  | { readonly kind: "timeout" };

export type CatalogEffect =
  | { readonly kind: "send-subscription"; readonly syncID: number }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type CatalogTransition = Readonly<{
  readonly state: CatalogState;
  readonly effects: readonly CatalogEffect[];
}>;

type CreateCatalogState = (
  operationID: string,
  channel: string,
  requestedTypes: readonly string[],
) => CatalogState;
export const createCatalogState: CreateCatalogState = (
  operationID,
  channel,
  requestedTypes,
) => ({
  kind: "CONNECTING",
  context: { operationID, channel, requestedTypes: [...requestedTypes] },
});

const ignored = (state: CatalogState): CatalogTransition => ({
  state,
  effects: [],
});
const accepted = (
  state: CatalogState,
  effects: readonly CatalogEffect[] = [],
): CatalogTransition => ({ state, effects });
const isTerminal = (state: CatalogState): boolean =>
  ["COMPLETED", "FAILED", "TIMED_OUT"].includes(state.kind);
const requestedTypeSet = (state: CatalogState): ReadonlySet<string> =>
  new Set(state.context.requestedTypes);
const workspaceIDFromChannel = (channel: string): string | undefined =>
  channel.startsWith("workspace/") ? channel.slice("workspace/".length) : undefined;
const actionIsScopedToState = (
  state: Extract<CatalogState, { readonly kind: "COLLECTING" }>,
  event: Extract<CatalogEvent, { readonly kind: "catalog-action" }>,
): boolean => {
  const expectedWorkspaceID = workspaceIDFromChannel(state.context.channel);
  return (
    event.operationID === state.context.operationID &&
    event.channel === state.context.channel &&
    (event.workspaceID === undefined || event.workspaceID === expectedWorkspaceID)
  );
};
const actionCompletesSnapshot = (
  requestedTypes: ReadonlySet<string>,
  seenTypes: ReadonlySet<string>,
): boolean => [...requestedTypes].every((type) => seenTypes.has(type));

type TransitionCatalogState = (
  state: CatalogState,
  event: CatalogEvent,
) => CatalogTransition;
export const transitionCatalogState: TransitionCatalogState = (state, event) => {
  if (isTerminal(state)) return ignored(state);

  if (event.kind === "socket-open" && state.kind === "CONNECTING")
    return accepted({ ...state, kind: "CONNECTED" });

  if (event.kind === "connected" && state.kind === "CONNECTED")
    return accepted(
      { ...state, kind: "SUBSCRIBING", subscriptionSyncID: event.subscriptionSyncID },
      [{ kind: "send-subscription", syncID: event.subscriptionSyncID }],
    );

  if (
    event.kind === "subscription-synced" &&
    state.kind === "SUBSCRIBING" &&
    event.syncID === state.subscriptionSyncID
  )
    return accepted({
      kind: "COLLECTING",
      context: state.context,
      subscriptionSyncID: state.subscriptionSyncID,
      seenTypes: new Set(),
      rows: [],
      byteCount: 0,
    });

  if (event.kind === "catalog-action" && state.kind === "COLLECTING") {
    if (!actionIsScopedToState(state, event))
      return accepted({ ...state, byteCount: event.byteCount });
    if (!requestedTypeSet(state).has(event.type))
      return accepted({ ...state, byteCount: event.byteCount });
    if (state.seenTypes.has(event.type))
      return accepted({ ...state, byteCount: event.byteCount });
    if (state.rows.length + event.rows.length > MAX_CATALOG_ROWS)
      return accepted(
        {
          kind: "FAILED",
          context: state.context,
          code: "DEPENDENCY_FAILURE",
          diagnostic: "catalog-row-bound-exceeded",
          retryable: true,
        },
        [{ kind: "close-socket" }, { kind: "settle" }],
      );
    const seenTypes = new Set(state.seenTypes).add(event.type);
    const rows = [...state.rows, ...event.rows];
    const nextState = { ...state, seenTypes, rows, byteCount: event.byteCount };
    return actionCompletesSnapshot(requestedTypeSet(state), seenTypes)
      ? accepted({ kind: "COMPLETED", context: state.context, seenTypes, rows }, [
          { kind: "close-socket" },
          { kind: "settle" },
        ])
      : accepted(nextState);
  }

  if (event.kind === "error-frame" || event.kind === "socket-error")
    return accepted(
      {
        kind: "FAILED",
        context: state.context,
        code: event.kind === "error-frame" ? event.code : "DEPENDENCY_FAILURE",
        diagnostic: event.diagnostic,
        retryable: event.kind !== "error-frame" || event.code !== "AUTHENTICATION_FAILED",
      },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );

  if (event.kind === "timeout")
    return accepted(
      {
        kind: "TIMED_OUT",
        context: state.context,
        code: "DEPENDENCY_TIMEOUT",
        diagnostic: "catalog-operation-timeout",
        retryable: true,
      },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );

  if (event.kind === "socket-close")
    return accepted(
      {
        kind: "FAILED",
        context: state.context,
        code: "DEPENDENCY_FAILURE",
        diagnostic: "catalog-socket-close-before-completion",
        retryable: true,
      },
      [{ kind: "settle" }],
    );

  return ignored(state);
};
