export type RenameDurabilityContext = Readonly<{
  readonly projectID: string;
  readonly workspaceID: string;
  readonly folderID: string;
  readonly name: string;
}>;

type FailureCode =
  | "AUTHENTICATION_FAILED"
  | "DEPENDENCY_FAILURE"
  | "DEPENDENCY_TIMEOUT"
  | "INVALID_ARGUMENT"
  | "NOT_FOUND";
export type RenameDurabilityState =
  | { readonly kind: "READY"; readonly context: RenameDurabilityContext }
  | {
      readonly kind: "ATTEMPTING";
      readonly context: RenameDurabilityContext;
      readonly attempt: number;
      readonly attemptID: string;
      readonly limit: number;
      readonly deadline: number;
    }
  | {
      readonly kind: "WAITING_TO_RETRY";
      readonly context: RenameDurabilityContext;
      readonly attempt: number;
      readonly attemptID: string;
      readonly nextRetryDeadline: number;
      readonly limit: number;
      readonly deadline: number;
    }
  | {
      readonly kind: "CONFIRMED";
      readonly context: RenameDurabilityContext;
      readonly project: Readonly<{
        id: string;
        workspaceID: string;
        folderID: string;
        name: string;
      }>;
    }
  | {
      readonly kind: "FAILED";
      readonly context: RenameDurabilityContext;
      readonly code: FailureCode;
      readonly diagnostic: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "EXHAUSTED";
      readonly context: RenameDurabilityContext;
      readonly diagnostic: string;
      readonly retryable: true;
    }
  | {
      readonly kind: "CANCELLED";
      readonly context: RenameDurabilityContext;
      readonly diagnostic: string;
      readonly retryable: false;
    };

export type RenameDurabilityEvent =
  | {
      readonly kind: "start-attempt";
      readonly attempt: number;
      readonly attemptID: string;
      readonly limit: number;
      readonly deadline: number;
    }
  | {
      readonly kind: "catalog-result";
      readonly attemptID: string;
      readonly project?: Readonly<{
        id: string;
        workspaceID: string;
        folderID: string;
        name: string;
      }>;
      readonly matches: boolean;
    }
  | {
      readonly kind: "transient-failure";
      readonly attemptID: string;
      readonly diagnostic: string;
    }
  | {
      readonly kind: "permanent-failure";
      readonly code: FailureCode;
      readonly diagnostic: string;
      readonly retryable: boolean;
    }
  | {
      readonly kind: "retry-timer";
      readonly attemptID: string;
      readonly nextAttemptID: string;
      readonly deadline: number;
    }
  | { readonly kind: "timer-failure"; readonly diagnostic: string }
  | { readonly kind: "cancel" };

export type RenameDurabilityTransition = Readonly<{
  readonly state: RenameDurabilityState;
  readonly accepted: boolean;
}>;

type CreateRenameDurabilityState = (
  context: RenameDurabilityContext,
) => RenameDurabilityState;
export const createRenameDurabilityState: CreateRenameDurabilityState = (
  context,
) => ({ kind: "READY", context });
const terminal = (state: RenameDurabilityState): boolean =>
  ["CONFIRMED", "FAILED", "EXHAUSTED", "CANCELLED"].includes(state.kind);
const ignored = (state: RenameDurabilityState): RenameDurabilityTransition => ({
  state,
  accepted: false,
});
const accepted = (
  state: RenameDurabilityState,
): RenameDurabilityTransition => ({ state, accepted: true });

type RenameDurabilityEventHandler = (
  state: RenameDurabilityState,
  event: RenameDurabilityEvent,
) => RenameDurabilityTransition | undefined;

const handleStartAttempt: RenameDurabilityEventHandler = (state, event) => {
  if (event.kind !== "start-attempt") return undefined;
  if (state.kind !== "READY" && state.kind !== "WAITING_TO_RETRY")
    return ignored(state);
  return accepted({
    kind: "ATTEMPTING",
    context: state.context,
    attempt: event.attempt,
    attemptID: event.attemptID,
    limit: event.limit,
    deadline: event.deadline,
  });
};

const handleCatalogResult: RenameDurabilityEventHandler = (state, event) => {
  if (event.kind !== "catalog-result") return undefined;
  if (state.kind !== "ATTEMPTING" || event.attemptID !== state.attemptID)
    return ignored(state);
  return event.matches && event.project !== undefined
    ? accepted({
        kind: "CONFIRMED",
        context: state.context,
        project: event.project,
      })
    : ignored(state);
};

const handleTransientFailure: RenameDurabilityEventHandler = (state, event) => {
  if (event.kind !== "transient-failure") return undefined;
  if (state.kind !== "ATTEMPTING" || event.attemptID !== state.attemptID)
    return ignored(state);
  return ignored(state);
};

const handlePermanentFailure: RenameDurabilityEventHandler = (state, event) =>
  event.kind === "permanent-failure" && state.kind === "ATTEMPTING"
    ? accepted({
        kind: "FAILED",
        context: state.context,
        code: event.code,
        diagnostic: event.diagnostic,
        retryable: event.retryable,
      })
    : event.kind === "permanent-failure"
      ? ignored(state)
      : undefined;

const handleRetryTimer: RenameDurabilityEventHandler = (state, event) => {
  if (event.kind !== "retry-timer") return undefined;
  if (state.kind !== "WAITING_TO_RETRY" || event.attemptID !== state.attemptID)
    return ignored(state);
  return accepted({
    kind: "ATTEMPTING",
    context: state.context,
    attempt: state.attempt + 1,
    attemptID: event.nextAttemptID,
    limit: state.limit,
    deadline: state.deadline,
  });
};

const handleTimerFailure: RenameDurabilityEventHandler = (state, event) =>
  event.kind === "timer-failure" && state.kind === "WAITING_TO_RETRY"
    ? accepted({
        kind: "FAILED",
        context: state.context,
        code: "DEPENDENCY_FAILURE",
        diagnostic: event.diagnostic,
        retryable: true,
      })
    : event.kind === "timer-failure"
      ? ignored(state)
      : undefined;

const handleCancel: RenameDurabilityEventHandler = (state, event) =>
  event.kind === "cancel"
    ? accepted({
        kind: "CANCELLED",
        context: state.context,
        diagnostic: "rename-durability-cancelled",
        retryable: false,
      })
    : undefined;

const renameDurabilityHandlers: readonly RenameDurabilityEventHandler[] = [
  handleStartAttempt,
  handleCatalogResult,
  handleTransientFailure,
  handlePermanentFailure,
  handleRetryTimer,
  handleTimerFailure,
  handleCancel,
];

export const transitionRenameDurability = (
  state: RenameDurabilityState,
  event: RenameDurabilityEvent,
): RenameDurabilityTransition => {
  if (terminal(state)) return ignored(state);
  for (const handler of renameDurabilityHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};

export const scheduleRenameDurabilityRetry = (
  state: Extract<RenameDurabilityState, { readonly kind: "ATTEMPTING" }>,
  nextRetryDeadline: number,
): RenameDurabilityState => ({
  kind: "WAITING_TO_RETRY",
  context: state.context,
  attempt: state.attempt,
  attemptID: state.attemptID,
  nextRetryDeadline,
  limit: state.limit,
  deadline: state.deadline,
});

export const exhaustRenameDurability = (
  state: Extract<RenameDurabilityState, { readonly kind: "ATTEMPTING" }>,
  diagnostic: string,
): RenameDurabilityState => ({
  kind: "EXHAUSTED",
  context: state.context,
  diagnostic,
  retryable: true,
});
