export type FolderContext = Readonly<{
  readonly workspaceID: string;
  readonly channel: string;
  readonly folderName: string;
  readonly origin: string;
  readonly actionID: string;
}>;

type FolderFailureCode =
  "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";
export type FolderState =
  | { readonly kind: "CONNECTING"; readonly context: FolderContext }
  | { readonly kind: "CONNECTED"; readonly context: FolderContext }
  | {
      readonly kind: "SUBSCRIBING";
      readonly context: FolderContext;
      readonly subscriptionSyncID: number;
    }
  | {
      readonly kind: "SUBSCRIBED";
      readonly context: FolderContext;
      readonly subscriptionSyncID: number;
    }
  | {
      readonly kind: "MUTATION_SENT";
      readonly context: FolderContext;
      readonly subscriptionSyncID: number;
      readonly mutationSyncID: number;
    }
  | {
      readonly kind: "COMPLETED";
      readonly context: FolderContext;
      readonly folder: Readonly<{ id: string; name: string }>;
    }
  | {
      readonly kind: "FAILED";
      readonly context: FolderContext;
      readonly code: FolderFailureCode;
      readonly diagnostic: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "UNKNOWN_OUTCOME";
      readonly context: FolderContext;
      readonly code: "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";
      readonly diagnostic: string;
      readonly retryable: true;
    };

export type FolderEvent =
  | { readonly kind: "connection-established" }
  | { readonly kind: "connected"; readonly subscriptionSyncID: number }
  | {
      readonly kind: "subscription-synced";
      readonly syncID: number;
      readonly mutationSyncID: number;
    }
  | { readonly kind: "mutation-sent"; readonly mutationSyncID: number }
  | { readonly kind: "mutation-synced"; readonly syncID: number }
  | {
      readonly kind: "folder-completed";
      readonly actionID: string;
      readonly origin?: string;
      readonly channel?: string;
      readonly workspaceID?: string;
      readonly folderID?: string;
      readonly folderName?: string;
    }
  | {
      readonly kind: "error-frame";
      readonly code: "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE";
      readonly diagnostic: string;
    }
  | { readonly kind: "transport-failure"; readonly diagnostic: string }
  | { readonly kind: "connection-interrupted" }
  | { readonly kind: "transport-timeout" };

export type FolderEffect =
  | { readonly kind: "send-subscription"; readonly syncID: number }
  | { readonly kind: "send-mutation"; readonly syncID: number }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type FolderTransition = Readonly<{
  readonly state: FolderState;
  readonly accepted: boolean;
  readonly effects: readonly FolderEffect[];
}>;

type CreateFolderState = (context: FolderContext) => FolderState;
export const createFolderState: CreateFolderState = (context) => ({
  kind: "CONNECTING",
  context,
});

const ignored = (state: FolderState): FolderTransition => ({
  state,
  accepted: false,
  effects: [],
});
const accepted = (
  state: FolderState,
  effects: readonly FolderEffect[] = [],
): FolderTransition => ({ state, accepted: true, effects });
const terminal = (state: FolderState): boolean =>
  ["COMPLETED", "FAILED", "UNKNOWN_OUTCOME"].includes(state.kind);
const isMutationState = (
  state: FolderState,
): state is Extract<FolderState, { readonly kind: "MUTATION_SENT" }> =>
  state.kind === "MUTATION_SENT";
const isScopedCompletion = (
  state: Extract<FolderState, { readonly kind: "MUTATION_SENT" }>,
  event: Extract<FolderEvent, { readonly kind: "folder-completed" }>,
): boolean =>
  event.actionID === state.context.actionID &&
  (event.origin === undefined || event.origin === state.context.origin) &&
  event.channel === state.context.channel &&
  event.workspaceID === state.context.workspaceID;

type FolderEventHandler = (
  state: FolderState,
  event: FolderEvent,
) => FolderTransition | undefined;

