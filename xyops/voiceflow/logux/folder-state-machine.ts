/* oxlint-disable complexity -- exhaustive folder protocol transitions. */
export type FolderContext = Readonly<{
  readonly workspaceID: string;
  readonly channel: string;
  readonly folderName: string;
  readonly origin: string;
  readonly actionID: string;
}>;

type FolderFailureCode = "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT";
export type FolderState =
  | { readonly kind: "CONNECTING"; readonly context: FolderContext }
  | { readonly kind: "CONNECTED"; readonly context: FolderContext }
  | { readonly kind: "SUBSCRIBING"; readonly context: FolderContext; readonly subscriptionSyncID: number }
  | { readonly kind: "SUBSCRIBED"; readonly context: FolderContext; readonly subscriptionSyncID: number }
  | {
      readonly kind: "MUTATION_SENT";
      readonly context: FolderContext;
      readonly subscriptionSyncID: number;
      readonly mutationSyncID: number;
    }
  | { readonly kind: "COMPLETED"; readonly context: FolderContext; readonly folder: Readonly<{ id: string; name: string }> }
  | { readonly kind: "FAILED"; readonly context: FolderContext; readonly code: FolderFailureCode; readonly diagnostic: string; readonly retryable: boolean }
  | { readonly kind: "UNKNOWN_OUTCOME"; readonly context: FolderContext; readonly code: "DEPENDENCY_FAILURE" | "DEPENDENCY_TIMEOUT"; readonly diagnostic: string; readonly retryable: true };

export type FolderEvent =
  | { readonly kind: "socket-open" }
  | { readonly kind: "connected"; readonly subscriptionSyncID: number }
  | { readonly kind: "subscription-synced"; readonly syncID: number; readonly mutationSyncID: number }
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
  | { readonly kind: "error-frame"; readonly code: "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE"; readonly diagnostic: string }
  | { readonly kind: "socket-error"; readonly diagnostic: string }
  | { readonly kind: "socket-close" }
  | { readonly kind: "timeout" };

export type FolderEffect =
  | { readonly kind: "send-subscription"; readonly syncID: number }
  | { readonly kind: "send-mutation"; readonly syncID: number }
  | { readonly kind: "close-socket" }
  | { readonly kind: "settle" };

export type FolderTransition = Readonly<{ readonly state: FolderState; readonly effects: readonly FolderEffect[] }>;

type CreateFolderState = (context: FolderContext) => FolderState;
export const createFolderState: CreateFolderState = (context) => ({ kind: "CONNECTING", context });

const ignored = (state: FolderState): FolderTransition => ({ state, effects: [] });
const accepted = (state: FolderState, effects: readonly FolderEffect[] = []): FolderTransition => ({ state, effects });
const terminal = (state: FolderState): boolean => ["COMPLETED", "FAILED", "UNKNOWN_OUTCOME"].includes(state.kind);
const isMutationState = (state: FolderState): state is Extract<FolderState, { readonly kind: "MUTATION_SENT" }> => state.kind === "MUTATION_SENT";
const isScopedCompletion = (
  state: Extract<FolderState, { readonly kind: "MUTATION_SENT" }>,
  event: Extract<FolderEvent, { readonly kind: "folder-completed" }>,
): boolean =>
  event.actionID === state.context.actionID &&
  event.origin === state.context.origin &&
  event.channel === state.context.channel &&
  event.workspaceID === state.context.workspaceID;

export const transitionFolderState = (state: FolderState, event: FolderEvent): FolderTransition => {
  if (terminal(state)) return ignored(state);
  if (event.kind === "socket-open" && state.kind === "CONNECTING")
    return accepted({ ...state, kind: "CONNECTED" });
  if (event.kind === "connected" && state.kind === "CONNECTED")
    return accepted(
      { ...state, kind: "SUBSCRIBING", subscriptionSyncID: event.subscriptionSyncID },
      [{ kind: "send-subscription", syncID: event.subscriptionSyncID }],
    );
  if (event.kind === "subscription-synced" && state.kind === "SUBSCRIBING" && event.syncID === state.subscriptionSyncID)
    return accepted({ kind: "SUBSCRIBED", context: state.context, subscriptionSyncID: state.subscriptionSyncID });
  if (event.kind === "mutation-sent" && state.kind === "SUBSCRIBED")
    return accepted(
      { kind: "MUTATION_SENT", context: state.context, subscriptionSyncID: state.subscriptionSyncID, mutationSyncID: event.mutationSyncID },
      [{ kind: "send-mutation", syncID: event.mutationSyncID }],
    );
  if (event.kind === "mutation-synced" && isMutationState(state))
    return event.syncID === state.mutationSyncID ? accepted(state) : ignored(state);
  if (event.kind === "folder-completed" && isMutationState(state)) {
    if (!isScopedCompletion(state, event)) return ignored(state);
    if (event.folderID === undefined || event.folderName !== state.context.folderName)
      return accepted(
        { kind: "FAILED", context: state.context, code: "DEPENDENCY_FAILURE", diagnostic: "folder-completion-invalid", retryable: true },
        [{ kind: "close-socket" }, { kind: "settle" }],
      );
    return accepted(
      { kind: "COMPLETED", context: state.context, folder: { id: event.folderID, name: event.folderName } },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );
  }
  if (event.kind === "error-frame" || event.kind === "socket-error")
    return accepted(
      { kind: "FAILED", context: state.context, code: event.kind === "error-frame" ? event.code : "DEPENDENCY_FAILURE", diagnostic: event.diagnostic, retryable: event.kind !== "error-frame" || event.code !== "AUTHENTICATION_FAILED" },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );
  if (event.kind === "timeout")
    return accepted(
      { kind: "UNKNOWN_OUTCOME", context: state.context, code: "DEPENDENCY_TIMEOUT", diagnostic: "folder-operation-timeout", retryable: true },
      [{ kind: "close-socket" }, { kind: "settle" }],
    );
  if (event.kind === "socket-close")
    return accepted(
      isMutationState(state)
        ? { kind: "UNKNOWN_OUTCOME", context: state.context, code: "DEPENDENCY_FAILURE", diagnostic: "folder-socket-close-after-dispatch", retryable: true }
        : { kind: "FAILED", context: state.context, code: "DEPENDENCY_FAILURE", diagnostic: "folder-socket-close-before-dispatch", retryable: true },
      [{ kind: "settle" }],
    );
  return ignored(state);
};
