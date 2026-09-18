import type {
  AuthContext,
  ExportArtifact,
  ImportedReceipt,
  MigrationPlan,
  MigrationSelection,
  SecretEntry,
} from "./types";
import type { ArchiveCandidate } from "./archive";

export type MigrationStage =
  | "AUTHENTICATION"
  | "EXPORT"
  | "PLANNING"
  | "ARCHIVE_PREFLIGHT"
  | "ARCHIVE"
  | "IMPORT"
  | "SECRET_INPUT"
  | "SECRET_RESOLUTION"
  | "SECRET_CREATION";
export type TerminalMigrationStage =
  "COMPLETED" | "FAILED" | "UNKNOWN_OUTCOME" | "CANCELLED";

export type WorkflowIdentity = Readonly<{
  readonly operationID: string;
  readonly planID: string;
  readonly selection: MigrationSelection;
}>;

/** All mutable workflow results live here; the runner only holds the current reducer state. */
export type MigrationWorkflowFailure = Readonly<{
  readonly code: string;
  readonly retryable: boolean;
  readonly stage: MigrationStage | TerminalMigrationStage;
  readonly diagnostic?: string;
}>;
export type MigrationWorkflowSuccess = Readonly<{
  readonly planID: string;
  readonly exportStatus: number;
  readonly exportBytes: number;
  readonly importStatus: number;
  readonly importBytes: number;
}>;
export type MigrationWorkflowContext = Readonly<{
  readonly auth?: AuthContext;
  readonly artifact?: ExportArtifact;
  readonly plan?: MigrationPlan;
  readonly archive?: ArchiveCandidate;
  readonly imported?: ImportedReceipt;
  readonly secrets?: readonly SecretEntry[];
  readonly terminalFailure?: MigrationWorkflowFailure;
  readonly terminalSuccess?: MigrationWorkflowSuccess;
}>;

export type MigrationWorkflowState = WorkflowIdentity & {
  readonly context: MigrationWorkflowContext;
  readonly stage: MigrationStage | TerminalMigrationStage;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly diagnostic?: string;
};

export type ArchivePreflightEvent =
  | { readonly kind: "archive-not-needed" }
  | { readonly kind: "archive-required"; readonly archive: ArchiveCandidate };

export type SecretResolutionEvent =
  | { readonly kind: "secret-resolution-empty" }
  | {
      readonly kind: "secret-resolution-completed";
      readonly secrets: readonly SecretEntry[];
    };

export type MigrationWorkflowEvent =
  | { readonly kind: "start" }
  | { readonly kind: "authentication-succeeded"; readonly auth: AuthContext }
  | { readonly kind: "export-succeeded"; readonly artifact: ExportArtifact }
  | {
      readonly kind: "plan-succeeded";
      readonly planID: string;
      readonly plan: MigrationPlan;
    }
  | { readonly kind: "plan-mismatch" }
  | ArchivePreflightEvent
  | { readonly kind: "archive-renamed"; readonly archive: ArchiveCandidate }
  | { readonly kind: "archive-durability-confirmed" }
  | {
      readonly kind: "archive-durability-unknown";
      readonly failure: MigrationWorkflowFailure;
    }
  | { readonly kind: "import-succeeded"; readonly imported: ImportedReceipt }
  | { readonly kind: "import-failed"; readonly failure: MigrationWorkflowFailure }
  | { readonly kind: "import-unknown"; readonly failure: MigrationWorkflowFailure }
  | { readonly kind: "secret-input-resolved" }
  | SecretResolutionEvent
  | { readonly kind: "secret-completed"; readonly remaining: number }
  | { readonly kind: "secret-failed"; readonly failure: MigrationWorkflowFailure }
  | { readonly kind: "secret-unknown"; readonly failure: MigrationWorkflowFailure }
  | { readonly kind: "dependency-failure"; readonly failure: MigrationWorkflowFailure }
  | { readonly kind: "timeout" }
  | { readonly kind: "cancellation" }
  | { readonly kind: "late-event" };

export type MigrationWorkflowEffect =
  | { readonly kind: "authenticate" }
  | { readonly kind: "export" }
  | { readonly kind: "plan" }
  | { readonly kind: "load-archive-candidates" }
  | { readonly kind: "rename" }
  | { readonly kind: "confirm-archive-durability" }
  | { readonly kind: "import" }
  | {
      readonly kind: "resolve-secrets";
      readonly phase: "input" | "resolution";
    }
  | { readonly kind: "create-next-secret" }
  | { readonly kind: "abort-active-operation" }
  | { readonly kind: "settle-success" }
  | { readonly kind: "settle-failure" };
export type MigrationWorkflowTransition = Readonly<{
  readonly state: MigrationWorkflowState;
  readonly accepted: boolean;
  readonly effects: readonly MigrationWorkflowEffect[];
}>;

