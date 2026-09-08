import { fail } from "../diagnostics";
import { VoiceflowRegex } from "../../voiceflow/regex";
import {
  isJobLaunch,
  isRecord,
  isSuccessfulCode,
  isXYOpsJob,
  isXYOpsJobResponse,
  isXYOpsLaunchResponse,
  isXYOpsWaitResponse,
} from "../guards";
import type {
  ResponseGuard,
  VoiceflowEnvelope,
  XYOpsJob,
  XYOpsResponse,
} from "../types";

const hasResponseData = (
  response: XYOpsResponse,
): response is XYOpsResponse & { data: unknown } => "data" in response;

const recordChildren = (value: unknown): readonly unknown[] =>
  isRecord(value) ? [value.job, value.data] : [];

const readJobValue = (value: unknown): XYOpsJob | undefined =>
  isXYOpsJob(value) ? value : undefined;

const readJobContainer = (value: unknown): XYOpsJob | undefined =>
  [value, ...recordChildren(value)]
    .map(readJobValue)
    .find((job): job is XYOpsJob => job !== undefined);

const readTopLaunchID = (response: XYOpsResponse): string | undefined =>
  isXYOpsLaunchResponse(response) ? response.id : undefined;

const readDataLaunchID = (response: XYOpsResponse): string | undefined => {
  if (!hasResponseData(response)) return undefined;
  return [response.data, ...recordChildren(response.data)]
    .map((value) => (isJobLaunch(value) ? value.id : undefined))
    .find((id): id is string => id !== undefined);
};

export const readLaunchID = (
  response: XYOpsResponse,
  endpoint: string,
): string => {
  const id = [readTopLaunchID(response), readDataLaunchID(response)].find(
    (candidate) => candidate !== undefined,
  );
  if (id !== undefined) return id;
  throw fail("execute-outcome-unknown", {
    endpoint,
    nextAction:
      "The execute dispatch outcome is unknown; reconcile before retrying.",
  });
};

// XYOps has two supported response envelopes for jobs.
const findResponseJob = (response: XYOpsResponse): XYOpsJob | undefined =>
  isXYOpsJobResponse(response)
    ? response.job
    : hasResponseData(response)
      ? readJobContainer(response.data)
      : undefined;

const sensitiveField = VoiceflowRegex.xyopsSensitiveField;

// Debug logging is deliberately isolated and redacts sensitive DTO branches.
const redactResponseDTO = (value: unknown, key = ""): unknown => {
  if (sensitiveField.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redactResponseDTO(item));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactResponseDTO(entryValue, entryKey),
    ]),
  );
};

const logInvalidJobResponseShape = (response: XYOpsResponse): void => {
  if (process.env.XYOPS_DEBUG_RESPONSE_SHAPE !== "1") return;
  console.error(
    "[xyops] invalid get_job response",
    redactResponseDTO(response),
  );
};

export const readJobResponse = (
  response: XYOpsResponse,
  endpoint: string,
): XYOpsJob => {
  const job = findResponseJob(response);
  if (job !== undefined) return job;
  logInvalidJobResponseShape(response);
  throw fail("job", {
    endpoint,
    nextAction: "XYOps returned an invalid job response.",
  });
};

type XYOpsJobResult = Readonly<{
  code?: number | string;
  state?: string;
  description?: string;
  output?: string | null;
  data?: unknown;
}>;

const MAX_FAILURE_DESCRIPTION_LENGTH = 240;

const hasSensitiveDetail = (value: string): boolean =>
  [
    VoiceflowRegex.failureSensitiveDetail,
    VoiceflowRegex.jwt,
    VoiceflowRegex.longSecretToken,
  ].some((pattern) => pattern.test(value));

const selectFailureDetail = (job: XYOpsJobResult): string | undefined =>
  [job.description, job.output].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

const normalizeFailureDetail = (value: string): string =>
  value
    .replace(VoiceflowRegex.nonPrintable, " ")
    .replace(VoiceflowRegex.whitespace, " ")
    .trim();

// These checks intentionally guard against accidentally exposing structured or secret data.
const isUnsafeFailureDetail = (value: string): boolean =>
  !value ||
  value.startsWith("{") ||
  value.startsWith("[") ||
  hasSensitiveDetail(value);

const failureStage = (value: string): string | undefined =>
  value.match(/stage=[a-z-]+(?: api-key-(?:http-\d+|response))?/i)?.[0];

const boundFailureDetail = (value: string): string =>
  value.length <= MAX_FAILURE_DESCRIPTION_LENGTH
    ? value
    : `${value.slice(0, MAX_FAILURE_DESCRIPTION_LENGTH - 1).trimEnd()}…`;

const logFailedJobResponse = (job: XYOpsJobResult): void => {
  if (process.env.XYOPS_DEBUG_RESPONSE_SHAPE !== "1") return;
  console.error("[xyops] failed get_job response", redactResponseDTO(job));
};

// Failure descriptions are sanitized before crossing the CLI boundary.
const describeFailure = (job: XYOpsJobResult, fallback: string): string => {
  const detail = selectFailureDetail(job);
  if (detail === undefined) return fallback;
  const normalized = normalizeFailureDetail(detail);
  if (!isUnsafeFailureDetail(normalized)) return boundFailureDetail(normalized);
  const stage = failureStage(normalized);
  return stage === undefined
    ? "XYOps reported a job failure."
    : `XYOps reported a job failure (${stage}).`;
};

export const requireSuccessfulJob = (
  job: XYOpsJobResult,
  endpoint: string,
  fallback: string,
): XYOpsJobResult => {
  if (!hasSuccessfulJobCode(job)) {
    logFailedJobResponse(job);
    throw fail("job", { endpoint, nextAction: describeFailure(job, fallback) });
  }
  return job;
};

const hasSuccessfulJobCode = (job: XYOpsJobResult): boolean =>
  job.code !== undefined && isSuccessfulCode(job.code);

const parseJobOutput = (output: string, endpoint: string): unknown => {
  try {
    return JSON.parse(output) as unknown;
  } catch {
    throw fail("job", {
      endpoint,
      nextAction: "XYOps returned malformed job output.",
    });
  }
};

const hasReadableOutput = (
  job: XYOpsJobResult,
): job is XYOpsJobResult & { output: string } =>
  typeof job.output === "string" && job.output.trim().length > 0;

// Output may be encoded as JSON text or returned in the data field.
export const readJobOutput = (
  job: XYOpsJobResult,
  endpoint: string,
): unknown => {
  if (hasReadableOutput(job)) return parseJobOutput(job.output, endpoint);
  if ("data" in job) return job.data;
  throw fail("job", {
    endpoint,
    nextAction: "XYOps returned empty job output.",
  });
};

export const readWaitResponseData = (
  response: XYOpsResponse,
  endpoint: string,
): unknown => {
  if (!isXYOpsWaitResponse(response))
    throw fail("api", {
      endpoint,
      nextAction: "XYOps returned an invalid wait response.",
    });
  return readJobOutput(
    requireSuccessfulJob(
      response.job,
      endpoint,
      "The migration event job failed.",
    ),
    endpoint,
  );
};

export const requireEnvelope = <T>(
  data: unknown,
  guard: ResponseGuard<VoiceflowEnvelope<T>>,
  endpoint: string,
): VoiceflowEnvelope<T> => {
  if (!guard(data))
    throw fail("envelope", {
      endpoint,
      nextAction: "The migration runner returned an invalid envelope.",
    });
  return data;
};
