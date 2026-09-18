import { failure, OperationFault } from "../../contracts";
import {
  createMigrationWorkflow,
  transitionMigrationWorkflow,
  type MigrationWorkflowEffect,
  type MigrationWorkflowEvent,
  type MigrationWorkflowFailure,
  type MigrationWorkflowState,
} from "../../execute-migration-state-machine";
import type { Envelope, ExecuteResult } from "../../types";
import {
  defaultMigrationRuntimeDependencies,
  type ExecuteMigrationInput,
  type MigrationRuntimeDependencies,
} from "./dependencies";
import { createMigrationEffectHandlers } from "./handlers";
import { addFailureStage, workflowFailure } from "./failure-mapping";
import type { EffectHandlerMap, EffectResult } from "./types";

export type RunMigrationWorkflow = (
  input: ExecuteMigrationInput,
  dependencies?: MigrationRuntimeDependencies,
) => Promise<Envelope<ExecuteResult>>;

type MigrationWorkflowRuntime = {
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
    return { kind: "import-unknown", failure: workflowError };
  if (isArchiveDurabilityUnknown(runtime.state, diagnostic))
    return { kind: "archive-durability-unknown", failure: workflowError };
  if (isSecretOutcomeUnknown(runtime.state, diagnostic))
    return { kind: "secret-unknown", failure: workflowError };
  return { kind: "dependency-failure", failure: workflowError };
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