type CreateMigrationWorkflow = (
  identity: WorkflowIdentity,
  context?: MigrationWorkflowContext,
) => MigrationWorkflowState;
export const createMigrationWorkflow: CreateMigrationWorkflow = (
  identity,
  context = {},
) => ({ ...identity, context, stage: "AUTHENTICATION" });

const transition = (
  state: MigrationWorkflowState,
  stage: MigrationStage,
  context: MigrationWorkflowContext,
  effects: readonly MigrationWorkflowEffect[],
): MigrationWorkflowTransition => ({
  state: { ...state, stage, context },
  accepted: true,
  effects,
});
const exportStatus = (state: MigrationWorkflowState): number =>
  state.context.artifact?.status ?? 0;
const exportBytes = (state: MigrationWorkflowState): number =>
  state.context.artifact?.bytes.byteLength ?? 0;
const importStatus = (state: MigrationWorkflowState): number =>
  state.context.imported?.importStatus ?? 0;
const importBytes = (state: MigrationWorkflowState): number =>
  state.context.imported?.importBytes ?? 0;

const successfulTerminalContext = (
  state: MigrationWorkflowState,
): MigrationWorkflowContext => ({
  ...state.context,
  terminalSuccess: {
    planID: state.planID,
    exportStatus: exportStatus(state),
    exportBytes: exportBytes(state),
    importStatus: importStatus(state),
    importBytes: importBytes(state),
  },
});

const failedTerminalContext = (
  state: MigrationWorkflowState,
  code: string,
  retryable: boolean,
  diagnostic?: string,
): MigrationWorkflowContext => ({
  ...state.context,
  terminalFailure: {
    code,
    retryable,
    stage: state.stage,
    diagnostic,
  },
});

const terminalContext = (
  state: MigrationWorkflowState,
  stage: TerminalMigrationStage,
  code: string,
  retryable: boolean,
  diagnostic?: string,
): MigrationWorkflowContext =>
  stage === "COMPLETED"
    ? successfulTerminalContext(state)
    : failedTerminalContext(state, code, retryable, diagnostic);

const terminal = (
  state: MigrationWorkflowState,
  stage: TerminalMigrationStage,
  code: string,
  retryable: boolean,
  diagnostic?: string,
  effects: readonly MigrationWorkflowEffect[] = [{ kind: "settle-failure" }],
): MigrationWorkflowTransition => ({
  state: {
    ...state,
    stage,
    code,
    retryable,
    diagnostic,
    context: terminalContext(state, stage, code, retryable, diagnostic),
  },
  accepted: true,
  effects,
});
const ignored = (
  state: MigrationWorkflowState,
): MigrationWorkflowTransition => ({ state, accepted: false, effects: [] });
const isTerminal = (stage: string): stage is TerminalMigrationStage =>
  ["COMPLETED", "FAILED", "UNKNOWN_OUTCOME", "CANCELLED"].includes(stage);

export type TransitionMigrationWorkflow = (
  state: MigrationWorkflowState,
  event: MigrationWorkflowEvent,
) => MigrationWorkflowTransition;
const cancellation = (
  state: MigrationWorkflowState,
): MigrationWorkflowTransition =>
  terminal(
    state,
    "CANCELLED",
    "INTERNAL_ERROR",
    false,
    "stage=" + state.stage,
    [{ kind: "abort-active-operation" }, { kind: "settle-failure" }],
  );

type UnknownOutcomeEvent =
  | Extract<
      MigrationWorkflowEvent,
      { readonly kind: "archive-durability-unknown" }
    >
  | Extract<MigrationWorkflowEvent, { readonly kind: "import-unknown" }>
  | Extract<MigrationWorkflowEvent, { readonly kind: "secret-failed" }>
  | Extract<MigrationWorkflowEvent, { readonly kind: "secret-unknown" }>;

const acceptsUnknownOutcome = (
  state: MigrationWorkflowState,
  event: UnknownOutcomeEvent,
): boolean => {
  if (event.kind === "archive-durability-unknown")
    return state.stage === "ARCHIVE";
  if (event.kind === "import-unknown") return state.stage === "IMPORT";
  return state.stage === "SECRET_CREATION";
};

const unknownOutcome = (
  state: MigrationWorkflowState,
  event: UnknownOutcomeEvent,
): MigrationWorkflowTransition => {
  if (!acceptsUnknownOutcome(state, event)) return ignored(state);

  return terminal(
    state,
    "UNKNOWN_OUTCOME",
    event.kind === "import-unknown"
      ? "IMPORT_OUTCOME_UNKNOWN"
      : event.kind === "secret-failed" || event.kind === "secret-unknown"
        ? "DEPENDENCY_TIMEOUT"
        : "DEPENDENCY_FAILURE",
    true,
    `stage=${state.stage} ${event.failure.diagnostic ?? "outcome-unknown"}`,
  );
};

