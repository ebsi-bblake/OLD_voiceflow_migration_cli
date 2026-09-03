import { writeFile } from "node:fs/promises";

const baseURL = (process.env.XYOPS_BASE_URL ?? "http://localhost:5522").replace(/\/$/, "");
const eventTitle = process.env.XYOPS_EVENT_TITLE ?? "voiceflow_list_workspaces";
const outputPath = process.env.XYOPS_EXPERIMENT_OUTPUT ?? "result-xyops-stream.json";
const apiKey = process.env.XYOPS_API_KEY;
const operation = process.env.XYOPS_OPERATION ?? "list_workspaces";
const startedAt = Date.now();

if (!apiKey) throw new Error("XYOPS_API_KEY is required");

const requestHeaders = (): HeadersInit => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-Key": apiKey,
});

const safeHeaders = (headers: Headers): Record<string, string> =>
  Object.fromEntries(
    ["content-type", "content-length", "cache-control", "connection", "transfer-encoding"]
      .flatMap((name) => {
        const value = headers.get(name);
        return value === null ? [] : [[name, value]];
      }),
  );

const redactText = (text: string): string =>
  text
    .replaceAll(apiKey, "[REDACTED_API_KEY]")
    .replace(/\"token\"\s*:\s*\"[^\"]*\"/gi, '\"token\":\"[REDACTED_TOKEN]\"')
    .replace(/Bearer\s+[^\s,;}]+/gi, "Bearer [REDACTED]")
    .replace(/X-API-Key["']?\s*[:=]\s*["']?[^\s,"'}]+/gi, "X-API-Key: [REDACTED]");

const safeBody = (text: string): unknown => {
  const redacted = redactText(text);
  try {
    return JSON.parse(redacted) as unknown;
  } catch {
    return redacted;
  }
};

type HTTPObservation = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  readonly elapsedMs: number;
};

const observeResponse = async (
  response: Response,
  requestStartedAt: number,
): Promise<HTTPObservation> => ({
  status: response.status,
  headers: safeHeaders(response.headers),
  body: safeBody(await response.text()),
  elapsedMs: Date.now() - requestStartedAt,
});

const parseSSEBlock = (block: string): Record<string, unknown> => {
  const event: Record<string, unknown> = { raw: redactText(block) };
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  }
  const dataText = dataLines.join("\n");
  event.event = eventName;
  event.data = dataText === "" ? {} : safeBody(dataText);
  return event;
};

const readSSE = async (response: Response): Promise<{
  readonly events: readonly Record<string, unknown>[];
  readonly raw: string;
}> => {
  if (!response.body) throw new Error("SSE response had no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: Record<string, unknown>[] = [];
  let pending = "";
  let raw = "";
  const consume = (text: string): void => {
    pending += text;
    let boundary = pending.search(/\r?\n\r?\n/);
    while (boundary >= 0) {
      const block = pending.slice(0, boundary);
      events.push(parseSSEBlock(block));
      raw += `${block}\n\n`;
      pending = pending.slice(boundary).replace(/^\r?\n\r?\n/, "");
      boundary = pending.search(/\r?\n\r?\n/);
    }
  };
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    consume(decoder.decode(chunk.value, { stream: true }));
  }
  consume(decoder.decode());
  if (pending.trim() !== "") {
    events.push(parseSSEBlock(pending));
    raw += redactText(pending);
  }
  return { events, raw: redactText(raw) };
};

const requireJobID = (body: unknown): string => {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Launch response was not an object");
  const id = (body as Record<string, unknown>).id;
  if (typeof id !== "string" || id.trim() === "")
    throw new Error("Launch response did not contain a job ID");
  return id;
};

const run = async (): Promise<Record<string, unknown>> => {
  const launchStartedAt = Date.now();
  const launchResponse = await fetch(`${baseURL}/api/app/run_event/v1`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ title: eventTitle, params: { operation } }),
  });
  const launch = await observeResponse(launchResponse, launchStartedAt);
  if (!launchResponse.ok) throw new Error(`Launch failed with HTTP ${launch.status}`);
  const jobID = requireJobID(launch.body);

  const streamStartedAt = Date.now();
  const streamResponse = await fetch(
    `${baseURL}/api/app/stream_job/v1?id=${encodeURIComponent(jobID)}`,
    { headers: { Accept: "text/event-stream", "X-API-Key": apiKey } },
  );
  const streamMeta = {
    status: streamResponse.status,
    headers: safeHeaders(streamResponse.headers),
    elapsedMs: Date.now() - streamStartedAt,
  };
  if (!streamResponse.ok) throw new Error(`Stream failed with HTTP ${streamResponse.status}`);
  const stream = await readSSE(streamResponse);

  const jobStartedAt = Date.now();
  const jobResponse = await fetch(
    `${baseURL}/api/app/get_job/v1?id=${encodeURIComponent(jobID)}`,
    { headers: requestHeaders() },
  );
  const job = await observeResponse(jobResponse, jobStartedAt);
  return {
    capturedAt: new Date().toISOString(),
    totalElapsedMs: Date.now() - startedAt,
    request: { baseURL, eventTitle, operation },
    jobID,
    launch,
    stream: { ...streamMeta, events: stream.events, raw: stream.raw },
    finalJob: job,
  };
};

const main = async (): Promise<void> => {
  try {
    const result = await run();
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outputPath}`);
  } catch (error) {
    const failure = {
      capturedAt: new Date().toISOString(),
      totalElapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
    await writeFile(outputPath, `${JSON.stringify(failure, null, 2)}\n`);
    console.error(`Experiment failed; wrote ${outputPath}`);
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
