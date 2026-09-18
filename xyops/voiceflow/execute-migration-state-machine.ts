/* oxlint-disable complexity -- exhaustive workflow transitions are the contract. */
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
export type MigrationWorkflowContext = Readonly<{
  readonly auth?: AuthContext;
  readonly artifact?: ExportArtifact;
  readonly plan?: MigrationPlan;
  readonly archive?: ArchiveCandidate;
  readonly imported?: ImportedReceipt;
  readonly secrets?: readonly SecretEntry[];
}>;

export type MigrationWorkflowState = WorkflowIdentity & {
  readonly context: MigrationWorkflowContext;
  readonly stage: MigrationStage | TerminalMigrationStage;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly diagnostic?: string;
};

export type MigrationWorkflowEvent =
  | { readonly kind: "start" }
  | { readonly kind: "authentication-succeeded"; readonly auth?: AuthContext }
  | { readonly kind: "export-succeeded"; readonly artifact?: ExportArtifact }
  | {
      readonly kind: "plan-succeeded";
      readonly planID: string;
      readonly plan?: MigrationPlan;
    }
  | { readonly kind: "plan-mismatch" }
  | {
      readonly kind: "archive-preflight-result";
      readonly collision: boolean;
      readonly archive?: ArchiveCandidate;
    }
  | { readonly kind: "archive-renamed"; readonly archive?: ArchiveCandidate }
  | { readonly kind: "archive-durability-confirmed" }
  | {
      readonly kind: "archive-durability-unknown";
      readonly diagnostic?: string;
    }
  | {
      readonly kind: "import-succeeded";
      readonly importedProjectID: string;
      readonly imported?: ImportedReceipt;
    }
  | { readonly kind: "import-failed"; readonly diagnostic?: string }
  | { readonly kind: "import-unknown"; readonly diagnostic?: string }
  | { readonly kind: "secret-input-resolved" }
  | {
      readonly kind: "secret-resolution-completed";
      readonly secrets?: readonly SecretEntry[];
      readonly empty?: boolean;
    }
  | { readonly kind: "secret-completed"; readonly remaining?: number }
  | { readonly kind: "secret-failed"; readonly diagnostic?: string }
  | { readonly kind: "secret-unknown"; readonly diagnostic?: string }
  | {
      readonly kind: "dependency-failure";
      readonly diagnostic?: string;
      readonly code?:
        | "AUTHENTICATION_FAILED"
        | "DEPENDENCY_FAILURE"
        | "INTERNAL_ERROR"
        | "NOT_FOUND"
        | "INVALID_ARGUMENT";
    }
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
const terminal = (
  state: MigrationWorkflowState,
  stage: TerminalMigrationStage,
  code: string,
  retryable: boolean,
  diagnostic?: string,
  effects: readonly MigrationWorkflowEffect[] = [{ kind: "settle-failure" }],
): MigrationWorkflowTransition => ({
  state: { ...state, stage, code, retryable, diagnostic },
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
export const transitionMigrationWorkflow: TransitionMigrationWorkflow = (
  state,
  event,
) => {
  if (isTerminal(state.stage) || event.kind === "late-event")
    return ignored(state);
  if (event.kind === "cancellation")
    return terminal(
      state,
      "CANCELLED",
      "INTERNAL_ERROR",
      false,
      "stage=" + state.stage,
      [{ kind: "abort-active-operation" }, { kind: "settle-failure" }],
    );
  if (
    (event.kind === "archive-durability-unknown" && state.stage === "ARCHIVE") ||
    (event.kind === "import-unknown" && state.stage === "IMPORT") ||
    ((event.kind === "secret-failed" || event.kind === "secret-unknown") && state.stage === "SECRET_CREATION")
  )
    return terminal(
      state,
      "UNKNOWN_OUTCOME",
      event.kind === "import-unknown"
        ? "IMPORT_OUTCOME_UNKNOWN"
        : event.kind === "secret-failed" || event.kind === "secret-unknown"
          ? "DEPENDENCY_TIMEOUT"
          : "DEPENDENCY_FAILURE",
      true,
      `stage=${state.stage} ${event.diagnostic ?? "outcome-unknown"}`,
    );
  if (event.kind === "start")
    return state.stage === "AUTHENTICATION"
      ? { state, accepted: true, effects: [{ kind: "authenticate" }] }
      : ignored(state);
  if (event.kind === "plan-mismatch")
    return state.stage === "PLANNING"
      ? terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING")
      : ignored(state);
  if (
    event.kind === "dependency-failure" ||
    event.kind === "timeout" ||
    event.kind === "import-failed"
  ) {
    const code =
      event.kind === "timeout"
        ? "DEPENDENCY_TIMEOUT"
        : event.kind === "dependency-failure" && event.code !== undefined
          ? event.code
          : "DEPENDENCY_FAILURE";
    return terminal(
      state,
      "FAILED",
      code,
      code !== "AUTHENTICATION_FAILED" && event.kind !== "import-failed",
      `stage=${state.stage} ${"diagnostic" in event ? event.diagnostic ?? "dependency-failure" : "dependency-failure"}`,
    );
  }
  switch (state.stage) {
    case "AUTHENTICATION":
      return event.kind === "authentication-succeeded"
        ? transition(state, "EXPORT", { ...state.context, auth: event.auth }, [{ kind: "export" }])
        : ignored(state);
    case "EXPORT":
      return event.kind === "export-succeeded"
        ? transition(state, "PLANNING", { ...state.context, artifact: event.artifact }, [{ kind: "plan" }])
        : ignored(state);
    case "PLANNING":
      return event.kind === "plan-succeeded"
        ? event.planID === state.planID
          ? transition(state, "ARCHIVE_PREFLIGHT", { ...state.context, plan: event.plan }, [{ kind: "load-archive-candidates" }])
          : terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING")
        : ignored(state);
    case "ARCHIVE_PREFLIGHT":
      return event.kind === "archive-preflight-result"
        ? event.collision
          ? transition(state, "ARCHIVE", { ...state.context, archive: event.archive }, [{ kind: "rename" }])
          : transition(state, "IMPORT", state.context, [{ kind: "import" }])
        : ignored(state);
    case "ARCHIVE":
      if (event.kind === "archive-renamed")
        return transition(state, "ARCHIVE", { ...state.context, archive: event.archive ?? state.context.archive }, [{ kind: "confirm-archive-durability" }]);
      return event.kind === "archive-durability-confirmed"
        ? transition(state, "IMPORT", state.context, [{ kind: "import" }])
        : ignored(state);
    case "IMPORT":
      return event.kind === "import-succeeded"
        ? transition(state, "SECRET_INPUT", { ...state.context, imported: event.imported ?? { importStatus: 0, importBytes: 0, projectID: event.importedProjectID } }, [{ kind: "resolve-secrets", phase: "input" }])
        : ignored(state);
    case "SECRET_INPUT":
      return event.kind === "secret-input-resolved"
        ? transition(state, "SECRET_RESOLUTION", state.context, [{ kind: "resolve-secrets", phase: "resolution" }])
        : ignored(state);
    case "SECRET_RESOLUTION":
      return event.kind === "secret-resolution-completed"
        ? event.empty === true
          ? terminal(state, "COMPLETED", "", false, undefined, [{ kind: "settle-success" }])
          : transition(state, "SECRET_CREATION", { ...state.context, secrets: event.secrets }, [{ kind: "create-next-secret" }])
        : ignored(state);
    case "SECRET_CREATION":
      return event.kind === "secret-completed"
        ? event.remaining === 0
          ? terminal(state, "COMPLETED", "", false, undefined, [{ kind: "settle-success" }])
          : transition(state, "SECRET_CREATION", state.context, [{ kind: "create-next-secret" }])
        : ignored(state);
  }
};
