import type { AuthContext, ProjectRecord } from "../types";
import { OperationFault } from "../contracts";
import { createUUID } from "../uuid";
import { loadProjects } from "./options";
import {
  createRenameDurabilityState,
  scheduleRenameDurabilityRetry,
  transitionRenameDurability,
  type RenameDurabilityContext,
  type RenameDurabilityState,
} from "./rename-durability-state-machine";

export const MAX_CONFIRMATION_ATTEMPTS = 5;
export const CONFIRMATION_INTERVAL_MS = 250;
export const CONFIRMATION_DEADLINE_MS = 15_000;
const MAX_DIAGNOSTIC_LENGTH = 240;

type ProjectState = RenameDurabilityContext;
type LoadProjects = (
  auth: AuthContext,
  workspaceID: string,
) => Promise<readonly ProjectRecord[]>;
type Sleep = (milliseconds: number) => Promise<void>;

type ConfirmProjectRenameOptions = Readonly<{
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  readonly sleep?: Sleep;
  readonly load?: LoadProjects;
}>;

const defaultSleep: Sleep = (milliseconds) =>
  new Promise<void>((resolve, reject) => {
    try {
      const timer = setTimeout(resolve, milliseconds);
      if (timer === undefined) reject(new Error("timer-setup-failed"));
    } catch {
      reject(new Error("timer-setup-failed"));
    }
  });
const isCancelled = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;
const isPermanentFailure = (error: unknown): error is OperationFault =>
  error instanceof OperationFault &&
  ["AUTHENTICATION_FAILED", "INVALID_ARGUMENT", "NOT_FOUND"].includes(
    error.code,
  );
const safeFailureCategory = (error: unknown): string => {
  if (error instanceof OperationFault) return error.code.toLowerCase();
  return "dependency-failure";
};
const boundedDiagnostic = (value: string): string =>
  value.slice(0, MAX_DIAGNOSTIC_LENGTH);
const exhaustedDiagnostic = (attempt: number, reason: string): string =>
  boundedDiagnostic(
    `archive-durability confirmation attempt ${attempt} of ${MAX_CONFIRMATION_ATTEMPTS} failed (${reason})`,
  );
const cancellationError = (): OperationFault =>
  new OperationFault("INTERNAL_ERROR", false, "rename-durability-cancelled");
const timeoutError = (diagnostic: string): OperationFault =>
  new OperationFault("DEPENDENCY_TIMEOUT", true, boundedDiagnostic(diagnostic));

const projectMatches = (
  projects: readonly ProjectRecord[],
  expected: ProjectState,
): ProjectRecord | undefined => {
  const candidates = projects.filter(
    (project) => project.id === expected.projectID,
  );
  if (candidates.length !== 1) return undefined;
  const project = candidates[0];
  return project !== undefined &&
    project.workspaceID === expected.workspaceID &&
    project.folderID === expected.folderID &&
    project.label === expected.name
    ? project
    : undefined;
};

const readWithDeadline = <T>(
  operation: Promise<T>,
  remainingMilliseconds: number,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      result();
    };
    try {
      timer = setTimeout(
        () =>
          finish(() => reject(new OperationFault("DEPENDENCY_TIMEOUT", true))),
        remainingMilliseconds,
      );
      operation.then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
    } catch (error) {
      finish(() => reject(error));
    }
  });

export type ConfirmProjectRename = (
  auth: AuthContext,
  state: ProjectState,
  options?: ConfirmProjectRenameOptions,
) => Promise<void>;
type AttemptResult = Readonly<{
  readonly state: RenameDurabilityState;
  readonly confirmed: boolean;
}>;

type AttemptOptions = Readonly<{
  readonly auth: AuthContext;
  readonly expected: ProjectState;
  readonly signal?: AbortSignal;
  readonly now: () => number;
  readonly readProjects: LoadProjects;
  readonly deadline: number;
  readonly remaining: number;
  readonly attemptID: string;
  readonly state: RenameDurabilityState;
}>;

const startRenameAttempt = (
  state: RenameDurabilityState,
  attempt: number,
  attemptID: string,
  deadline: number,
): RenameDurabilityState =>
  transitionRenameDurability(state, {
    kind: "start-attempt",
    attempt,
    attemptID,
    limit: MAX_CONFIRMATION_ATTEMPTS,
    deadline,
  }).state;

const handleAttemptFailure = (
  error: unknown,
  signal: AbortSignal | undefined,
  now: () => number,
  deadline: number,
  attempt: number,
): void => {
  if (isCancelled(signal)) throw cancellationError();
  if (isPermanentFailure(error))
    throw new OperationFault(
      error.code,
      error.retryable,
      boundedDiagnostic(`archive-durability ${safeFailureCategory(error)}`),
    );
  if (now() >= deadline)
    throw timeoutError(
      exhaustedDiagnostic(attempt, safeFailureCategory(error)),
    );
};

