import { fail, CliError } from "../diagnostics";
import type {
  CliDiagnostic,
  EventParameters,
  ResponseGuard,
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
} from "./job-observation-state-machine";

const RUN_PATH = "/api/app/run_event/v1";
const JOB_PATH = "/api/app/get_job/v1";

type CreateClientDependencies = Readonly<{
  fetcher?: typeof fetch;
  sleeper?: Sleep;
  streamer?: StreamJob;
}>;

const readDiagnostic = (error: unknown): CliError["diagnostic"] =>
  error instanceof CliError
    ? error.diagnostic
    : fail("execute-outcome-unknown").diagnostic;

const translateExecuteDispatchError = (error: unknown): CliError => {
  const diagnostic = readDiagnostic(error);
  const code = ["timeout", "network"].includes(diagnostic.code)
    ? "execute-outcome-unknown"
    : diagnostic.code;
  return fail(code, {
    endpoint: RUN_PATH,
    status: diagnostic.status,
    nextAction:
      "The execute dispatch outcome is unknown; reconcile before retrying.",
  });
};

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
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> =>
    readEventWithRetry(
      request,
      sleeper,
      config.pollIntervalMs,
      reference,
      params,
      guard,
    );

  const reconcileAfterStreamFailure = <T>(
    id: string,
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> =>
    pollJob(id, request, sleeper, config, guard).catch((error) => {
      const diagnostic = readCliDiagnostic(error);
      if (
        diagnostic?.code === "job" &&
        diagnostic.nextAction !== "The migration execute job failed."
      )
        return Promise.reject(
          fail("execute-outcome-unknown", {
            endpoint: JOB_PATH,
            nextAction:
              "The execute job outcome is unknown; reconcile before retrying.",
          }),
        );
      return Promise.reject(error);
    });

  const readTerminalStream = <T>(
    id: string,
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ) => {
    const streamOrJob = streamer(
      fetcher,
      config.baseURL,
      config.apiKey,
      id,
      config.httpTimeoutMs,
      {
        maxBytes: config.streamMaxBytes,
        maxFrameBytes: config.streamMaxFrameBytes,
      },
    ).catch((error) =>
      readCliDiagnostic(error) === undefined
        ? Promise.reject(
            fail("execute-outcome-unknown", {
              endpoint: "/api/app/stream_job/v1",
              nextAction:
                "The execute stream outcome is unknown; reconcile before retrying.",
            }),
          )
        : reconcileAfterStreamFailure(id, guard),
    );
    return streamOrJob.then((streamOrJobResult) => {
      if (!("kind" in streamOrJobResult)) return streamOrJobResult;
      if (streamOrJobResult.kind === "failure")
        return Promise.reject(
          requireSuccessfulJob(
            streamOrJobResult.data,
            "/api/app/stream_job/v1",
            "The migration execute job failed.",
          ),
        );
      try {
        const output = normalizeVoiceflowResponse(
          readJobOutput(streamOrJobResult.data, "/api/app/stream_job/v1"),
        );
        return requireEnvelope(output, guard, "/api/app/stream_job/v1");
      } catch {
        return reconcileAfterStreamFailure(id, guard);
      }
    });
  };

  const startJobObservation = <T>(
    id: string,
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> => {
    const transition = transitionJobObservation(
      createJobObservationState(id),
      { kind: "execute-dispatched", jobID: id },
    );
    return transition.state.kind === "STREAMING"
      ? readTerminalStream(id, guard)
      : Promise.reject(
          fail("execute-outcome-unknown", {
            endpoint: RUN_PATH,
            retryable: true,
            nextAction: "The execute observation could not start; reconcile before retrying.",
          }),
        );
  };

  const executeEvent = <T>(
    reference: XYOpsEventReference,
    params: EventParameters,
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> =>
    request(RUN_PATH, eventBody(reference, params), RUN_PATH)
      .catch((error) => Promise.reject(translateExecuteDispatchError(error)))
      .then((launch) => readLaunchID(launch, RUN_PATH))
      .then((id) =>
        typeof config.streamMaxBytes === "number" &&
        typeof config.streamMaxFrameBytes === "number"
          ? startJobObservation(id, guard)
          : pollJob(id, request, sleeper, config, guard),
      )
      .catch((error) => Promise.reject(translateExecuteJobError(error)));

  return { readEvent, executeEvent };
};
