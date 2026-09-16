import { fail } from "../diagnostics";
import { VoiceflowRegex } from "../../voiceflow/regex";
import { isNonEmptyString, isXYOpsStreamEvent } from "../guards";
import type {
  XYOpsStreamEvent,
  XYOpsStreamLimits,
  XYOpsStreamResult,
  XYOpsStreamJob,
} from "../types";
import { fetchSSE } from "./http";

export const STREAM_PATH = "/api/app/stream_job/v1";
export const DEFAULT_STREAM_MAX_BYTES = 1_048_576;
export const DEFAULT_STREAM_MAX_FRAME_BYTES = 256_000;

type ParseSSE = (
  source: string,
  limits?: XYOpsStreamLimits,
) => readonly XYOpsStreamEvent[];

const byteLength = (value: string): number =>
  new TextEncoder().encode(value).byteLength;
const streamError = (message: string): never => {
  throw fail("stream", { endpoint: STREAM_PATH, nextAction: message });
};

// SSE parsing intentionally handles several independent wire-format cases.
// eslint-disable-next-line complexity
const parseEventFrame = (
  frame: string,
  maxFrameBytes: number,
): XYOpsStreamEvent => {
  if (byteLength(frame) > maxFrameBytes)
    return streamError("The XYOps SSE event exceeded the size limit.");
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of frame.split(VoiceflowRegex.sseLineBreak)) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value =
      separator < 0
        ? ""
        : line.slice(separator + 1).replace(VoiceflowRegex.sseLeadingSpace, "");
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  }
  if (!eventName || dataLines.length === 0)
    return streamError("XYOps returned an incomplete SSE event.");
  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n")) as unknown;
  } catch {
    return streamError("XYOps returned malformed SSE JSON.");
  }
  const event: unknown = { type: eventName, data };
  if (!isXYOpsStreamEvent(event))
    return streamError("XYOps returned an unknown or invalid SSE event.");
  return event;
};

// eslint-disable-next-line complexity
export const parseSSE: ParseSSE = (source, limits = {}) => {
  const maxBytes = limits.maxBytes ?? DEFAULT_STREAM_MAX_BYTES;
  const maxFrameBytes = limits.maxFrameBytes ?? DEFAULT_STREAM_MAX_FRAME_BYTES;
  if (byteLength(source) > maxBytes)
    return streamError("The XYOps SSE response exceeded the size limit.");
  const events: XYOpsStreamEvent[] = [];
  const frames = source.split(VoiceflowRegex.sseFrameBreak);
  for (const frame of frames) {
    if (
      !frame.trim() ||
      frame
        .split(VoiceflowRegex.sseLineBreak)
        .every((line) => line.startsWith(":"))
    )
      continue;
    events.push(parseEventFrame(frame, maxFrameBytes));
  }
  return events;
};

type TerminalJobData = Readonly<{
  id: string;
  code: number | string;
}>;

type HasTerminalJobStatus = (
  data: Record<string, unknown> | undefined,
) => data is Record<string, unknown> & TerminalJobData;
const hasTerminalJobStatus: HasTerminalJobStatus = (
  data,
): data is Record<string, unknown> & TerminalJobData =>
  data !== undefined &&
  isNonEmptyString(data.id) &&
  (typeof data.code === "number" || typeof data.code === "string");

type ReadSSEResponse = (
  response: Response,
  limits: XYOpsStreamLimits,
) => Promise<XYOpsStreamResult>;
// eslint-disable-next-line complexity
const readSSEResponse: ReadSSEResponse = async (response, limits) => {
  if (response.body === null)
    return streamError("XYOps returned an empty SSE body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let source = "";
  let totalBytes = 0;
  const events: XYOpsStreamEvent[] = [];
  // Chunk consumption combines byte limits, decoder flushing, and frame extraction.
  // eslint-disable-next-line complexity
  const readChunk = async (): Promise<void> => {
    const chunk = await reader.read();
    if (chunk.done) {
      source += decoder.decode();
      if (source.trim())
        events.push(
          ...parseSSE(source, {
            maxBytes: limits.maxBytes,
            maxFrameBytes: limits.maxFrameBytes,
          }),
        );
      return;
    }
    totalBytes += chunk.value.byteLength;
    if (totalBytes > (limits.maxBytes ?? DEFAULT_STREAM_MAX_BYTES))
      return streamError("The XYOps SSE response exceeded the size limit.");
    source += decoder.decode(chunk.value, { stream: true });
    const parts = source.split(VoiceflowRegex.sseFrameBreak);
    source = parts.pop() ?? "";
    for (const part of parts) {
      if (part.trim()) events.push(...parseSSE(`${part}\n\n`, limits));
    }
    return readChunk();
  };
  await readChunk();
  const candidates = events.filter(
    (event) => event.type === "start" || event.type === "update",
  );
  const terminal = events
    .slice()
    .reverse()
    .find((event: XYOpsStreamEvent) => event.type === "end")?.data;
  // Some XYOps versions use end as an empty completion marker; retain the terminal update in that case.
  const latest = [
    terminal,
    ...candidates.map((event) => event.data).reverse(),
  ].find(hasTerminalJobStatus);
  if (latest === undefined)
    return streamError("XYOps ended the stream without a terminal job status.");
  if (!events.some((event) => event.type === "end"))
    return streamError("XYOps ended the stream before the terminal event.");
  const result = {
    jobID: latest.id,
    code: latest.code,
    data: latest,
    requiresJobResponse: true,
  } as const;
  return latest.code === 0 || latest.code === "0"
    ? { kind: "success", ...result }
    : { kind: "failure", ...result };
};

export type StreamJob = XYOpsStreamJob;
export const streamJob: StreamJob = (
  fetcher,
  baseURL,
  apiKey,
  jobID,
  timeoutMs,
  limits = {},
) =>
  fetchSSE(
    fetcher,
    `${baseURL}${STREAM_PATH}?id=${encodeURIComponent(jobID)}`,
    apiKey,
    timeoutMs,
    STREAM_PATH,
    (response) => readSSEResponse(response, limits),
  );
