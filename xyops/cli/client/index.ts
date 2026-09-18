import { fail, CliError } from "../diagnostics";
import type {
  CliDiagnostic,
  EventParameters,
  ResponseSchema,
  VoiceflowEnvelope,
  XYOpsClient,
  XYOpsConfig,
  XYOpsEventReference,
} from "../types";
import { fetchJSON, defaultSleep, type Request, type Sleep } from "./http";
import { eventBody, pollJob, readEventWithRetry } from "./polling";
import { streamJob, type StreamJob } from "./streaming";
import {
  readJobOutput,
  readLaunchID,
  requireEnvelope,
  requireSuccessfulJob,
} from "./job-response";
import { normalizeVoiceflowResponse } from "../guards";
import {
  createJobObservationState,
  transitionJobObservation,
  type JobObservationEffect,
  type JobObservationEvent,
  type JobObservationState,
} from "./job-observation-state-machine";

const RUN_PATH = "/api/app/run_event/v1";
const JOB_PATH = "/api/app/get_job/v1";

type CreateClientDependencies = Readonly<{
  fetcher?: typeof fetch;
  sleeper?: Sleep;
  streamer?: StreamJob;
}>;

// The translation must distinguish transport errors from already-classified CLI failures.
const readCliDiagnostic = (error: unknown): CliDiagnostic | undefined =>
  error instanceof CliError ? error.diagnostic : undefined;
const isUnknownOutcomeTransport = (
  diagnostic: CliDiagnostic | undefined,
): diagnostic is CliDiagnostic =>
  diagnostic !== undefined && ["timeout", "network"].includes(diagnostic.code);
const translateExecuteJobError = (error: unknown): CliError => {
  const diagnostic = readCliDiagnostic(error);
  if (isUnknownOutcomeTransport(diagnostic))
    return fail("execute-outcome-unknown", {
      endpoint: JOB_PATH,
      status: diagnostic.status,
      nextAction:
        "The execute job outcome is unknown; reconcile before retrying.",
    });
  return toCliError(error);
};
const toCliError = (error: unknown): CliError =>
  error instanceof CliError ? error : fail("execute-outcome-unknown");

type DispatchObservation = (
  event: JobObservationEvent,
) => readonly JobObservationEffect[];
type PollObservation = <T>(
  pollJobResult: () => Promise<VoiceflowEnvelope<T>>,
  dispatch: DispatchObservation,
  useStreaming: boolean,
) => Promise<VoiceflowEnvelope<T>>;
/* oxlint-disable complexity -- polling translates terminal outcomes through the reducer. */
const pollObservation: PollObservation = async <T>(
  pollJobResult: () => Promise<VoiceflowEnvelope<T>>,
  dispatch: DispatchObservation,
  useStreaming: boolean,
): Promise<VoiceflowEnvelope<T>> => {
  try {
    const result = await pollJobResult();
    dispatch({ kind: "job-succeeded" });
    return result;
  } catch (error) {
    const diagnostic = error instanceof CliError ? error.diagnostic : undefined;
    dispatch(diagnostic?.code === "job" ? { kind: "job-failed" } : { kind: "poll-timeout" });
    if (useStreaming && diagnostic?.code === "job" && diagnostic.nextAction !== "The migration execute job failed.")
      throw fail("execute-outcome-unknown", { endpoint: JOB_PATH, nextAction: "The execute job outcome is unknown; reconcile before retrying." });
    throw error;
  }
};

// Client construction binds optional infrastructure dependencies once at the boundary.
export const createXYOpsClient = (
  config: XYOpsConfig,
  dependencies: CreateClientDependencies = {},
): XYOpsClient => {
  const fetcher = dependencies.fetcher ?? fetch;
  const sleeper = dependencies.sleeper ?? defaultSleep;
  const streamer = dependencies.streamer ?? streamJob;
  const request: Request = (path, body, endpoint) =>
    fetchJSON(
      fetcher,
      `${config.baseURL}${path}`,
      config.apiKey,
      body,
      config.httpTimeoutMs,
      endpoint,
    );

  const readEvent = <T>(
    reference: XYOpsEventReference,
    params: EventParameters,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> =>
    readEventWithRetry(
      request,
      sleeper,
      config.pollIntervalMs,
      reference,
      params,
      guard,
    );

  const readTerminalStream = async <T>(
    id: string,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> => {
    let streamOrJob: Awaited<ReturnType<typeof streamer>>;
    try {
      streamOrJob = await streamer(
        fetcher,
        config.baseURL,
        config.apiKey,
        id,
        config.httpTimeoutMs,
        {
          maxBytes: config.streamMaxBytes,
          maxFrameBytes: config.streamMaxFrameBytes,
        },
      );
    } catch (error) {
      if (readCliDiagnostic(error) === undefined)
        throw new Error("stream-transport-unknown");
      throw error;
    }
    if ("kind" in streamOrJob && streamOrJob.kind === "failure")
      throw requireSuccessfulJob(
        streamOrJob.data,
        "/api/app/stream_job/v1",
        "The migration execute job failed.",
      );
    try {
      const output = normalizeVoiceflowResponse(
        "kind" in streamOrJob
          ? readJobOutput(streamOrJob.data, "/api/app/stream_job/v1")
          : streamOrJob,
      );
      return requireEnvelope(output, guard, "/api/app/stream_job/v1");
    } catch {
      throw new Error("stream-result-invalid");
    }
  };

  const startJobObservation = <T>(
    id: string,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
    useStreaming: boolean,
  ): Promise<VoiceflowEnvelope<T>> => {
    let state: JobObservationState = createJobObservationState(id);
    const dispatch = (event: JobObservationEvent): readonly JobObservationEffect[] => {
      const transition = transitionJobObservation(state, event);
      if (transition.accepted) state = transition.state;
      return transition.effects;
    };
    const poll = (): Promise<VoiceflowEnvelope<T>> =>
      pollObservation(
        () => pollJob(id, request, sleeper, config, guard),
        dispatch,
        useStreaming,
      );
    const stream = async (): Promise<VoiceflowEnvelope<T>> => {
      try {
        const result = await readTerminalStream(id, guard);
        dispatch({ kind: "stream-succeeded" });
        return result;
      } catch (error) {
        const effects = dispatch({ kind: "stream-failed" });
        if (effects.some((effect) => effect.kind === "start-polling")) return poll();
        throw error;
      }
    };
    const effects = dispatch({ kind: "execute-dispatched", jobID: id });
    if (!useStreaming) {
      const pollingEffects = dispatch({ kind: "polling-started" });
      return pollingEffects.some((effect) => effect.kind === "start-polling")
        ? poll()
        : Promise.reject(fail("execute-outcome-unknown", { endpoint: JOB_PATH }));
    }
    return effects.some((effect) => effect.kind === "start-stream")
      ? stream()
      : Promise.reject(fail("execute-outcome-unknown", { endpoint: JOB_PATH }));
  };

  const executeEvent = async <T>(
    reference: XYOpsEventReference,
    params: EventParameters,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> => {
    try {
      const launch = await request(RUN_PATH, eventBody(reference, params), RUN_PATH);
      const id = readLaunchID(launch, RUN_PATH);
      const useStreaming =
        typeof config.streamMaxBytes === "number" &&
        typeof config.streamMaxFrameBytes === "number";
      return await startJobObservation(id, guard, useStreaming);
    } catch (error) {
      throw translateExecuteJobError(error);
    }
  };

  return { readEvent, executeEvent };
};
