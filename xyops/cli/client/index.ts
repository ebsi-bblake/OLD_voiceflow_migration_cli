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
  readJobResponse,
  readLaunchID,
  requireEnvelope,
  requireSuccessfulJob,
} from "./job-response";
import { normalizeVoiceflowResponse } from "../guards";

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
const translateExecuteStreamError = (error: unknown): CliError => {
  const diagnostic = readCliDiagnostic(error);
  return fail("execute-outcome-unknown", {
    endpoint: "/api/app/stream_job/v1",
    status: diagnostic?.status,
    nextAction:
      "The execute stream outcome is unknown; reconcile before retrying.",
  });
};
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

  const readFinalJob = <T>(
    id: string,
    guard: ResponseGuard<VoiceflowEnvelope<T>>,
  ): Promise<VoiceflowEnvelope<T>> =>
    request(JOB_PATH, { id }, JOB_PATH)
      .then((response) => readJobResponse(response, JOB_PATH))
      .then((job) =>
        normalizeVoiceflowResponse(
          readJobOutput(
            requireSuccessfulJob(
              job,
              JOB_PATH,
              "The migration execute job failed.",
            ),
            JOB_PATH,
          ),
        ),
      )
      .then((data) => requireEnvelope(data, guard, JOB_PATH));

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
    ).catch((error) => {
      const diagnostic = readCliDiagnostic(error);
      return diagnostic?.code === "stream"
        ? readFinalJob(id, guard)
        : Promise.reject(translateExecuteStreamError(error));
    });
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
        return readFinalJob(id, guard);
      }
    });
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
          ? readTerminalStream(id, guard)
          : pollJob(id, request, sleeper, config, guard),
      )
      .catch((error) => Promise.reject(translateExecuteJobError(error)));

  return { readEvent, executeEvent };
};
