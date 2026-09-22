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

type EventFromMap<Map extends Record<string, object>> = {
  [Kind in keyof Map]: { readonly kind: Kind } & Map[Kind];
}[keyof Map];

export type MigrationWorkflowEventMap = {
  start: Record<never, never>;
  "authentication-succeeded": { readonly auth: AuthContext };
  "export-succeeded": { readonly artifact: ExportArtifact };
  "plan-succeeded": {
    readonly planID: string;
    readonly plan: MigrationPlan;
  };
  "plan-mismatch": Record<never, never>;
  "archive-not-needed": Record<never, never>;
  "archive-required": { readonly archive: ArchiveCandidate };
  "archive-renamed": { readonly archive: ArchiveCandidate };
  "archive-durability-confirmed": Record<never, never>;
  "archive-durability-unknown": { readonly failure: MigrationWorkflowFailure };
  "import-succeeded": { readonly imported: ImportedReceipt };
  "import-failed": { readonly failure: MigrationWorkflowFailure };
  "import-unknown": { readonly failure: MigrationWorkflowFailure };
  "secret-input-resolved": Record<never, never>;
  "secret-resolution-empty": Record<never, never>;
  "secret-resolution-completed": { readonly secrets: readonly SecretEntry[] };
  "secret-completed": { readonly remaining: number };
  "secret-failed": { readonly failure: MigrationWorkflowFailure };
  "secret-unknown": { readonly failure: MigrationWorkflowFailure };
  "dependency-failure": { readonly failure: MigrationWorkflowFailure };
  timeout: Record<never, never>;
  cancellation: Record<never, never>;
  "late-event": Record<never, never>;
};
export type MigrationWorkflowEvent = EventFromMap<MigrationWorkflowEventMap>;

export type MigrationWorkflowEffectMap = {
  authenticate: Record<never, never>;
  export: Record<never, never>;
  plan: Record<never, never>;
  "load-archive-candidates": Record<never, never>;
  rename: Record<never, never>;
  "confirm-archive-durability": Record<never, never>;
  import: Record<never, never>;
  "resolve-secrets": { readonly phase: "input" | "resolution" };
  "create-next-secret": Record<never, never>;
  "abort-active-operation": Record<never, never>;
  "settle-success": Record<never, never>;
  "settle-failure": Record<never, never>;
};
export type MigrationWorkflowEffect = EventFromMap<MigrationWorkflowEffectMap>;

type ContextWith<Required extends object> = MigrationWorkflowContext & Required;
type MigrationStageContext = {
  AUTHENTICATION: MigrationWorkflowContext;
  EXPORT: ContextWith<{ readonly auth: AuthContext }>;
  PLANNING: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
  }>;
  ARCHIVE_PREFLIGHT: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
  }>;
  ARCHIVE: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
    readonly archive: ArchiveCandidate;
  }>;
  IMPORT: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
  }>;
  SECRET_INPUT: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
    readonly imported: ImportedReceipt;
  }>;
  SECRET_RESOLUTION: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
    readonly imported: ImportedReceipt;
  }>;
  SECRET_CREATION: ContextWith<{
    readonly auth: AuthContext;
    readonly artifact: ExportArtifact;
    readonly plan: MigrationPlan;
    readonly imported: ImportedReceipt;
    readonly secrets: readonly SecretEntry[];
  }>;
};
type MigrationWorkflowStateFor<Stage extends MigrationStage> =
  WorkflowIdentity & {
    readonly stage: Stage;
    readonly context: MigrationStageContext[Stage];
    readonly code?: string;
    readonly retryable?: boolean;
    readonly diagnostic?: string;
  };
type CompletedMigrationState = WorkflowIdentity & {
  readonly stage: "COMPLETED";
  readonly context: ContextWith<{
    readonly terminalSuccess: MigrationWorkflowSuccess;
  }>;
  readonly code: string;
  readonly retryable: boolean;
  readonly diagnostic?: string;
};
type FailedMigrationState = WorkflowIdentity & {
  readonly stage: Exclude<TerminalMigrationStage, "COMPLETED">;
  readonly context: MigrationWorkflowContext & {
    readonly terminalFailure: MigrationWorkflowFailure;
  };
  readonly code: string;
  readonly retryable: boolean;
  readonly diagnostic?: string;
};
export type MigrationWorkflowState =
  | {
      [Stage in MigrationStage]: MigrationWorkflowStateFor<Stage>;
    }[MigrationStage]
  | CompletedMigrationState
  | FailedMigrationState;
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

const transition = <Stage extends MigrationStage>(
  state: MigrationWorkflowState,
  stage: Stage,
  context: MigrationStageContext[Stage],
  effects: readonly MigrationWorkflowEffect[],
): MigrationWorkflowTransition => {
  const nextState: MigrationWorkflowStateFor<Stage> = {
    operationID: state.operationID,
    planID: state.planID,
    selection: state.selection,
    stage,
    context,
    code: state.code,
    retryable: state.retryable,
    diagnostic: state.diagnostic,
  };
  // The mapped state union is correlated by `Stage`; TypeScript cannot retain
  // that correlation when indexing the map through a generic parameter.
  return {
    state: nextState as MigrationWorkflowState,
    accepted: true,
    effects,
  };
};
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
): MigrationWorkflowContext & {
  readonly terminalSuccess: MigrationWorkflowSuccess;
} => ({
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
): MigrationWorkflowContext & {
  readonly terminalFailure: MigrationWorkflowFailure;
} => ({
  ...state.context,
  terminalFailure: {
    code,
    retryable,
    stage: state.stage,
    diagnostic,
  },
});

const terminal = (
  state: MigrationWorkflowState,
  stage: TerminalMigrationStage,
  code: string,
  retryable: boolean,
  diagnostic?: string,
  effects: readonly MigrationWorkflowEffect[] = [{ kind: "settle-failure" }],
): MigrationWorkflowTransition => {
  if (stage === "COMPLETED") {
    const completedState: CompletedMigrationState = {
      operationID: state.operationID,
      planID: state.planID,
      selection: state.selection,
      stage: "COMPLETED",
      code,
      retryable,
      diagnostic,
      context: successfulTerminalContext(state),
    };
    return { state: completedState, accepted: true, effects };
  }
  const failedState: FailedMigrationState = {
    operationID: state.operationID,
    planID: state.planID,
    selection: state.selection,
    stage,
    code,
    retryable,
    diagnostic,
    context: failedTerminalContext(state, code, retryable, diagnostic),
  };
  return { state: failedState, accepted: true, effects };
};
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
    `stage=${state.stage} ${event.kind === "timeout" ? "dependency-failure" : (event.failure.diagnostic ?? "dependency-failure")}`,
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
