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

type SecretEventHandler = (
  state: SecretState,
  event: SecretEvent,
) => SecretTransition | undefined;

const isTerminal = (state: SecretState): boolean =>
  state.kind === "COMPLETED" ||
  state.kind === "FAILED" ||
  state.kind === "UNKNOWN_OUTCOME";

const handleConnectionEstablished: SecretEventHandler = (state, event) =>
  event.kind === "connection-established" && state.kind === "CONNECTING"
    ? { state: { ...state, kind: "CONNECTED" }, accepted: true, effects: [] }
    : undefined;

const handleConnected: SecretEventHandler = (state, event) =>
  event.kind === "connected" && state.kind === "CONNECTED"
    ? {
        state: { ...state, kind: "SUBSCRIBING" },
        accepted: true,
        effects: [{ kind: "send-subscription" }],
      }
    : undefined;

const handleSubscriptionSynced: SecretEventHandler = (state, event) =>
  event.kind === "subscription-synced" && state.kind === "SUBSCRIBING"
    ? {
        state: { ...state, kind: "SUBSCRIBED" },
        accepted: true,
        effects: [],
      }
    : undefined;

const handleMutationSent: SecretEventHandler = (state, event) =>
  event.kind === "mutation-sent" && state.kind === "SUBSCRIBED"
    ? {
        state: {
          ...state,
          kind: "MUTATION_SENT",
          mutationSyncID: event.mutationSyncID,
        },
        accepted: true,
        effects: [
          { kind: "send-mutation", mutationSyncID: event.mutationSyncID },
        ],
      }
    : undefined;

const handleSecretDone: SecretEventHandler = (state, event) => {
  if (
    event.kind !== "secret-done" ||
    state.kind !== "MUTATION_SENT" ||
    event.actionID !== state.actionID
  )
    return event.kind === "secret-done"
      ? { state, accepted: false, effects: [] }
      : undefined;
  return {
    state: {
      kind: "COMPLETED",
      assistantID: state.assistantID,
      actionID: state.actionID,
    },
    accepted: true,
    effects: [{ kind: "close-socket" }, { kind: "settle" }],
  };
};

const handleFailure: SecretEventHandler = (state, event) =>
  event.kind === "error-frame" || event.kind === "transport-failure"
    ? {
        state: { ...state, kind: "FAILED", code: "DEPENDENCY_FAILURE" },
        accepted: true,
        effects: [{ kind: "close-socket" }, { kind: "settle" }],
      }
    : undefined;

const handleConnectionInterrupted: SecretEventHandler = (state, event) =>
  event.kind === "connection-interrupted"
    ? {
        state: {
          ...state,
          kind: state.kind === "MUTATION_SENT" ? "UNKNOWN_OUTCOME" : "FAILED",
          code: "DEPENDENCY_FAILURE",
        },
        accepted: true,
        effects: [{ kind: "settle" }],
      }
    : undefined;

const handleTimeout: SecretEventHandler = (state, event) =>
  event.kind === "transport-timeout"
    ? {
        state: {
          ...state,
          kind: "UNKNOWN_OUTCOME",
          code: "DEPENDENCY_TIMEOUT",
        },
        accepted: true,
        effects: [{ kind: "close-socket" }, { kind: "settle" }],
      }
    : undefined;

const secretEventHandlers: readonly SecretEventHandler[] = [
  handleConnectionEstablished,
  handleConnected,
  handleSubscriptionSynced,
  handleMutationSent,
  handleSecretDone,
  handleFailure,
  handleConnectionInterrupted,
  handleTimeout,
];

export const transitionSecretStateWithEffects = (
  state: SecretState,
  event: SecretEvent,
): SecretTransition => {
  if (isTerminal(state)) return { state, accepted: false, effects: [] };
  for (const handler of secretEventHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
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
