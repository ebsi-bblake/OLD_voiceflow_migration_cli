export type CatalogRow = Readonly<Record<string, unknown>>;
const MAX_CATALOG_ROWS = 100_000;

export type CatalogErrorCode =
  "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";

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
  | { readonly kind: "connection-established" }
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
  | { readonly kind: "transport-failure"; readonly diagnostic: string }
  | { readonly kind: "connection-interrupted" }
  | { readonly kind: "transport-timeout" };

export type CatalogEffect =
  | { readonly kind: "send-subscription"; readonly syncID: number }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type CatalogTransition = Readonly<{
  readonly state: CatalogState;
  readonly accepted: boolean;
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
  accepted: false,
  effects: [],
});
const accepted = (
  state: CatalogState,
  effects: readonly CatalogEffect[] = [],
): CatalogTransition => ({ state, accepted: true, effects });
const isTerminal = (state: CatalogState): boolean =>
  ["COMPLETED", "FAILED", "TIMED_OUT"].includes(state.kind);
const requestedTypeSet = (state: CatalogState): ReadonlySet<string> =>
  new Set(state.context.requestedTypes);
const workspaceIDFromChannel = (channel: string): string | undefined =>
  channel.startsWith("workspace/")
    ? channel.slice("workspace/".length)
    : undefined;
const actionIsScopedToState = (
  state: Extract<CatalogState, { readonly kind: "COLLECTING" }>,
  event: Extract<CatalogEvent, { readonly kind: "catalog-action" }>,
): boolean => {
  const expectedWorkspaceID = workspaceIDFromChannel(state.context.channel);
  return (
    event.operationID === state.context.operationID &&
    event.channel === state.context.channel &&
    (event.workspaceID === undefined ||
      event.workspaceID === expectedWorkspaceID)
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

type CatalogEventHandler = (
  state: CatalogState,
  event: CatalogEvent,
) => CatalogTransition | undefined;

const handleConnectionEstablished: CatalogEventHandler = (state, event) =>
  event.kind === "connection-established" && state.kind === "CONNECTING"
    ? accepted({ ...state, kind: "CONNECTED" })
    : event.kind === "connection-established"
      ? ignored(state)
      : undefined;

const handleConnected: CatalogEventHandler = (state, event) =>
  event.kind === "connected" && state.kind === "CONNECTED"
    ? accepted(
        {
          ...state,
          kind: "SUBSCRIBING",
          subscriptionSyncID: event.subscriptionSyncID,
        },
        [{ kind: "send-subscription", syncID: event.subscriptionSyncID }],
      )
    : event.kind === "connected"
      ? ignored(state)
      : undefined;

const handleSubscriptionSynced: CatalogEventHandler = (state, event) => {
  if (event.kind !== "subscription-synced") return undefined;
  if (state.kind !== "SUBSCRIBING" || event.syncID !== state.subscriptionSyncID)
    return ignored(state);
  return accepted({
    kind: "COLLECTING",
    context: state.context,
    subscriptionSyncID: state.subscriptionSyncID,
    seenTypes: new Set(),
    rows: [],
    byteCount: 0,
  });
};

const updateByteCount = (
  state: Extract<CatalogState, { readonly kind: "COLLECTING" }>,
  byteCount: number,
): CatalogTransition => accepted({ ...state, byteCount });

const applyCatalogAction = (
  state: Extract<CatalogState, { readonly kind: "COLLECTING" }>,
  event: Extract<CatalogEvent, { readonly kind: "catalog-action" }>,
): CatalogTransition => {
  if (!actionIsScopedToState(state, event))
    return updateByteCount(state, event.byteCount);
  const requestedTypes = requestedTypeSet(state);
  if (!requestedTypes.has(event.type) || state.seenTypes.has(event.type))
    return updateByteCount(state, event.byteCount);
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
  return actionCompletesSnapshot(requestedTypes, seenTypes)
    ? accepted({ kind: "COMPLETED", context: state.context, seenTypes, rows }, [
        { kind: "close-socket" },
        { kind: "settle" },
      ])
    : accepted({ ...state, seenTypes, rows, byteCount: event.byteCount });
};

const handleCatalogAction: CatalogEventHandler = (state, event) => {
  if (event.kind !== "catalog-action") return undefined;
  if (state.kind !== "COLLECTING") return ignored(state);
  return applyCatalogAction(state, event);
};

const handleFailure: CatalogEventHandler = (state, event) => {
  if (event.kind !== "error-frame" && event.kind !== "transport-failure")
    return undefined;
  const isAuthenticationFailure =
    event.kind === "error-frame" && event.code === "AUTHENTICATION_FAILED";
  return accepted(
    {
      kind: "FAILED",
      context: state.context,
      code: event.kind === "error-frame" ? event.code : "DEPENDENCY_FAILURE",
      diagnostic: event.diagnostic,
      retryable: !isAuthenticationFailure,
    },
    [{ kind: "close-socket" }, { kind: "settle" }],
  );
};

const handleTimeout: CatalogEventHandler = (state, event) =>
  event.kind === "transport-timeout"
    ? accepted(
        {
          kind: "TIMED_OUT",
          context: state.context,
          code: "DEPENDENCY_TIMEOUT",
          diagnostic: "catalog-operation-timeout",
          retryable: true,
        },
        [{ kind: "close-socket" }, { kind: "settle" }],
      )
    : undefined;

const handleConnectionInterrupted: CatalogEventHandler = (state, event) =>
  event.kind === "connection-interrupted"
    ? accepted(
        {
          kind: "FAILED",
          context: state.context,
          code: "DEPENDENCY_FAILURE",
          diagnostic: "catalog-socket-close-before-completion",
          retryable: true,
        },
        [{ kind: "settle" }],
      )
    : undefined;

const catalogEventHandlers: readonly CatalogEventHandler[] = [
  handleConnectionEstablished,
  handleConnected,
  handleSubscriptionSynced,
  handleCatalogAction,
  handleFailure,
  handleTimeout,
  handleConnectionInterrupted,
];

export const transitionCatalogState: TransitionCatalogState = (
  state,
  event,
) => {
  if (isTerminal(state)) return ignored(state);
  for (const handler of catalogEventHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};