const failure = (
  state: MigrationWorkflowState,
  event: Extract<
    MigrationWorkflowEvent,
    { readonly kind: "dependency-failure" | "timeout" | "import-failed" }
  >,
): MigrationWorkflowTransition => {
  const code =
    event.kind === "timeout"
      ? "DEPENDENCY_TIMEOUT"
      : event.kind === "dependency-failure"
        ? event.failure.code
        : "DEPENDENCY_FAILURE";
  return terminal(
    state,
    "FAILED",
    code,
    code !== "AUTHENTICATION_FAILED" && event.kind !== "import-failed",
    `stage=${state.stage} ${event.kind === "timeout" ? "dependency-failure" : event.failure.diagnostic ?? "dependency-failure"}`,
  );
};

const authenticationSucceeded = (
  state: MigrationWorkflowState,
  event: Extract<
    MigrationWorkflowEvent,
    { readonly kind: "authentication-succeeded" }
  >,
): MigrationWorkflowTransition =>
  state.stage === "AUTHENTICATION"
    ? transition(state, "EXPORT", { ...state.context, auth: event.auth }, [
        { kind: "export" },
      ])
    : ignored(state);

const exportSucceeded = (
  state: MigrationWorkflowState,
  event: Extract<MigrationWorkflowEvent, { readonly kind: "export-succeeded" }>,
): MigrationWorkflowTransition =>
  state.stage === "EXPORT"
    ? transition(
        state,
        "PLANNING",
        { ...state.context, artifact: event.artifact },
        [{ kind: "plan" }],
      )
    : ignored(state);

const planSucceeded = (
  state: MigrationWorkflowState,
  event: Extract<MigrationWorkflowEvent, { readonly kind: "plan-succeeded" }>,
): MigrationWorkflowTransition => {
  if (state.stage !== "PLANNING") return ignored(state);
  return event.planID === state.planID
    ? transition(
        state,
        "ARCHIVE_PREFLIGHT",
        { ...state.context, plan: event.plan },
        [{ kind: "load-archive-candidates" }],
      )
    : terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING");
};

const archivePreflightResult = (
  state: MigrationWorkflowState,
  event: Extract<
    MigrationWorkflowEvent,
    { readonly kind: "archive-required" | "archive-not-needed" }
  >,
): MigrationWorkflowTransition => {
  if (state.stage !== "ARCHIVE_PREFLIGHT") return ignored(state);
  return event.kind === "archive-required"
    ? transition(
        state,
        "ARCHIVE",
        { ...state.context, archive: event.archive },
        [{ kind: "rename" }],
      )
    : transition(state, "IMPORT", state.context, [{ kind: "import" }]);
};

const archiveRenamed = (
  state: MigrationWorkflowState,
  event: Extract<MigrationWorkflowEvent, { readonly kind: "archive-renamed" }>,
): MigrationWorkflowTransition =>
  state.stage === "ARCHIVE"
    ? transition(
        state,
        "ARCHIVE",
        { ...state.context, archive: event.archive },
        [{ kind: "confirm-archive-durability" }],
      )
    : ignored(state);

const archiveDurabilityConfirmed = (
  state: MigrationWorkflowState,
): MigrationWorkflowTransition =>
  state.stage === "ARCHIVE"
    ? transition(state, "IMPORT", state.context, [{ kind: "import" }])
    : ignored(state);

const importSucceeded = (
  state: MigrationWorkflowState,
  event: Extract<MigrationWorkflowEvent, { readonly kind: "import-succeeded" }>,
): MigrationWorkflowTransition =>
  state.stage === "IMPORT"
    ? transition(
        state,
        "SECRET_INPUT",
        {
          ...state.context,
          imported: event.imported,
        },
        [{ kind: "resolve-secrets", phase: "input" }],
      )
    : ignored(state);

const secretInputResolved = (
  state: MigrationWorkflowState,
): MigrationWorkflowTransition =>
  state.stage === "SECRET_INPUT"
    ? transition(state, "SECRET_RESOLUTION", state.context, [
        { kind: "resolve-secrets", phase: "resolution" },
      ])
    : ignored(state);

const secretResolutionCompleted = (
  state: MigrationWorkflowState,
  event: Extract<
    MigrationWorkflowEvent,
    { readonly kind: "secret-resolution-empty" | "secret-resolution-completed" }
  >,
): MigrationWorkflowTransition => {
  if (state.stage !== "SECRET_RESOLUTION") return ignored(state);
  return event.kind === "secret-resolution-empty"
    ? terminal(state, "COMPLETED", "", false, undefined, [
        { kind: "settle-success" },
      ])
    : transition(
        state,
        "SECRET_CREATION",
        { ...state.context, secrets: event.secrets },
        [{ kind: "create-next-secret" }],
      );
};

