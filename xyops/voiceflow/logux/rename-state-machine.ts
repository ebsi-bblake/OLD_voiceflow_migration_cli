export type RenameState =
  | {
      readonly kind: "CONNECTING";
      readonly context: RenameStateContext;
    }
  | {
      readonly kind: "CONNECTED" | "SUBSCRIBING" | "SUBSCRIBED";
      readonly context: RenameStateContext;
      readonly subscriptionSyncID: number;
    }
  | {
      readonly kind: "MUTATION_SENT";
      readonly context: RenameStateContext;
      readonly subscriptionSyncID: number;
      readonly mutationSyncID: number;
      readonly actionID: string;
      readonly patchObserved: boolean;
    }
  | {
      readonly kind: "MUTATION_ACKNOWLEDGED";
      readonly context: RenameStateContext;
      readonly mutationSyncID: number;
      readonly actionID: string;
      readonly patchObserved: boolean;
    }
  | {
      readonly kind: "CATALOG_RECONCILING";
      readonly context: RenameStateContext;
      readonly retryCount: number;
      readonly retryLimit: number;
      readonly deadline: number;
      readonly patchObserved: boolean;
    }
  | {
      readonly kind: "COMPLETED";
      readonly context: RenameStateContext;
      readonly patchObserved: boolean;
    }
  | {
      readonly kind: "BYPASSED_NO_COLLISION";
      readonly context: RenameStateContext;
    }
  | {
      readonly kind: "FAILED" | "UNKNOWN_OUTCOME";
      readonly context: RenameStateContext;
      readonly code: "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";
      readonly diagnostic?: string;
    };

export type RenameStateContext = Readonly<{
  readonly workspaceID: string;
  readonly projectID: string;
  readonly folderID: string;
  readonly requestedName: string;
  readonly origin: string;
}>;

export type RenameEvent =
  | { readonly kind: "connection-established" }
  | { readonly kind: "connected"; readonly subscriptionSyncID: number }
  | { readonly kind: "subscription-synced"; readonly syncID: number }
  | {
      readonly kind: "mutation-sent";
      readonly mutationSyncID: number;
      readonly actionID: string;
    }
  | { readonly kind: "mutation-synced"; readonly syncID: number }
  | { readonly kind: "project-patch"; readonly matches: boolean }
  | {
      readonly kind: "catalog-retry";
      readonly retryCount: number;
      readonly deadline: number;
    }
  | {
      readonly kind: "catalog-result";
      readonly matches: boolean;
      readonly retryCount: number;
      readonly retryLimit: number;
      readonly deadline: number;
    }
  | { readonly kind: "error-frame"; readonly diagnostic?: string }
  | { readonly kind: "transport-failure"; readonly diagnostic?: string }
  | { readonly kind: "connection-interrupted" }
  | { readonly kind: "transport-timeout" };

export type RenameEffect =
  | { readonly kind: "send-subscription"; readonly syncID: number }
  | {
      readonly kind: "send-mutation";
      readonly syncID: number;
      readonly actionID: string;
    }
  | {
      readonly kind: "start-catalog-retry";
      readonly retryCount: number;
      readonly deadline: number;
    }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type RenameTransition = Readonly<{
  readonly state: RenameState;
  readonly accepted: boolean;
  readonly effects: readonly RenameEffect[];
}>;

type CreateRenameState = (context: RenameStateContext) => RenameState;
export const createRenameState: CreateRenameState = (context) => ({
  kind: "CONNECTING",
  context,
});

const accepted = (
  state: RenameState,
  effects: readonly RenameEffect[] = [],
): RenameTransition => ({ state, accepted: true, effects });
const ignored = (state: RenameState): RenameTransition => ({
  state,
  accepted: false,
  effects: [],
});

export type BypassRename = (context: RenameStateContext) => RenameState;
export const bypassRename: BypassRename = (context) => ({
  kind: "BYPASSED_NO_COLLISION",
  context,
});

type TransitionRenameState = (
  state: RenameState,
  event: RenameEvent,
) => RenameTransition;

type RenameEventHandler = (
  state: RenameState,
  event: RenameEvent,
) => RenameTransition | undefined;

const isTerminal = (state: RenameState): boolean =>
  state.kind === "COMPLETED" ||
  state.kind === "BYPASSED_NO_COLLISION" ||
  state.kind === "FAILED" ||
  state.kind === "UNKNOWN_OUTCOME";

const handleProjectPatch: RenameEventHandler = (state, event) => {
  if (event.kind !== "project-patch") return undefined;
  if (state.kind !== "MUTATION_SENT" && state.kind !== "MUTATION_ACKNOWLEDGED")
    return ignored(state);
  return event.matches
    ? accepted({ ...state, patchObserved: true })
    : ignored(state);
};

const handleConnectionEstablished: RenameEventHandler = (state, event) =>
  event.kind === "connection-established" && state.kind === "CONNECTING"
    ? accepted({ ...state, kind: "CONNECTED", subscriptionSyncID: 0 })
    : undefined;

const handleConnected: RenameEventHandler = (state, event) =>
  event.kind === "connected" && state.kind === "CONNECTED"
    ? accepted(
        {
          ...state,
          kind: "SUBSCRIBING",
          subscriptionSyncID: event.subscriptionSyncID,
        },
        [{ kind: "send-subscription", syncID: event.subscriptionSyncID }],
      )
    : undefined;

