import { fail, parseDiagnostic } from "../diagnostics";
import type { Diagnostic } from "../../diagnostics/types";
import { VoiceflowRegex } from "../../voiceflow/regex";
import { isSuccessfulCode } from "../guards";
import {
  JobLaunchSchema,
  XYOpsJobSchema,
  XYOpsJobResponseSchema,
  XYOpsLaunchResponseSchema,
  XYOpsWaitResponseSchema,
  XYOpsRecordSchema,
} from "../schemas/xyops-responses";
import type {
  ResponseSchema,
  VoiceflowEnvelope,
  XYOpsJob,
  XYOpsResponse,
} from "../types";

const recordChildren = (value: unknown): readonly unknown[] => {
  const parsed = XYOpsRecordSchema.safeParse(value);
  return parsed.success ? [parsed.data.job, parsed.data.data] : [];
};

const readJobValue = (value: unknown): XYOpsJob | undefined => {
  const parsed = XYOpsJobSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

const readJobContainer = (value: unknown): XYOpsJob | undefined =>
  [value, ...recordChildren(value)]
    .map(readJobValue)
    .find((job): job is XYOpsJob => job !== undefined);

const readTopLaunchID = (response: XYOpsResponse): string | undefined => {
  const parsed = XYOpsLaunchResponseSchema.safeParse(response);
  return parsed.success ? parsed.data.id : undefined;
};

const readDataLaunchID = (response: XYOpsResponse): string | undefined => {
  return [response.data, ...recordChildren(response.data)]
    .map((value) => {
      const parsed = JobLaunchSchema.safeParse(value);
      return parsed.success ? parsed.data.id : undefined;
    })
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
const findResponseJob = (response: XYOpsResponse): XYOpsJob | undefined => {
  const parsed = XYOpsJobResponseSchema.safeParse(response);
  return parsed.success ? parsed.data.job : readJobContainer(response.data);
};

const readNestedStructuredDiagnostic = (
  value: unknown,
  depth = 0,
): Diagnostic | undefined => {
  if (depth > 4) return undefined;
  const record = XYOpsRecordSchema.safeParse(value);
  if (!record.success) return undefined;
  const direct = parseDiagnostic(record.data.diagnostic);
  if (direct !== undefined) return direct;
  const error = XYOpsRecordSchema.safeParse(record.data.error);
  const nested = parseDiagnostic(error.success ? error.data.diagnostic : undefined);
  if (nested !== undefined) return nested;
  return ["voiceflow", "data", "job", "result"]
    .map((key) => readNestedStructuredDiagnostic(record.data[key], depth + 1))
    .find((diagnostic): diagnostic is Diagnostic => diagnostic !== undefined);
};

const readStructuredDiagnostic = (
  job: XYOpsJobResult,
): Diagnostic | undefined => readNestedStructuredDiagnostic(job.data);

const sensitiveField = VoiceflowRegex.xyopsSensitiveField;

// Debug logging is deliberately isolated and redacts sensitive DTO branches.
const redactResponseDTO = (value: unknown, key = ""): unknown => {
  if (sensitiveField.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redactResponseDTO(item));
  const parsed = XYOpsRecordSchema.safeParse(value);
  if (!parsed.success) return value;
  return Object.fromEntries(
    Object.entries(parsed.data).map(([entryKey, entryValue]) => [
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
    const diagnostic = readStructuredDiagnostic(job);
    throw fail("job", {
      endpoint,
      nextAction: diagnostic?.nextAction ?? describeFailure(job, fallback),
      ...(diagnostic === undefined ? {} : { diagnostic }),
    });
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
  if (hasReadableOutput(job)) {
    try {
      return parseJobOutput(job.output, endpoint);
    } catch (error: unknown) {
      // Failed XYOps jobs can put human-readable text in `output` and the
      // structured plugin envelope in `data`. Prefer the structured result
      // when it is available instead of misreporting the text as malformed JSON.
      if (job.data !== undefined && job.data !== null) return job.data;
      throw error;
    }
  }
  if (job.data !== undefined) return job.data;
  throw fail("job", {
    endpoint,
    nextAction: "XYOps returned empty job output.",
  });
};

export const readWaitResponseData = (
  response: XYOpsResponse,
  endpoint: string,
): unknown => {
  const parsed = XYOpsWaitResponseSchema.safeParse(response);
  if (!parsed.success)
    throw fail("api", {
      endpoint,
      nextAction: "XYOps returned an invalid wait response.",
    });
  return readJobOutput(
    requireSuccessfulJob(
      parsed.data.job,
      endpoint,
      "The migration event job failed.",
    ),
    endpoint,
  );
};

export const requireEnvelope = <T>(
  data: unknown,
  guard: ResponseSchema<VoiceflowEnvelope<T>>,
  endpoint: string,
): VoiceflowEnvelope<T> => {
  const parsed = guard.safeParse(data);
  if (!parsed.success)
    throw fail("envelope", {
      endpoint,
      nextAction: "The migration runner returned an invalid envelope.",
    });
  return parsed.data;
};
