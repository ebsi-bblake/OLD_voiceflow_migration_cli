import { findArchiveCandidate } from "../archive";
import { failure, OperationFault, success } from "../contracts";
import { buildMigrationPlan } from "../planning";
import { exportVersion, resolveTargetSchemaVersion } from "../export";
import { importVersion } from "../import";
import { resolveVoiceflowAuth } from "../auth";
import { loadProjects } from "../catalog";
import {
  parseSecretEntries,
  resolveConfiguredSecretValues,
} from "../secrets";
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

export const defaultMigrationRuntimeDependencies: MigrationRuntimeDependencies = {
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
const settledResult = (
  result: Envelope<ExecuteResult>,
): EffectResult => ({ kind: "settled", result });

const requireAuth = (state: MigrationWorkflowState): AuthContext => {
  if (state.context.auth === undefined) throw new OperationFault("INTERNAL_ERROR");
  return state.context.auth;
};
const requireArtifact = (state: MigrationWorkflowState): ExportArtifact => {
  if (state.context.artifact === undefined) throw new OperationFault("INTERNAL_ERROR");
  return state.context.artifact;
};
const requirePlan = (state: MigrationWorkflowState): MigrationPlan => {
  if (state.context.plan === undefined) throw new OperationFault("INTERNAL_ERROR");
  return state.context.plan;
};
const requireImported = (state: MigrationWorkflowState): ImportedReceipt => {
  if (state.context.imported === undefined) throw new OperationFault("INTERNAL_ERROR");
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
  const project = projects.find((candidate) => candidate.id === imported.projectID);
  const versionID = project === undefined ? undefined : draftVersionID(project);
  if (versionID === undefined)
    throw new OperationFault("DEPENDENCY_FAILURE", true, "missing-destination-version-id");
  return versionID;
};
const draftVersionID = (project: ProjectRecord): string | undefined =>
  project.environments
    .map((environment) => environment.draftVersionID)
    .find((versionID): versionID is string => versionID !== undefined && versionID !== "");

const workflowFailure = (error: unknown, stage: MigrationWorkflowState["stage"]): MigrationWorkflowFailure =>
  error instanceof OperationFault
    ? { code: error.code, retryable: error.retryable, stage, diagnostic: error.diagnostic }
    : { code: "INTERNAL_ERROR", retryable: false, stage };

/* oxlint-disable complexity -- failure translation exhaustively preserves terminal reducer data. */
const failureForState = (
  state: MigrationWorkflowState,
): OperationFault => {
  const code = state.context.terminalFailure?.code ?? state.code;
  const supported = [
    "IMPORT_OUTCOME_UNKNOWN",
    "INTERNAL_ERROR",
    "NOT_FOUND",
    "INVALID_ARGUMENT",
    "AUTHENTICATION_FAILED",
    "PLAN_MISMATCH",
    "CONFIRMATION_REQUIRED",
    "DEPENDENCY_TIMEOUT",
    "DEPENDENCY_FAILURE",
  ] as const;
  const resolvedCode = supported.includes(code as (typeof supported)[number])
    ? (code as (typeof supported)[number])
    : "DEPENDENCY_FAILURE";
  const diagnostic = state.context.terminalFailure?.diagnostic ?? state.diagnostic;
  const stage = state.context.terminalFailure?.stage ?? state.stage;
  return new OperationFault(
    resolvedCode,
    state.context.terminalFailure?.retryable ?? state.retryable ?? false,
    diagnostic,
    { stage },
  );
};

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

/* oxlint-disable complexity -- the typed handler map owns each dependent workflow effect. */
export const createMigrationEffectHandlers = (
  input: ExecuteMigrationInput,
  dependencies: MigrationRuntimeDependencies,
): EffectHandlerMap => ({
  authenticate: async () =>
    eventResult({ kind: "authentication-succeeded", auth: await dependencies.authenticate(input.token) }),
  export: async (state) =>
    eventResult({
      kind: "export-succeeded",
      artifact: await dependencies.exportVersion(requireAuth(state), input.selection.sourceVersionID),
    }),
  plan: async (state) => {
    const artifact = requireArtifact(state);
    const selection = {
      ...input.selection,
      targetSchemaVersion:
        input.selection.targetSchemaVersion ?? resolveTargetSchemaVersion(artifact),
    };
    const plan = await dependencies.buildPlan(requireAuth(state), selection);
    return eventResult({ kind: "plan-succeeded", planID: plan.planID, plan });
  },
  "load-archive-candidates": async (state) => {
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
    return eventResult({ kind: "archive-preflight-result", collision: archive !== undefined, archive });
  },
  rename: async (state) => {
    const auth = requireAuth(state);
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.renameProject(
      auth,
      input.selection.destinationWorkspaceID,
      archive.project.id,
      input.selection.destinationFolderID,
      archive.name,
    );
    return eventResult({ kind: "archive-renamed", archive });
  },
  "confirm-archive-durability": async (state) => {
    const archive = state.context.archive;
    if (archive === undefined) throw new OperationFault("INTERNAL_ERROR");
    await dependencies.confirmRename(requireAuth(state), {
      workspaceID: input.selection.destinationWorkspaceID,
      folderID: input.selection.destinationFolderID,
      projectID: archive.project.id,
      name: archive.name,
    });
    return eventResult({ kind: "archive-durability-confirmed" });
  },
  import: async (state) => {
    const artifact = requireArtifact(state);
    const imported = await dependencies.importVersion(
      requireAuth(state),
      artifact,
      input.selection.destinationWorkspaceID,
      input.selection.destinationFolderID,
      input.selection.targetSchemaVersion ?? resolveTargetSchemaVersion(artifact),
    );
    return eventResult({ kind: "import-succeeded", imported, importedProjectID: imported.projectID });
  },
  "resolve-secrets": async (state, effect) => {
    if (effect.phase === "input") return eventResult({ kind: "secret-input-resolved" });
    const secrets = await dependencies.resolveSecrets(
      requireAuth(state),
      input.secretFileContents === undefined ? [] : parseSecretEntries(input.secretFileContents),
    );
    return eventResult({ kind: "secret-resolution-completed", secrets, empty: secrets.length === 0 });
  },
  "create-next-secret": async (state) => {
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
  },
  "abort-active-operation": async () => {
    await dependencies.abortActiveOperation?.();
    return noopResult();
  },
  "settle-success": async (state) => {
    const artifact = requireArtifact(state);
    const plan = requirePlan(state);
    const imported = requireImported(state);
    const summary = state.context.terminalSuccess;
    return settledResult(
      success("execute_migration", input.operationID, {
        planID: summary?.planID ?? input.planID,
        exportStatus: summary?.exportStatus ?? artifact.status,
        exportBytes: summary?.exportBytes ?? artifact.bytes.byteLength,
        importStatus: summary?.importStatus ?? imported.importStatus,
        importBytes: summary?.importBytes ?? imported.importBytes,
        selected: plan.selection,
        imported,
      }),
    );
  },
  "settle-failure": async (state) =>
    settledResult(failure("execute_migration", input.operationID, failureForState(state))),
});

export type RunMigrationWorkflow = (
  input: ExecuteMigrationInput,
  dependencies?: MigrationRuntimeDependencies,
) => Promise<Envelope<ExecuteResult>>;

/* oxlint-disable complexity -- effect runner translates every handler result through one reducer boundary. */
export const runMigrationWorkflow: RunMigrationWorkflow = async (
  input,
  dependencies = defaultMigrationRuntimeDependencies,
) => {
  let state = createMigrationWorkflow({
    operationID: input.operationID,
    planID: input.planID,
    selection: input.selection,
  });
  let settlement: Envelope<ExecuteResult> | undefined;
  const handlers = createMigrationEffectHandlers(input, dependencies);

  const dispatch = async (event: MigrationWorkflowEvent): Promise<void> => {
    const transition = transitionMigrationWorkflow(state, event);
    if (!transition.accepted) return;
    state = transition.state;
    dependencies.observeState?.(state);
    await executeEffects(transition.effects);
  };
  const executeEffects = async (
    effects: readonly MigrationWorkflowEffect[],
  ): Promise<void> => {
    for (const effect of effects) {
      if (settlement !== undefined) return;
      const handler = handlers[effect.kind];
      try {
        const result = await handler(state, effect as never);
        if (result.kind === "settled") {
          settlement = result.result;
          return;
        }
        if (result.kind === "event") {
          await dispatch(result.event);
          if (settlement !== undefined) return;
        }
      } catch (error) {
        await dispatchFailure(error);
        return;
      }
    }
  };
  const dispatchFailure = async (error: unknown): Promise<void> => {
    const diagnostic = addFailureStage(error, state.stage);
    const failure = workflowFailure(diagnostic, state.stage);
    if (diagnostic instanceof OperationFault && diagnostic.code === "IMPORT_OUTCOME_UNKNOWN") {
      await dispatch({ kind: "import-unknown", diagnostic: diagnostic.diagnostic, failure });
      return;
    }
    if (
      state.stage === "ARCHIVE" &&
      diagnostic instanceof OperationFault &&
      ["DEPENDENCY_FAILURE", "DEPENDENCY_TIMEOUT"].includes(diagnostic.code)
    ) {
      await dispatch({ kind: "archive-durability-unknown", diagnostic: diagnostic.diagnostic, failure });
      return;
    }
    if (
      state.stage === "SECRET_CREATION" &&
      diagnostic instanceof OperationFault &&
      diagnostic.code === "DEPENDENCY_TIMEOUT"
    ) {
      await dispatch({ kind: "secret-unknown", diagnostic: diagnostic.diagnostic, failure });
      return;
    }
    await dispatch({
      kind: "dependency-failure",
      code: reducerFailureCode(diagnostic),
      diagnostic: diagnostic instanceof OperationFault ? diagnostic.diagnostic : undefined,
      failure,
    });
  };

  try {
    await dispatch({ kind: "start" });
  } catch (error) {
    await dispatchFailure(error);
  }
  return settlement ?? failure("execute_migration", input.operationID, new OperationFault("INTERNAL_ERROR"));
};
