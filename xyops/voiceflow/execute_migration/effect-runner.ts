import { findArchiveCandidate } from "../archive";
import { failure, OperationFault, success } from "../contracts";
import { buildMigrationPlan } from "../planning";
import { exportVersion, resolveTargetSchemaVersion } from "../export";
import { importVersion } from "../import";
import { resolveVoiceflowAuth } from "../auth";
import { loadProjects } from "../catalog";
import { parseSecretEntries, resolveConfiguredSecretValues } from "../secrets";
import { reconcileProjectSecrets } from "../logux";
import { renameProject } from "../logux/rename-project";
import { confirmProjectRename } from "../catalog/rename-barrier";
import type {
  AuthContext,
  Envelope,
  ExecuteResult,
  ExportArtifact,
  ImportedReceipt,
  MigrationPlan,
  MigrationSelection,
  ProjectRecord,
} from "../types";
import {
  createMigrationWorkflow,
  transitionMigrationWorkflow,
  type MigrationWorkflowEffect,
  type MigrationWorkflowEvent,
  type MigrationWorkflowFailure,
  type MigrationWorkflowState,
  type MigrationWorkflowSuccess,
} from "../execute-migration-state-machine";

type EffectDependencies = Readonly<{
  readonly authenticate: typeof resolveVoiceflowAuth;
  readonly exportVersion: typeof exportVersion;
  readonly buildPlan: typeof buildMigrationPlan;
  readonly loadProjects: typeof loadProjects;
  readonly renameProject: typeof renameProject;
  readonly confirmRename: typeof confirmProjectRename;
  readonly importVersion: typeof importVersion;
  readonly resolveSecrets: typeof resolveConfiguredSecretValues;
  readonly reconcileSecrets: typeof reconcileProjectSecrets;
  readonly abortActiveOperation?: () => void | Promise<void>;
  readonly observeState?: (state: MigrationWorkflowState) => void;
}>;

export type MigrationRuntimeDependencies = EffectDependencies;

export type ExecuteMigrationInput = Readonly<{
  readonly token: string;
  readonly planID: string;
  readonly selection: MigrationSelection;
  readonly operationID: string;
  readonly secretFileContents?: unknown;
}>;

export const defaultMigrationRuntimeDependencies: MigrationRuntimeDependencies =
  {
    authenticate: resolveVoiceflowAuth,
    exportVersion,
    buildPlan: buildMigrationPlan,
    loadProjects,
    renameProject,
    confirmRename: confirmProjectRename,
    importVersion,
    resolveSecrets: resolveConfiguredSecretValues,
    reconcileSecrets: reconcileProjectSecrets,
  };

type EffectResult =
  | { readonly kind: "event"; readonly event: MigrationWorkflowEvent }
  | { readonly kind: "settled"; readonly result: Envelope<ExecuteResult> }
  | { readonly kind: "noop" };

type EffectHandler<K extends MigrationWorkflowEffect["kind"]> = (
  state: MigrationWorkflowState,
  effect: Extract<MigrationWorkflowEffect, { readonly kind: K }>,
) => Promise<EffectResult>;
type EffectHandlerMap = {
  readonly [K in MigrationWorkflowEffect["kind"]]: EffectHandler<K>;
};

const eventResult = (event: MigrationWorkflowEvent): EffectResult => ({
  kind: "event",
  event,
});
const noopResult = (): EffectResult => ({ kind: "noop" });
const settledResult = (result: Envelope<ExecuteResult>): EffectResult => ({
  kind: "settled",
  result,
});