const secretCompleted = (
  state: MigrationWorkflowState,
  event: Extract<MigrationWorkflowEvent, { readonly kind: "secret-completed" }>,
): MigrationWorkflowTransition => {
  if (state.stage !== "SECRET_CREATION") return ignored(state);
  return event.remaining === 0
    ? terminal(state, "COMPLETED", "", false, undefined, [
        { kind: "settle-success" },
      ])
    : transition(state, "SECRET_CREATION", state.context, [
        { kind: "create-next-secret" },
      ]);
};

type MigrationEventHandler = (
  state: MigrationWorkflowState,
  event: MigrationWorkflowEvent,
) => MigrationWorkflowTransition | undefined;

const handleAuthenticationSucceeded: MigrationEventHandler = (state, event) =>
  event.kind === "authentication-succeeded"
    ? authenticationSucceeded(state, event)
    : undefined;
const handleExportSucceeded: MigrationEventHandler = (state, event) =>
  event.kind === "export-succeeded" ? exportSucceeded(state, event) : undefined;
const handlePlanSucceeded: MigrationEventHandler = (state, event) =>
  event.kind === "plan-succeeded" ? planSucceeded(state, event) : undefined;
const handleArchivePreflightResult: MigrationEventHandler = (state, event) =>
  event.kind === "archive-required" || event.kind === "archive-not-needed"
    ? archivePreflightResult(state, event)
    : undefined;
const handleArchiveRenamed: MigrationEventHandler = (state, event) =>
  event.kind === "archive-renamed" ? archiveRenamed(state, event) : undefined;
const handleArchiveDurabilityConfirmed: MigrationEventHandler = (
  state,
  event,
) =>
  event.kind === "archive-durability-confirmed"
    ? archiveDurabilityConfirmed(state)
    : undefined;
const handleUnknownOutcome: MigrationEventHandler = (state, event) =>
  event.kind === "archive-durability-unknown" ||
  event.kind === "import-unknown" ||
  event.kind === "secret-failed" ||
  event.kind === "secret-unknown"
    ? unknownOutcome(state, event)
    : undefined;
const handleImportSucceeded: MigrationEventHandler = (state, event) =>
  event.kind === "import-succeeded" ? importSucceeded(state, event) : undefined;
const handleSecretInputResolved: MigrationEventHandler = (state, event) =>
  event.kind === "secret-input-resolved"
    ? secretInputResolved(state)
    : undefined;
const handleSecretResolutionCompleted: MigrationEventHandler = (
  state,
  event,
) =>
  event.kind === "secret-resolution-empty" ||
  event.kind === "secret-resolution-completed"
    ? secretResolutionCompleted(state, event)
    : undefined;
const handleSecretCompleted: MigrationEventHandler = (state, event) =>
  event.kind === "secret-completed" ? secretCompleted(state, event) : undefined;
const handleCancellation: MigrationEventHandler = (state, event) =>
  event.kind === "cancellation" ? cancellation(state) : undefined;
const handleFailure: MigrationEventHandler = (state, event) =>
  event.kind === "dependency-failure" ||
  event.kind === "timeout" ||
  event.kind === "import-failed"
    ? failure(state, event)
    : undefined;
const handleStart: MigrationEventHandler = (state, event) =>
  event.kind === "start"
    ? state.stage === "AUTHENTICATION"
      ? { state, accepted: true, effects: [{ kind: "authenticate" }] }
      : ignored(state)
    : undefined;
const handlePlanMismatch: MigrationEventHandler = (state, event) =>
  event.kind === "plan-mismatch"
    ? state.stage === "PLANNING"
      ? terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING")
      : ignored(state)
    : undefined;
const handleLateEvent: MigrationEventHandler = (state, event) =>
  event.kind === "late-event" ? ignored(state) : undefined;

const migrationEventHandlers: readonly MigrationEventHandler[] = [
  handleAuthenticationSucceeded,
  handleExportSucceeded,
  handlePlanSucceeded,
  handleArchivePreflightResult,
  handleArchiveRenamed,
  handleArchiveDurabilityConfirmed,
  handleUnknownOutcome,
  handleImportSucceeded,
  handleSecretInputResolved,
  handleSecretResolutionCompleted,
  handleSecretCompleted,
  handleCancellation,
  handleFailure,
  handleStart,
  handlePlanMismatch,
  handleLateEvent,
];

export const transitionMigrationWorkflow: TransitionMigrationWorkflow = (
  state,
  event,
) => {
  if (isTerminal(state.stage)) return ignored(state);
  for (const handler of migrationEventHandlers) {
    const result = handler(state, event);
    if (result !== undefined) return result;
  }
  return ignored(state);
};
