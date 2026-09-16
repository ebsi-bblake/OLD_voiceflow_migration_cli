/* oxlint-disable complexity -- bounded retry orchestration is explicit. */
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
type LoadProjects = (auth: AuthContext, workspaceID: string) => Promise<readonly ProjectRecord[]>;
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
const isCancelled = (signal: AbortSignal | undefined): boolean => signal?.aborted === true;
const isPermanentFailure = (error: unknown): error is OperationFault =>
  error instanceof OperationFault &&
  ["AUTHENTICATION_FAILED", "INVALID_ARGUMENT", "NOT_FOUND"].includes(error.code);
const safeFailureCategory = (error: unknown): string => {
  if (error instanceof OperationFault) return error.code.toLowerCase();
  return "dependency-failure";
};
const boundedDiagnostic = (value: string): string => value.slice(0, MAX_DIAGNOSTIC_LENGTH);
const exhaustedDiagnostic = (attempt: number, reason: string): string =>
  boundedDiagnostic(`archive-durability confirmation attempt ${attempt} of ${MAX_CONFIRMATION_ATTEMPTS} failed (${reason})`);
const cancellationError = (): OperationFault =>
  new OperationFault("INTERNAL_ERROR", false, "rename-durability-cancelled");
const timeoutError = (diagnostic: string): OperationFault =>
  new OperationFault("DEPENDENCY_TIMEOUT", true, boundedDiagnostic(diagnostic));

const projectMatches = (
  projects: readonly ProjectRecord[],
  expected: ProjectState,
): ProjectRecord | undefined => {
  const candidates = projects.filter((project) => project.id === expected.projectID);
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
        () => finish(() => reject(new OperationFault("DEPENDENCY_TIMEOUT", true))),
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
    if (isCancelled(options.signal)) throw cancellationError();
    const remaining = deadline - now();
    if (remaining <= 0)
      throw timeoutError(exhaustedDiagnostic(attempt - 1, "deadline-exceeded"));
    state = transitionRenameDurability(state, {
      kind: "start-attempt",
      attempt,
      attemptID,
      limit: MAX_CONFIRMATION_ATTEMPTS,
      deadline,
    }).state;
    try {
      const projects = await readWithDeadline(readProjects(auth, expected.workspaceID), remaining);
      if (isCancelled(options.signal)) throw cancellationError();
      const project = projectMatches(projects, expected);
      if (now() <= deadline && project !== undefined) {
        state = transitionRenameDurability(state, {
          kind: "catalog-result",
          attemptID,
          matches: true,
          project: {
            id: project.id,
            workspaceID: project.workspaceID,
            folderID: project.folderID ?? "",
            name: project.label,
          },
        }).state;
        if (state.kind === "CONFIRMED") return;
      }
    } catch (error) {
      if (isCancelled(options.signal)) throw cancellationError();
      if (isPermanentFailure(error))
        throw new OperationFault(error.code, error.retryable, boundedDiagnostic(`archive-durability ${safeFailureCategory(error)}`));
      if (now() >= deadline)
        throw timeoutError(exhaustedDiagnostic(attempt, safeFailureCategory(error)));
    }
    if (now() >= deadline || attempt === MAX_CONFIRMATION_ATTEMPTS)
      throw timeoutError(exhaustedDiagnostic(attempt, safeFailureCategory(undefined)));
    const retryDeadline = Math.min(now() + CONFIRMATION_INTERVAL_MS, deadline);
    state = scheduleRenameDurabilityRetry(
      state as Extract<RenameDurabilityState, { readonly kind: "ATTEMPTING" }>,
      retryDeadline,
    );
    try {
      await sleep(Math.max(0, retryDeadline - now()));
    } catch {
      state = transitionRenameDurability(state, { kind: "timer-failure", diagnostic: "archive-durability retry timer failed" }).state;
      throw new OperationFault("DEPENDENCY_FAILURE", true, "archive-durability retry timer failed");
    }
    if (isCancelled(options.signal)) throw cancellationError();
    state = transitionRenameDurability(state, {
      kind: "retry-timer",
      attemptID: state.kind === "WAITING_TO_RETRY" ? state.attemptID : attemptID,
      nextAttemptID: createUUID(),
      deadline: retryDeadline,
    }).state;
    attemptID = state.kind === "ATTEMPTING" ? state.attemptID : createUUID();
    attempt += 1;
  }
  throw timeoutError(exhaustedDiagnostic(MAX_CONFIRMATION_ATTEMPTS, "attempt-limit"));
};