const handleConnectionEstablished: FolderEventHandler = (state, event) =>
  event.kind === "connection-established" && state.kind === "CONNECTING"
    ? accepted({ ...state, kind: "CONNECTED" })
    : event.kind === "connection-established"
      ? ignored(state)
      : undefined;

const handleConnected: FolderEventHandler = (state, event) =>
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

const handleSubscriptionSynced: FolderEventHandler = (state, event) => {
  if (event.kind !== "subscription-synced") return undefined;
  if (state.kind !== "SUBSCRIBING" || event.syncID !== state.subscriptionSyncID)
    return ignored(state);
  return accepted({
    kind: "SUBSCRIBED",
    context: state.context,
    subscriptionSyncID: state.subscriptionSyncID,
  });
};

const handleMutationSent: FolderEventHandler = (state, event) =>
  event.kind === "mutation-sent" && state.kind === "SUBSCRIBED"
    ? accepted(
        {
          kind: "MUTATION_SENT",
          context: state.context,
          subscriptionSyncID: state.subscriptionSyncID,
          mutationSyncID: event.mutationSyncID,
        },
        [{ kind: "send-mutation", syncID: event.mutationSyncID }],
      )
    : event.kind === "mutation-sent"
      ? ignored(state)
      : undefined;

const handleMutationSynced: FolderEventHandler = (state, event) => {
  if (event.kind !== "mutation-synced") return undefined;
  if (!isMutationState(state) || event.syncID !== state.mutationSyncID)
    return ignored(state);
  return accepted(state);
};

const handleFolderCompleted: FolderEventHandler = (state, event) => {
  if (event.kind !== "folder-completed") return undefined;
  if (!isMutationState(state) || !isScopedCompletion(state, event))
    return ignored(state);
  if (
    event.folderID === undefined ||
    event.folderName !== state.context.folderName
  )
    return accepted(
      {
        kind: "FAILED",
        context: state.context,
        code: "DEPENDENCY_FAILURE",
        diagnostic: "folder-completion-invalid",
        retryable: true,
      },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );
  return accepted(
    {
      kind: "COMPLETED",
      context: state.context,
      folder: { id: event.folderID, name: event.folderName },
    },
    [{ kind: "close-socket" }, { kind: "settle" }],
  );
};

const handleFailure: FolderEventHandler = (state, event) => {
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

const handleTimeout: FolderEventHandler = (state, event) =>
  event.kind === "transport-timeout"
    ? accepted(
        {
          kind: "UNKNOWN_OUTCOME",
          context: state.context,
          code: "DEPENDENCY_TIMEOUT",
          diagnostic: "folder-operation-timeout",
          retryable: true,
        },
        [{ kind: "close-socket" }, { kind: "settle" }],
      )
    : undefined;

const handleConnectionInterrupted: FolderEventHandler = (state, event) =>
  event.kind === "connection-interrupted"
    ? accepted(
        isMutationState(state)
          ? {
              kind: "UNKNOWN_OUTCOME",
              context: state.context,
              code: "DEPENDENCY_FAILURE",
              diagnostic: "folder-socket-close-after-dispatch",
              retryable: true,
            }
          : {
              kind: "FAILED",
              context: state.context,
              code: "DEPENDENCY_FAILURE",
              diagnostic: "folder-socket-close-before-dispatch",
              retryable: true,
            },
        [{ kind: "settle" }],
      )
    : undefined;

const folderEventHandlers: readonly FolderEventHandler[] = [
  handleConnectionEstablished,
  handleConnected,
  handleSubscriptionSynced,
  handleMutationSent,
  handleMutationSynced,
  handleFolderCompleted,
  handleFailure,
  handleTimeout,
  handleConnectionInterrupted,
];

export const transitionFolderState = (
  state: FolderState,
  event: FolderEvent,
): FolderTransition => {
  if (terminal(state)) return ignored(state);
  for (const handler of folderEventHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};