const handleSubscriptionSynced: RenameEventHandler = (state, event) => {
  if (event.kind !== "subscription-synced") return undefined;
  if (
    (state.kind !== "SUBSCRIBING" && state.kind !== "SUBSCRIBED") ||
    event.syncID !== state.subscriptionSyncID
  )
    return ignored(state);
  return accepted({ ...state, kind: "SUBSCRIBED" });
};

const handleMutationSent: RenameEventHandler = (state, event) => {
  if (event.kind !== "mutation-sent") return undefined;
  if (state.kind !== "SUBSCRIBED") return ignored(state);
  return accepted(
    {
      kind: "MUTATION_SENT",
      context: state.context,
      subscriptionSyncID: state.subscriptionSyncID,
      mutationSyncID: event.mutationSyncID,
      actionID: event.actionID,
      patchObserved: false,
    },
    [
      {
        kind: "send-mutation",
        syncID: event.mutationSyncID,
        actionID: event.actionID,
      },
    ],
  );
};

const handleMutationSynced: RenameEventHandler = (state, event) => {
  if (event.kind !== "mutation-synced") return undefined;
  if (state.kind !== "MUTATION_SENT" || event.syncID !== state.mutationSyncID)
    return ignored(state);
  return accepted(
    {
      kind: "MUTATION_ACKNOWLEDGED",
      context: state.context,
      mutationSyncID: state.mutationSyncID,
      actionID: state.actionID,
      patchObserved: state.patchObserved,
    },
    [{ kind: "close-socket" }, { kind: "settle" }],
  );
};

const catalogEffects = (
  event: Extract<RenameEvent, { readonly kind: "catalog-result" }>,
): readonly RenameEffect[] =>
  event.matches
    ? [{ kind: "settle" }]
    : [
        {
          kind: "start-catalog-retry",
          retryCount: event.retryCount,
          deadline: event.deadline,
        },
      ];

const handleCatalogResult: RenameEventHandler = (state, event) => {
  if (event.kind !== "catalog-result") return undefined;
  if (state.kind === "MUTATION_ACKNOWLEDGED")
    return accepted(
      event.matches
        ? {
            kind: "COMPLETED",
            context: state.context,
            patchObserved: state.patchObserved,
          }
        : {
            kind: "CATALOG_RECONCILING",
            context: state.context,
            retryCount: event.retryCount,
            retryLimit: event.retryLimit,
            deadline: event.deadline,
            patchObserved: state.patchObserved,
          },
      catalogEffects(event),
    );
  if (state.kind !== "CATALOG_RECONCILING") return ignored(state);
  return accepted(
    event.matches
      ? {
          kind: "COMPLETED",
          context: state.context,
          patchObserved: state.patchObserved,
        }
      : {
          ...state,
          retryCount: event.retryCount,
          retryLimit: event.retryLimit,
          deadline: event.deadline,
        },
    catalogEffects(event),
  );
};

const handleFailure: RenameEventHandler = (state, event) => {
  if (event.kind !== "error-frame" && event.kind !== "transport-failure")
    return undefined;
  return accepted(
    {
      kind: "FAILED",
      context: state.context,
      code: "DEPENDENCY_FAILURE",
      diagnostic: event.diagnostic,
    },
    [{ kind: "close-socket" }, { kind: "settle" }],
  );
};

const handleTimeout: RenameEventHandler = (state, event) =>
  event.kind === "transport-timeout"
    ? accepted(
        {
          kind: "UNKNOWN_OUTCOME",
          context: state.context,
          code: "DEPENDENCY_TIMEOUT",
          diagnostic: "acknowledgement-timeout",
        },
        [{ kind: "close-socket" }, { kind: "settle" }],
      )
    : undefined;

const handleCatalogRetry: RenameEventHandler = (state, event) => {
  if (event.kind !== "catalog-retry") return undefined;
  if (state.kind !== "CATALOG_RECONCILING") return ignored(state);
  return accepted(
    {
      ...state,
      retryCount: event.retryCount,
      deadline: event.deadline,
    },
    [
      {
        kind: "start-catalog-retry",
        retryCount: event.retryCount,
        deadline: event.deadline,
      },
    ],
  );
};

const handleConnectionInterrupted: RenameEventHandler = (state, event) =>
  event.kind === "connection-interrupted"
    ? accepted(
        {
          kind: state.kind === "MUTATION_SENT" ? "UNKNOWN_OUTCOME" : "FAILED",
          context: state.context,
          code: "DEPENDENCY_FAILURE",
          diagnostic:
            state.kind === "MUTATION_SENT"
              ? "socket-close-after-dispatch"
              : "socket-close-before-dispatch",
        },
        [{ kind: "settle" }],
      )
    : undefined;

const renameEventHandlers: readonly RenameEventHandler[] = [
  handleProjectPatch,
  handleConnectionEstablished,
  handleConnected,
  handleSubscriptionSynced,
  handleMutationSent,
  handleMutationSynced,
  handleCatalogResult,
  handleFailure,
  handleTimeout,
  handleCatalogRetry,
  handleConnectionInterrupted,
];

export const transitionRenameState: TransitionRenameState = (state, event) => {
  if (isTerminal(state)) return ignored(state);
  for (const handler of renameEventHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};
