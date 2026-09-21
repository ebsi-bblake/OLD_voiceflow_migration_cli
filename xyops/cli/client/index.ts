import { fail, CliError } from "../diagnostics";
import type {
  CliDiagnostic,
  EventParameters,
  ResponseSchema,
  VoiceflowEnvelope,
  XYOpsClient,
  XYOpsConfig,
  XYOpsEventReference,
  XYOpsJob,
} from "../types";
import { fetchJSON, defaultSleep, type Request, type Sleep } from "./http";
import { completeJob, eventBody, pollJob, readEventOnce } from "./polling";
import { streamJob, type StreamJob } from "./streaming";
import {
  readJobOutput,
  readJobResponse,
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
      ...(diagnostic.diagnostic === undefined
        ? {}
        : { diagnostic: diagnostic.diagnostic }),
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

const pollFailureEvent = (error: unknown): JobObservationEvent => {
  const diagnostic = readCliDiagnostic(error);
  return diagnostic?.code === "job"
    ? { kind: "job-failed" }
    : { kind: "poll-timeout" };
};

const streamingUnknownOutcome = (
  diagnostic: CliDiagnostic | undefined,
  useStreaming: boolean,
): CliError | undefined => {
  if (!useStreaming || diagnostic?.code !== "job") return undefined;
  return fail("execute-outcome-unknown", {
    endpoint: JOB_PATH,
    nextAction:
      "The execute job outcome is unknown; reconcile before retrying.",
    ...(diagnostic.diagnostic === undefined
      ? {}
      : { diagnostic: diagnostic.diagnostic }),
  });
};

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
    const diagnostic = readCliDiagnostic(error);
    dispatch(pollFailureEvent(error));
    const unknownOutcome = streamingUnknownOutcome(diagnostic, useStreaming);
    if (unknownOutcome !== undefined) throw unknownOutcome;
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
    readEventOnce(request, reference, params, guard);

  const readStreamOrJob = async (
    id: string,
  ): Promise<Awaited<ReturnType<typeof streamer>>> => {
    try {
      return await streamer(
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
      if (readCliDiagnostic(error) !== undefined) throw error;
      throw fail("network", {
        endpoint: "/api/app/stream_job/v1",
        retryable: true,
        nextAction: "The XYOps stream transport failed.",
      });
    }
  };

  const parseTerminalStream = <T>(
    streamOrJob: Awaited<ReturnType<typeof streamer>>,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): VoiceflowEnvelope<T> => {
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
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw fail("stream", {
        endpoint: "/api/app/stream_job/v1",
        nextAction: "The XYOps stream result was invalid.",
      });
    }
  };

  const readTerminalStreamResult = async <T>(
    id: string,
    streamOrJob: Awaited<ReturnType<typeof streamer>>,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> => {
    if (!("kind" in streamOrJob) || !streamOrJob.requiresJobResponse)
      return parseTerminalStream(streamOrJob, guard);
    // SSE carries the terminal status, while get_job carries the plugin output.
    // Read it once after SSE completion; do not turn this final reconciliation
    // into a second polling loop.
    const job = readJobResponse(
      await request(JOB_PATH, { id }, JOB_PATH),
      JOB_PATH,
    );
    return completeJob(job, guard);
  };

  const startJobObservation = <T>(
    id: string,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
    useStreaming: boolean,
  ): Promise<VoiceflowEnvelope<T>> => {
    let state: JobObservationState = createJobObservationState(id);
    const dispatch = (
      event: JobObservationEvent,
    ): readonly JobObservationEffect[] => {
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
      let streamOrJob: Awaited<ReturnType<typeof streamer>>;
      try {
        streamOrJob = await readStreamOrJob(id);
      } catch (error) {
        const effects = dispatch({ kind: "stream-failed" });
        if (effects.some((effect) => effect.kind === "start-polling"))
          return poll();
        throw error;
      }
      // A completed SSE stream is authoritative about job completion. If the
      // terminal output fetch fails, preserve that reconciliation failure rather
      // than silently restarting polling after the mutation has run.
      const result = await readTerminalStreamResult(id, streamOrJob, guard);
      dispatch({ kind: "stream-succeeded" });
      return result;
    };
    const effects = dispatch({ kind: "execute-dispatched", jobID: id });
    if (!useStreaming) {
      const pollingEffects = dispatch({ kind: "polling-started" });
      return pollingEffects.some((effect) => effect.kind === "start-polling")
        ? poll()
        : Promise.reject(
            fail("execute-outcome-unknown", { endpoint: JOB_PATH }),
          );
    }
    return effects.some((effect) => effect.kind === "start-stream")
      ? stream()
      : Promise.reject(fail("execute-outcome-unknown", { endpoint: JOB_PATH }));
  };

  const isFinalJob = (job: XYOpsJob): boolean =>
    job.final === true ||
    job.state === "complete" ||
    (job.completed !== undefined && job.completed !== null);

  const readObservedJob = (id: string): Promise<XYOpsJob> =>
    request(JOB_PATH, { id }, JOB_PATH).then((response) =>
      readJobResponse(response, JOB_PATH),
    );

  const observeWorkflow: XYOpsClient["observeWorkflow"] = async (id) => {
    try {
      const streamed = await streamer(
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
      if (streamed.requiresJobResponse) return await readObservedJob(id);
      return {
        id,
        code: streamed.code,
        data: streamed.data,
        final: true,
      };
    } catch {
      const deadline = Date.now() + config.pollTimeoutMs;
      let attempt = 0;
      while (Date.now() <= deadline) {
        const job = await readObservedJob(id);
        if (isFinalJob(job)) return job;
        attempt += 1;
        await sleeper(Math.min(config.pollIntervalMs * attempt, config.pollIntervalMs * 10));
      }
      throw fail("execute-outcome-unknown", {
        endpoint: JOB_PATH,
        nextAction: "The workflow outcome is unknown; reconcile before retrying.",
      });
    }
  };

  const startWorkflow: XYOpsClient["startWorkflow"] = async (
    reference,
    input,
    params = {},
  ) => {
    const launch = await request(
      RUN_PATH,
      { ...eventBody(reference, params), input: { data: input } },
      RUN_PATH,
    );
    return readLaunchID(launch, RUN_PATH);
  };

  const executeEvent = async <T>(
    reference: XYOpsEventReference,
    params: EventParameters,
    guard: ResponseSchema<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> => {
    try {
      const launch = await request(
        RUN_PATH,
        eventBody(reference, params),
        RUN_PATH,
      );
      const id = readLaunchID(launch, RUN_PATH);
      const useStreaming =
        typeof config.streamMaxBytes === "number" &&
        typeof config.streamMaxFrameBytes === "number";
      return await startJobObservation(id, guard, useStreaming);
    } catch (error) {
      throw translateExecuteJobError(error);
    }
  };

  return { readEvent, executeEvent, startWorkflow, observeWorkflow };
};
