import { fail, type CliError } from "../diagnostics";
import { isCompletedJob, normalizeVoiceflowResponse } from "../guards";
import type {
  EventParameters,
  ResponseSchema,
  VoiceflowEnvelope,
  XYOpsConfig,
  XYOpsEventReference,
  XYOpsJob,
} from "../types";
import { type Request, type Sleep } from "./http";
import {
  readJobOutput,
  readJobResponse,
  readWaitResponseData,
  requireEnvelope,
  requireSuccessfulJob,
} from "./job-response";

const WAIT_PATH = "/api/app/run_event/v1/wait";
const JOB_PATH = "/api/app/get_job/v1";
export const MAX_POLL_ATTEMPTS = 100;

type EventBody = (
  reference: XYOpsEventReference,
  params: EventParameters,
) => Readonly<Record<string, unknown>>;
export const eventBody: EventBody = (reference, params) => ({
  ...(typeof reference === "string" ? { title: reference } : reference),
  params,
});

export const readEventOnce = <T>(
  request: Request,
  reference: XYOpsEventReference,
  params: EventParameters,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
): Promise<VoiceflowEnvelope<T>> =>
  readEventAttempt(request, reference, params, guard);

const readEventAttempt = <T>(
  request: Request,
  reference: XYOpsEventReference,
  params: EventParameters,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
): Promise<VoiceflowEnvelope<T>> =>
  request(WAIT_PATH, eventBody(reference, params), WAIT_PATH)
    .then((response) =>
      normalizeVoiceflowResponse(readWaitResponseData(response, WAIT_PATH)),
    )
    .then((data) => requireEnvelope(data, guard, WAIT_PATH));

export const completeJob = <T>(
  job: XYOpsJob,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
): VoiceflowEnvelope<T> => {
  const result = normalizeVoiceflowResponse(
    readJobOutput(
      requireSuccessfulJob(job, JOB_PATH, "The migration execute job failed."),
      JOB_PATH,
    ),
  );
  const parsed = guard.safeParse(result);
  if (!parsed.success)
    throw fail("envelope", {
      endpoint: JOB_PATH,
      nextAction: "The execute job returned an invalid envelope.",
    });
  return parsed.data;
};

// Polling intentionally checks completion and deadline at each remote observation.
const pollUntilComplete = async <T>(
  id: string,
  request: Request,
  sleeper: Sleep,
  intervalMs: number,
  deadline: number,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
  attempt: number,
): Promise<VoiceflowEnvelope<T>> => {
  if (Date.now() >= deadline || attempt > MAX_POLL_ATTEMPTS)
    return Promise.reject(pollingDeadlineError());
  const job = readJobResponse(
    await request(JOB_PATH, { id }, JOB_PATH),
    JOB_PATH,
  );
  if (isCompletedJob(job.completed)) return completeJob(job, guard);
  return pollIncompleteJob(
    id,
    request,
    sleeper,
    intervalMs,
    deadline,
    guard,
    attempt,
  );
};
const pollIncompleteJob = async <T>(
  id: string,
  request: Request,
  sleeper: Sleep,
  intervalMs: number,
  deadline: number,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
  attempt: number,
): Promise<VoiceflowEnvelope<T>> => {
  if (attempt >= MAX_POLL_ATTEMPTS)
    return Promise.reject(pollingDeadlineError());
  await waitForNextPoll(sleeper, intervalMs, deadline);
  if (Date.now() >= deadline) return Promise.reject(pollingDeadlineError());
  return pollUntilComplete(
    id,
    request,
    sleeper,
    intervalMs,
    deadline,
    guard,
    attempt + 1,
  );
};
const pollingDeadlineError = (): CliError =>
  fail("execute-outcome-unknown", {
    endpoint: JOB_PATH,
    retryable: true,
    nextAction: "The execute job timed out; reconcile before retrying.",
  });

const waitForNextPoll = async (
  sleeper: Sleep,
  intervalMs: number,
  deadline: number,
): Promise<void> => {
  await sleeper(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
};

export const pollJob = <T>(
  id: string,
  request: Request,
  sleeper: Sleep,
  config: XYOpsConfig,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
): Promise<VoiceflowEnvelope<T>> => {
  if (!validPollingConfig(config.pollIntervalMs, config.pollTimeoutMs))
    return Promise.reject(
      fail("execute-outcome-unknown", {
        endpoint: JOB_PATH,
        nextAction: "Polling configuration is invalid; reconcile explicitly.",
      }),
    );
  return pollUntilComplete(
    id,
    request,
    sleeper,
    config.pollIntervalMs,
    Date.now() + config.pollTimeoutMs,
    guard,
    1,
  );
};

const validPollingConfig = (intervalMs: number, timeoutMs: number): boolean =>
  [
    Number.isFinite(intervalMs),
    intervalMs > 0,
    Number.isFinite(timeoutMs),
    timeoutMs > 0,
  ].every(Boolean);