const requireAuth = (state: MigrationWorkflowState): AuthContext => {
  if (state.context.auth === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.auth;
};
const requireArtifact = (state: MigrationWorkflowState): ExportArtifact => {
  if (state.context.artifact === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.artifact;
};
const requirePlan = (state: MigrationWorkflowState): MigrationPlan => {
  if (state.context.plan === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.plan;
};
const requireImported = (state: MigrationWorkflowState): ImportedReceipt => {
  if (state.context.imported === undefined)
    throw new OperationFault("INTERNAL_ERROR");
  return state.context.imported;
};

const resolveImportedVersionID = async (
  auth: AuthContext,
  imported: ImportedReceipt,
  workspaceID: string,
  load: typeof loadProjects,
): Promise<string> => {
  if (imported.versionID !== undefined) return imported.versionID;
  const projects = await load(auth, workspaceID);
  const project = projects.find(
    (candidate) => candidate.id === imported.projectID,
  );
  const versionID = project === undefined ? undefined : draftVersionID(project);
  if (versionID === undefined)
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      true,
      "missing-destination-version-id",
    );
  return versionID;
};
const draftVersionID = (project: ProjectRecord): string | undefined =>
  project.environments
    .map((environment) => environment.draftVersionID)
    .find(
      (versionID): versionID is string =>
        versionID !== undefined && versionID !== "",
    );

const workflowFailure = (
  error: unknown,
  stage: MigrationWorkflowState["stage"],
): MigrationWorkflowFailure =>
  error instanceof OperationFault
    ? {
        code: error.code,
        retryable: error.retryable,
        stage,
        diagnostic: error.diagnostic,
      }
    : { code: "INTERNAL_ERROR", retryable: false, stage };

type SupportedFailureCode =
  | "IMPORT_OUTCOME_UNKNOWN"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT"
  | "AUTHENTICATION_FAILED"
  | "PLAN_MISMATCH"
  | "CONFIRMATION_REQUIRED"
  | "DEPENDENCY_TIMEOUT"
  | "DEPENDENCY_FAILURE";
const supportedFailureCodes: readonly SupportedFailureCode[] = [
  "IMPORT_OUTCOME_UNKNOWN",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "INVALID_ARGUMENT",
  "AUTHENTICATION_FAILED",
  "PLAN_MISMATCH",
  "CONFIRMATION_REQUIRED",
  "DEPENDENCY_TIMEOUT",
  "DEPENDENCY_FAILURE",
];
const failureCode = (code: string | undefined): SupportedFailureCode =>
  code !== undefined &&
  supportedFailureCodes.includes(code as SupportedFailureCode)
    ? (code as SupportedFailureCode)
    : "DEPENDENCY_FAILURE";

const terminalFailureCode = (
  state: MigrationWorkflowState,
): string | undefined => state.context.terminalFailure?.code ?? state.code;
const terminalFailureRetryable = (state: MigrationWorkflowState): boolean =>
  state.context.terminalFailure?.retryable ?? state.retryable ?? false;
const terminalFailureDiagnostic = (
  state: MigrationWorkflowState,
): string | undefined =>
  state.context.terminalFailure?.diagnostic ?? state.diagnostic;
const terminalFailureStage = (state: MigrationWorkflowState): string =>
  state.context.terminalFailure?.stage ?? state.stage;

const failureForState = (state: MigrationWorkflowState): OperationFault =>
  new OperationFault(
    failureCode(terminalFailureCode(state)),
    terminalFailureRetryable(state),
    terminalFailureDiagnostic(state),
    { stage: terminalFailureStage(state) },
  );

const addFailureStage = (error: unknown, stage: string): unknown =>
  error instanceof OperationFault
    ? new OperationFault(
        error.code,
        error.retryable,
        [stage, error.diagnostic]
          .filter((value): value is string => value !== undefined)
          .join(" "),
        error.details,
      )
    : new Error(
        `stage=${stage} error=${error instanceof Error ? error.message : String(error)}`,
      );

type ReducerFailureCode =
  | "AUTHENTICATION_FAILED"
  | "DEPENDENCY_FAILURE"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "INVALID_ARGUMENT";
const reducerFailureCode = (error: unknown): ReducerFailureCode => {
  if (!(error instanceof OperationFault)) return "INTERNAL_ERROR";
  switch (error.code) {
    case "AUTHENTICATION_FAILED":
    case "DEPENDENCY_FAILURE":
    case "INTERNAL_ERROR":
    case "NOT_FOUND":
    case "INVALID_ARGUMENT":
      return error.code;
    default:
      return "INTERNAL_ERROR";
  }
};

const createAuthenticateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"authenticate"> =>
  async () =>
    eventResult({
      kind: "authentication-succeeded",
      auth: await dependencies.authenticate(input.token),
    });

const createExportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"export"> =>
  async (state) =>
    eventResult({
      kind: "export-succeeded",
      artifact: await dependencies.exportVersion(
        requireAuth(state),
        input.selection.sourceVersionID,
      ),
    });

const createPlanHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"plan"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const selection = {
      ...input.selection,
      targetSchemaVersion:
        input.selection.targetSchemaVersion ??
        resolveTargetSchemaVersion(artifact),
    };
    const plan = await dependencies.buildPlan(requireAuth(state), selection);
    return eventResult({ kind: "plan-succeeded", planID: plan.planID, plan });
  };

const createArchiveCandidateHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"load-archive-candidates"> =>
  async (state) => {
    const auth = requireAuth(state);
    requirePlan(state);
    const [sourceProjects, destinationProjects] = await Promise.all([
      dependencies.loadProjects(auth, input.selection.sourceWorkspaceID),
      dependencies.loadProjects(auth, input.selection.destinationWorkspaceID),
    ]);
    const sourceProject = sourceProjects.find(
      (candidate) => candidate.id === input.selection.sourceProjectID,
    );
    if (sourceProject === undefined) throw new OperationFault("NOT_FOUND");
    const archive = findArchiveCandidate(
      destinationProjects,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      sourceProject.label,
      { now: () => new Date() },
    );
    return eventResult({
      kind: "archive-preflight-result",
      collision: archive !== undefined,
      archive,
    });
  };

const createRenameHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"rename"> =>
  async (state) => {
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.renameProject(
      requireAuth(state),
      input.selection.destinationWorkspaceID,
      archive.project.id,
      input.selection.destinationFolderID,
      archive.name,
    );
    return eventResult({ kind: "archive-renamed", archive });
  };

const createArchiveDurabilityHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"confirm-archive-durability"> =>
  async (state) => {
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.confirmRename(requireAuth(state), {
      workspaceID: input.selection.destinationWorkspaceID,
      folderID: input.selection.destinationFolderID,
      projectID: archive.project.id,
      name: archive.name,
    });
    return eventResult({ kind: "archive-durability-confirmed" });
  };

const createImportHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"import"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const imported = await dependencies.importVersion(
      requireAuth(state),
      artifact,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      input.selection.targetSchemaVersion ??
        resolveTargetSchemaVersion(artifact),
    );
    return eventResult({
      kind: "import-succeeded",
      imported,
      importedProjectID: imported.projectID,
    });
  };

const createResolveSecretsHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"resolve-secrets"> =>
  async (state, effect) => {
    if (effect.phase === "input")
      return eventResult({ kind: "secret-input-resolved" });
    const secrets = await dependencies.resolveSecrets(
      requireAuth(state),
      input.secretFileContents === undefined
        ? []
        : parseSecretEntries(input.secretFileContents),
    );
    return eventResult({
      kind: "secret-resolution-completed",
      secrets,
      empty: secrets.length === 0,
    });
  };

const createNextSecretHandler =
  (
    input: ExecuteMigrationInput,
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"create-next-secret"> =>
  async (state) => {
    const imported = requireImported(state);
    const secrets = state.context.secrets ?? [];
    if (secrets.length > 0) {
      const versionID = await resolveImportedVersionID(
        requireAuth(state),
        imported,
        input.selection.destinationWorkspaceID,
        dependencies.loadProjects,
      );
      await dependencies.reconcileSecrets(
        requireAuth(state),
        imported.assistantID ?? imported.projectID,
        versionID,
        secrets,
      );
    }
    return eventResult({ kind: "secret-completed", remaining: 0 });
  };

const createAbortHandler =
  (
    dependencies: MigrationRuntimeDependencies,
  ): EffectHandler<"abort-active-operation"> =>
  async () => {
    await dependencies.abortActiveOperation?.();
    return noopResult();
  };

const successSummary = (
  state: MigrationWorkflowState,
  input: ExecuteMigrationInput,
  artifact: ExportArtifact,
  imported: ImportedReceipt,
): MigrationWorkflowSuccess =>
  state.context.terminalSuccess ?? {
    planID: input.planID,
    exportStatus: artifact.status,
    exportBytes: artifact.bytes.byteLength,
    importStatus: imported.importStatus,
    importBytes: imported.importBytes,
  };

const createSuccessSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-success"> =>
  async (state) => {
    const artifact = requireArtifact(state);
    const plan = requirePlan(state);
    const imported = requireImported(state);
    const summary = successSummary(state, input, artifact, imported);
    return settledResult(
      success("execute_migration", input.operationID, {
        ...summary,
        selected: plan.selection,
        imported,
      }),
    );
  };

const createFailureSettlementHandler =
  (input: ExecuteMigrationInput): EffectHandler<"settle-failure"> =>
  async (state) =>
    settledResult(
      failure("execute_migration", input.operationID, failureForState(state)),
    );

export const createMigrationEffectHandlers = (
  input: ExecuteMigrationInput,
  dependencies: MigrationRuntimeDependencies,
): EffectHandlerMap => ({
  authenticate: createAuthenticateHandler(input, dependencies),
  export: createExportHandler(input, dependencies),
  plan: createPlanHandler(input, dependencies),
  "load-archive-candidates": createArchiveCandidateHandler(input, dependencies),
  rename: createRenameHandler(input, dependencies),
  "confirm-archive-durability": createArchiveDurabilityHandler(
    input,
    dependencies,
  ),
  import: createImportHandler(input, dependencies),
  "resolve-secrets": createResolveSecretsHandler(input, dependencies),
  "create-next-secret": createNextSecretHandler(input, dependencies),
  "abort-active-operation": createAbortHandler(dependencies),
  "settle-success": createSuccessSettlementHandler(input),
  "settle-failure": createFailureSettlementHandler(input),
});

export type RunMigrationWorkflow = (
  input: ExecuteMigrationInput,
  dependencies?: MigrationRuntimeDependencies,
) => Promise<Envelope<ExecuteResult>>;

type MigrationWorkflowRuntime = {
  readonly input: ExecuteMigrationInput;
  readonly dependencies: MigrationRuntimeDependencies;
  readonly handlers: EffectHandlerMap;
  state: MigrationWorkflowState;
  settlement?: Envelope<ExecuteResult>;
};

const isImportOutcomeUnknown = (error: unknown): error is OperationFault =>
  error instanceof OperationFault && error.code === "IMPORT_OUTCOME_UNKNOWN";
const isArchiveDurabilityUnknown = (
  state: MigrationWorkflowState,
  error: unknown,
): error is OperationFault =>
  state.stage === "ARCHIVE" &&
  error instanceof OperationFault &&
  ["DEPENDENCY_FAILURE", "DEPENDENCY_TIMEOUT"].includes(error.code);
const isSecretOutcomeUnknown = (
  state: MigrationWorkflowState,
  error: unknown,
): error is OperationFault =>
  state.stage === "SECRET_CREATION" &&
  error instanceof OperationFault &&
  error.code === "DEPENDENCY_TIMEOUT";

const failureEvent = (
  runtime: MigrationWorkflowRuntime,
  diagnostic: unknown,
  workflowError: MigrationWorkflowFailure,
): MigrationWorkflowEvent => {
  if (isImportOutcomeUnknown(diagnostic))
    return {
      kind: "import-unknown",
      diagnostic: diagnostic.diagnostic,
      failure: workflowError,
    };
  if (isArchiveDurabilityUnknown(runtime.state, diagnostic))
    return {
      kind: "archive-durability-unknown",
      diagnostic: diagnostic.diagnostic,
      failure: workflowError,
    };
  if (isSecretOutcomeUnknown(runtime.state, diagnostic))
    return {
      kind: "secret-unknown",
      diagnostic: diagnostic.diagnostic,
      failure: workflowError,
    };
  return {
    kind: "dependency-failure",
    code: reducerFailureCode(diagnostic),
    diagnostic:
      diagnostic instanceof OperationFault ? diagnostic.diagnostic : undefined,
    failure: workflowError,
  };
};

type DispatchWorkflowEvent = (
  runtime: MigrationWorkflowRuntime,
  event: MigrationWorkflowEvent,
) => Promise<void>;

const dispatchWorkflowFailure = async (
  runtime: MigrationWorkflowRuntime,
  error: unknown,
  dispatch: DispatchWorkflowEvent,
): Promise<void> => {
  const diagnostic = addFailureStage(error, runtime.state.stage);
  const workflowError = workflowFailure(diagnostic, runtime.state.stage);
  await dispatch(runtime, failureEvent(runtime, diagnostic, workflowError));
};

const handleEffectResult = async (
  runtime: MigrationWorkflowRuntime,
  result: EffectResult,
  dispatch: DispatchWorkflowEvent,
): Promise<boolean> => {
  if (result.kind === "settled") {
    runtime.settlement = result.result;
    return true;
  }
  if (result.kind === "event") {
    await dispatch(runtime, result.event);
    return runtime.settlement !== undefined;
  }
  return false;
};

const executeWorkflowEffects = async (
  runtime: MigrationWorkflowRuntime,
  effects: readonly MigrationWorkflowEffect[],
  dispatch: DispatchWorkflowEvent,
): Promise<void> => {
  for (const effect of effects) {
    if (runtime.settlement !== undefined) return;
    try {
      const handler = runtime.handlers[effect.kind];
      const result = await handler(runtime.state, effect as never);
      if (await handleEffectResult(runtime, result, dispatch)) return;
    } catch (error) {
      await dispatchWorkflowFailure(runtime, error, dispatch);
      return;
    }
  }
};

const dispatchWorkflowEvent: DispatchWorkflowEvent = async (runtime, event) => {
  const transition = transitionMigrationWorkflow(runtime.state, event);
  if (!transition.accepted) return;
  runtime.state = transition.state;
  runtime.dependencies.observeState?.(runtime.state);
  await executeWorkflowEffects(
    runtime,
    transition.effects,
    dispatchWorkflowEvent,
  );
};

export const runMigrationWorkflow: RunMigrationWorkflow = async (
  input,
  dependencies = defaultMigrationRuntimeDependencies,
) => {
  const runtime: MigrationWorkflowRuntime = {
    input,
    dependencies,
    handlers: createMigrationEffectHandlers(input, dependencies),
    state: createMigrationWorkflow({
      operationID: input.operationID,
      planID: input.planID,
      selection: input.selection,
    }),
  };
  try {
    await dispatchWorkflowEvent(runtime, { kind: "start" });
  } catch (error) {
    await dispatchWorkflowFailure(runtime, error, dispatchWorkflowEvent);
  }
  return (
    runtime.settlement ??
    failure(
      "execute_migration",
      input.operationID,
      new OperationFault("INTERNAL_ERROR"),
    )
  );
};