const performRenameAttempt = async (
  options: AttemptOptions,
): Promise<AttemptResult> => {
  try {
    const projects = await readWithDeadline(
      options.readProjects(options.auth, options.expected.workspaceID),
      options.remaining,
    );
    if (isCancelled(options.signal)) throw cancellationError();
    const project = projectMatches(projects, options.expected);
    if (options.now() > options.deadline || project === undefined)
      return { state: options.state, confirmed: false };
    const state = transitionRenameDurability(options.state, {
      kind: "catalog-result",
      attemptID: options.attemptID,
      matches: true,
      project: {
        id: project.id,
        workspaceID: project.workspaceID,
        folderID: project.folderID ?? "",
        name: project.label,
      },
    }).state;
    return { state, confirmed: state.kind === "CONFIRMED" };
  } catch (error) {
    handleAttemptFailure(
      error,
      options.signal,
      options.now,
      options.deadline,
      options.state.kind === "ATTEMPTING" ? options.state.attempt : 0,
    );
    return { state: options.state, confirmed: false };
  }
};

const waitForRenameRetry = async (
  state: RenameDurabilityState,
  attemptID: string,
  retryDeadline: number,
  sleep: Sleep,
  now: () => number,
  signal: AbortSignal | undefined,
): Promise<RenameDurabilityState> => {
  try {
    await sleep(Math.max(0, retryDeadline - now()));
  } catch {
    return transitionRenameDurability(state, {
      kind: "timer-failure",
      diagnostic: "archive-durability retry timer failed",
    }).state;
  }
  if (isCancelled(signal)) throw cancellationError();
  return transitionRenameDurability(state, {
    kind: "retry-timer",
    attemptID: state.kind === "WAITING_TO_RETRY" ? state.attemptID : attemptID,
    nextAttemptID: createUUID(),
    deadline: retryDeadline,
  }).state;
};

type AttemptCycleOptions = Readonly<{
  readonly auth: AuthContext;
  readonly expected: ProjectState;
  readonly state: RenameDurabilityState;
  readonly attempt: number;
  readonly attemptID: string;
  readonly deadline: number;
  readonly now: () => number;
  readonly sleep: Sleep;
  readonly readProjects: LoadProjects;
  readonly signal?: AbortSignal;
}>;

type AttemptCycleResult = Readonly<{
  readonly state: RenameDurabilityState;
  readonly confirmed: boolean;
  readonly attemptID: string;
}>;

const remainingAttemptTime = (
  signal: AbortSignal | undefined,
  now: () => number,
  deadline: number,
  attempt: number,
): number => {
  if (isCancelled(signal)) throw cancellationError();
  const remaining = deadline - now();
  if (remaining <= 0)
    throw timeoutError(exhaustedDiagnostic(attempt - 1, "deadline-exceeded"));
  return remaining;
};

const ensureRetryCanStart = (
  now: () => number,
  deadline: number,
  attempt: number,
): void => {
  if (now() >= deadline || attempt === MAX_CONFIRMATION_ATTEMPTS)
    throw timeoutError(
      exhaustedDiagnostic(attempt, safeFailureCategory(undefined)),
    );
};

const throwIfRetryTimerFailed = (state: RenameDurabilityState): void => {
  if (state.kind === "FAILED")
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      true,
      "archive-durability retry timer failed",
    );
};

const runRenameAttemptCycle = async (
  options: AttemptCycleOptions,
): Promise<AttemptCycleResult> => {
  const remaining = remainingAttemptTime(
    options.signal,
    options.now,
    options.deadline,
    options.attempt,
  );
  const state = startRenameAttempt(
    options.state,
    options.attempt,
    options.attemptID,
    options.deadline,
  );
  const result = await performRenameAttempt({
    auth: options.auth,
    expected: options.expected,
    signal: options.signal,
    now: options.now,
    readProjects: options.readProjects,
    deadline: options.deadline,
    remaining,
    attemptID: options.attemptID,
    state,
  });
  if (result.confirmed)
    return {
      state: result.state,
      confirmed: true,
      attemptID: options.attemptID,
    };
  ensureRetryCanStart(options.now, options.deadline, options.attempt);
  const retryDeadline = Math.min(
    options.now() + CONFIRMATION_INTERVAL_MS,
    options.deadline,
  );
  const waitingState = scheduleRenameDurabilityRetry(
    result.state as Extract<
      RenameDurabilityState,
      { readonly kind: "ATTEMPTING" }
    >,
    retryDeadline,
  );
  const nextState = await waitForRenameRetry(
    waitingState,
    options.attemptID,
    retryDeadline,
    options.sleep,
    options.now,
    options.signal,
  );
  throwIfRetryTimerFailed(nextState);
  return {
    state: nextState,
    confirmed: false,
    attemptID:
      nextState.kind === "ATTEMPTING" ? nextState.attemptID : createUUID(),
  };
};

export const confirmProjectRename: ConfirmProjectRename = async (
  auth,
  expected,
  options = {},
) => {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const readProjects = options.load ?? loadProjects;
  const deadline = now() + CONFIRMATION_DEADLINE_MS;
  let state: RenameDurabilityState = createRenameDurabilityState(expected);
  let attempt = 1;
  let attemptID = createUUID();

  while (attempt <= MAX_CONFIRMATION_ATTEMPTS) {
    const result = await runRenameAttemptCycle({
      auth,
      expected,
      state,
      attempt,
      attemptID,
      deadline,
      now,
      sleep,
      readProjects,
      signal: options.signal,
    });
    state = result.state;
    if (result.confirmed) return;
    attemptID = result.attemptID;
    attempt += 1;
  }
  throw timeoutError(
    exhaustedDiagnostic(MAX_CONFIRMATION_ATTEMPTS, "attempt-limit"),
  );
};
