/* oxlint-disable complexity -- exhaustive workflow transitions are the contract. */
import type { MigrationSelection } from "./types";

export type MigrationStage =
  | "AUTHENTICATION" | "EXPORT" | "PLANNING" | "ARCHIVE_PREFLIGHT" | "ARCHIVE"
  | "IMPORT" | "SECRET_INPUT" | "SECRET_RESOLUTION" | "SECRET_CREATION";
export type TerminalMigrationStage = "COMPLETED" | "FAILED" | "UNKNOWN_OUTCOME" | "CANCELLED";

type WorkflowIdentity = Readonly<{
  readonly operationID: string;
  readonly planID: string;
  readonly selection: MigrationSelection;
}>;
type WorkflowStateData = Readonly<Record<string, unknown>>;
export type MigrationWorkflowState = WorkflowIdentity &
  ({ readonly stage: MigrationStage; readonly data?: WorkflowStateData } |
   { readonly stage: TerminalMigrationStage; readonly data?: WorkflowStateData; readonly code?: string; readonly retryable?: boolean; readonly diagnostic?: string });

export type MigrationWorkflowEvent =
  | { readonly kind: "authentication-succeeded" }
  | { readonly kind: "export-succeeded"; readonly data?: WorkflowStateData }
  | { readonly kind: "plan-succeeded"; readonly planID: string; readonly data?: WorkflowStateData }
  | { readonly kind: "plan-mismatch" }
  | { readonly kind: "archive-preflight-result"; readonly collision: boolean; readonly data?: WorkflowStateData }
  | { readonly kind: "archive-renamed"; readonly data?: WorkflowStateData }
  | { readonly kind: "archive-durability-confirmed"; readonly data?: WorkflowStateData }
  | { readonly kind: "archive-durability-unknown"; readonly diagnostic?: string }
  | { readonly kind: "import-succeeded"; readonly importedProjectID: string; readonly data?: WorkflowStateData }
  | { readonly kind: "import-failed"; readonly diagnostic?: string }
  | { readonly kind: "import-unknown"; readonly diagnostic?: string }
  | { readonly kind: "secret-input-resolved"; readonly data?: WorkflowStateData }
  | { readonly kind: "secret-resolution-completed"; readonly data?: WorkflowStateData; readonly empty?: boolean }
  | { readonly kind: "secret-completed"; readonly data?: WorkflowStateData; readonly remaining?: number }
  | { readonly kind: "secret-failed"; readonly diagnostic?: string }
  | { readonly kind: "secret-unknown"; readonly diagnostic?: string }
  | { readonly kind: "dependency-failure"; readonly diagnostic?: string; readonly code?: "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" }
  | { readonly kind: "timeout"; readonly diagnostic?: string }
  | { readonly kind: "cancellation" }
  | { readonly kind: "late-event" };

export type MigrationWorkflowEffect =
  | { readonly kind: "authenticate" } | { readonly kind: "export" } | { readonly kind: "plan" }
  | { readonly kind: "load-archive-candidates" } | { readonly kind: "rename" }
  | { readonly kind: "confirm-archive-durability" } | { readonly kind: "import" }
  | { readonly kind: "resolve-secrets" } | { readonly kind: "create-next-secret" }
  | { readonly kind: "abort-active-operation" } | { readonly kind: "settle-success" }
  | { readonly kind: "settle-failure" };
export type MigrationWorkflowTransition = Readonly<{
  readonly state: MigrationWorkflowState;
  readonly accepted: boolean;
  readonly effects: readonly MigrationWorkflowEffect[];
}>;

type CreateMigrationWorkflow = (identity: WorkflowIdentity) => MigrationWorkflowState;
export const createMigrationWorkflow: CreateMigrationWorkflow = (identity) => ({ ...identity, stage: "AUTHENTICATION" });
const transition = (state: MigrationWorkflowState, stage: MigrationStage, data: WorkflowStateData | undefined, effects: readonly MigrationWorkflowEffect[]): MigrationWorkflowTransition => ({ state: { ...state, stage, data }, accepted: true, effects });
const terminal = (state: MigrationWorkflowState, stage: TerminalMigrationStage, code: string, retryable: boolean, diagnostic?: string, effects: readonly MigrationWorkflowEffect[] = [{ kind: "settle-failure" }]): MigrationWorkflowTransition => ({ state: { ...state, stage, code, retryable, diagnostic }, accepted: true, effects });
const ignored = (state: MigrationWorkflowState): MigrationWorkflowTransition => ({ state, accepted: false, effects: [] });
const isTerminal = (stage: string): stage is TerminalMigrationStage => ["COMPLETED", "FAILED", "UNKNOWN_OUTCOME", "CANCELLED"].includes(stage);

