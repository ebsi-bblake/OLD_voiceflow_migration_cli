/* oxlint-disable complexity -- exhaustive protocol state transitions are explicit. */
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
/* oxlint-disable complexity -- exhaustive protocol state transitions are explicit. */
export const transitionRenameState: TransitionRenameState = (state, event) => {
  if (
    state.kind === "COMPLETED" ||
    state.kind === "BYPASSED_NO_COLLISION" ||
    state.kind === "FAILED" ||
    state.kind === "UNKNOWN_OUTCOME"
  )
    return ignored(state);

  if (event.kind === "project-patch") {
    if (
      state.kind !== "MUTATION_SENT" &&
      state.kind !== "MUTATION_ACKNOWLEDGED"
    )
      return ignored(state);
    return event.matches
      ? accepted({ ...state, patchObserved: true })
      : ignored(state);
  }

  if (event.kind === "connection-established" && state.kind === "CONNECTING")
    return accepted({ ...state, kind: "CONNECTED", subscriptionSyncID: 0 });

  if (event.kind === "connected" && state.kind === "CONNECTED")
    return accepted(
      {
        ...state,
        kind: "SUBSCRIBING",
        subscriptionSyncID: event.subscriptionSyncID,
      },
      [{ kind: "send-subscription", syncID: event.subscriptionSyncID }],
    );

  if (
    event.kind === "subscription-synced" &&
    (state.kind === "SUBSCRIBING" || state.kind === "SUBSCRIBED") &&
    event.syncID === state.subscriptionSyncID
  )
    return accepted({ ...state, kind: "SUBSCRIBED" });

  if (event.kind === "mutation-sent" && state.kind === "SUBSCRIBED")
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

  if (
    event.kind === "mutation-synced" &&
    state.kind === "MUTATION_SENT" &&
    event.syncID === state.mutationSyncID
  )
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

  if (event.kind === "catalog-result" && state.kind === "MUTATION_ACKNOWLEDGED")
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
      event.matches
        ? [{ kind: "settle" }]
        : [
            {
              kind: "start-catalog-retry",
              retryCount: event.retryCount,
              deadline: event.deadline,
            },
          ],
    );

  if (event.kind === "catalog-result" && state.kind === "CATALOG_RECONCILING")
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
      event.matches
        ? [{ kind: "settle" }]
        : [
            {
              kind: "start-catalog-retry",
              retryCount: event.retryCount,
              deadline: event.deadline,
            },
          ],
    );

  if (event.kind === "error-frame" || event.kind === "transport-failure")
    return accepted(
      {
        kind: "FAILED",
        context: state.context,
        code: "DEPENDENCY_FAILURE",
        diagnostic: event.diagnostic,
      },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );

  if (event.kind === "transport-timeout")
    return accepted(
      {
        kind: "UNKNOWN_OUTCOME",
        context: state.context,
        code: "DEPENDENCY_TIMEOUT",
        diagnostic: "acknowledgement-timeout",
      },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );

  if (event.kind === "catalog-retry" && state.kind === "CATALOG_RECONCILING")
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

  if (event.kind === "connection-interrupted")
    return accepted(
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
    );

  return ignored(state);
};

export type SecretState =
  | {
      readonly kind: "CONNECTING" | "CONNECTED" | "SUBSCRIBING" | "SUBSCRIBED";
      readonly assistantID: string;
      readonly actionID: string;
    }
  | {
      readonly kind: "MUTATION_SENT";
      readonly assistantID: string;
      readonly actionID: string;
      readonly mutationSyncID: number;
    }
  | {
      readonly kind: "COMPLETED";
      readonly assistantID: string;
      readonly actionID: string;
    }
  | {
      readonly kind: "FAILED" | "UNKNOWN_OUTCOME";
      readonly assistantID: string;
      readonly actionID: string;
      readonly code: "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";
    };

export type SecretEffect =
  | { readonly kind: "send-subscription" }
  | { readonly kind: "send-mutation"; readonly mutationSyncID: number }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type SecretTransition = Readonly<{
  readonly state: SecretState;
  readonly accepted: boolean;
  readonly effects: readonly SecretEffect[];
}>;

export type SecretEvent =
  | { readonly kind: "connection-established" }
  | { readonly kind: "connected" }
  | { readonly kind: "subscription-synced" }
  | { readonly kind: "mutation-sent"; readonly mutationSyncID: number }
  | { readonly kind: "secret-done"; readonly actionID: string }
  | { readonly kind: "error-frame" }
  | { readonly kind: "transport-failure" }
  | { readonly kind: "connection-interrupted" }
  | { readonly kind: "transport-timeout" };

type TransitionSecretState = (
  state: SecretState,
  event: SecretEvent,
) => SecretState;
export const transitionSecretStateWithEffects = (
  state: SecretState,
  event: SecretEvent,
): SecretTransition => {
  if (
    state.kind === "COMPLETED" ||
    state.kind === "FAILED" ||
    state.kind === "UNKNOWN_OUTCOME"
  )
    return { state, accepted: false, effects: [] };
  if (event.kind === "connection-established" && state.kind === "CONNECTING")
    return {
      state: { ...state, kind: "CONNECTED" },
      accepted: true,
      effects: [],
    };
  if (event.kind === "connected" && state.kind === "CONNECTED")
    return {
      state: { ...state, kind: "SUBSCRIBING" },
      accepted: true,
      effects: [{ kind: "send-subscription" }],
    };
  if (event.kind === "subscription-synced" && state.kind === "SUBSCRIBING")
    return {
      state: { ...state, kind: "SUBSCRIBED" },
      accepted: true,
      effects: [],
    };
  if (event.kind === "mutation-sent" && state.kind === "SUBSCRIBED")
    return {
      state: {
        ...state,
        kind: "MUTATION_SENT",
        mutationSyncID: event.mutationSyncID,
      },
      accepted: true,
      effects: [
        { kind: "send-mutation", mutationSyncID: event.mutationSyncID },
      ],
    };
  if (
    event.kind === "secret-done" &&
    state.kind === "MUTATION_SENT" &&
    event.actionID === state.actionID
  )
    return {
      state: {
        kind: "COMPLETED",
        assistantID: state.assistantID,
        actionID: state.actionID,
      },
      accepted: true,
      effects: [{ kind: "close-socket" }, { kind: "settle" }],
    };
  if (event.kind === "error-frame" || event.kind === "transport-failure")
    return {
      state: { ...state, kind: "FAILED", code: "DEPENDENCY_FAILURE" },
      accepted: true,
      effects: [{ kind: "close-socket" }, { kind: "settle" }],
    };
  if (event.kind === "connection-interrupted")
    return {
      state: {
        ...state,
        kind: state.kind === "MUTATION_SENT" ? "UNKNOWN_OUTCOME" : "FAILED",
        code: "DEPENDENCY_FAILURE",
      },
      accepted: true,
      effects: [{ kind: "settle" }],
    };
  if (event.kind === "transport-timeout")
    return {
      state: { ...state, kind: "UNKNOWN_OUTCOME", code: "DEPENDENCY_TIMEOUT" },
      accepted: true,
      effects: [{ kind: "close-socket" }, { kind: "settle" }],
    };
  return { state, accepted: false, effects: [] };
};
export const transitionSecretState: TransitionSecretState = (state, event) =>
  transitionSecretStateWithEffects(state, event).state;

export type CreateSecretState = (
  assistantID: string,
  actionID: string,
) => SecretState;
export const createSecretState: CreateSecretState = (
  assistantID,
  actionID,
) => ({
  kind: "CONNECTING",
  assistantID,
  actionID,
});