export type TransitionMigrationWorkflow = (state: MigrationWorkflowState, event: MigrationWorkflowEvent) => MigrationWorkflowTransition;
export const transitionMigrationWorkflow: TransitionMigrationWorkflow = (state, event) => {
  if (isTerminal(state.stage) || event.kind === "late-event") return ignored(state);
  if (event.kind === "cancellation") return terminal(state, "CANCELLED", "INTERNAL_ERROR", false, "stage=" + state.stage, [{ kind: "abort-active-operation" }, { kind: "settle-failure" }]);
  if (event.kind === "archive-durability-unknown" || event.kind === "import-unknown" || event.kind === "secret-unknown")
    return terminal(state, "UNKNOWN_OUTCOME", event.kind === "import-unknown" ? "IMPORT_OUTCOME_UNKNOWN" : event.kind === "secret-unknown" ? "DEPENDENCY_TIMEOUT" : "DEPENDENCY_FAILURE", true, `stage=${state.stage} ${event.diagnostic ?? "outcome-unknown"}`);
  if (event.kind === "plan-mismatch") return state.stage === "PLANNING" ? terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING") : ignored(state);
  if (event.kind === "dependency-failure" || event.kind === "timeout" || event.kind === "import-failed" || event.kind === "secret-failed") {
    const code = event.kind === "timeout" ? "DEPENDENCY_TIMEOUT" : event.kind === "dependency-failure" && event.code !== undefined ? event.code : "DEPENDENCY_FAILURE";
    return terminal(state, "FAILED", code, code !== "AUTHENTICATION_FAILED" && event.kind !== "import-failed", `stage=${state.stage} ${event.diagnostic ?? "dependency-failure"}`);
  }
  switch (state.stage) {
    case "AUTHENTICATION": return event.kind === "authentication-succeeded" ? transition(state, "EXPORT", undefined, [{ kind: "export" }]) : ignored(state);
    case "EXPORT": return event.kind === "export-succeeded" ? transition(state, "PLANNING", event.data, [{ kind: "plan" }]) : ignored(state);
    case "PLANNING": return event.kind === "plan-succeeded" ? (event.planID === state.planID ? transition(state, "ARCHIVE_PREFLIGHT", event.data, [{ kind: "load-archive-candidates" }]) : terminal(state, "FAILED", "PLAN_MISMATCH", false, "stage=PLANNING")) : ignored(state);
    case "ARCHIVE_PREFLIGHT": return event.kind === "archive-preflight-result" ? (event.collision ? transition(state, "ARCHIVE", event.data, [{ kind: "rename" }]) : transition(state, "IMPORT", event.data, [{ kind: "import" }])) : ignored(state);
    case "ARCHIVE":
      if (event.kind === "archive-renamed") return transition(state, "ARCHIVE", event.data, [{ kind: "confirm-archive-durability" }]);
      return event.kind === "archive-durability-confirmed" ? transition(state, "IMPORT", event.data, [{ kind: "import" }]) : ignored(state);
    case "IMPORT": return event.kind === "import-succeeded" ? transition(state, "SECRET_INPUT", { ...event.data, importedProjectID: event.importedProjectID }, [{ kind: "resolve-secrets" }]) : ignored(state);
    case "SECRET_INPUT": return event.kind === "secret-input-resolved" ? transition(state, "SECRET_RESOLUTION", event.data, [{ kind: "resolve-secrets" }]) : ignored(state);
    case "SECRET_RESOLUTION":
      return event.kind === "secret-resolution-completed"
        ? event.empty === true
          ? terminal(state, "COMPLETED", "", false, undefined, [{ kind: "settle-success" }])
          : transition(state, "SECRET_CREATION", event.data, [{ kind: "create-next-secret" }])
        : ignored(state);
    case "SECRET_CREATION":
      return event.kind === "secret-completed"
        ? event.remaining === 0
          ? terminal(state, "COMPLETED", "", false, undefined, [{ kind: "settle-success" }])
          : transition(state, "SECRET_CREATION", event.data, [{ kind: "create-next-secret" }])
        : ignored(state);
  }
};
