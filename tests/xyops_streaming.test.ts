import { expect, test } from "bun:test";

import { createXYOpsClient } from "../xyops/cli/client";
import {
  createJobObservationState,
  transitionJobObservation,
} from "../xyops/cli/client/job-observation-state-machine";
import { isVoiceflowEnvelope } from "../xyops/cli/guards";
import {
  DEFAULT_STREAM_MAX_BYTES,
  parseSSE,
  streamJob,
} from "../xyops/cli/client/streaming";
import type { XYOpsStreamEvent } from "../xyops/cli/types";

const encodedChunks = (source: string, boundaries: readonly number[]): ReadableStream<Uint8Array> => {
  const bytes = new TextEncoder().encode(source);
  const chunks = boundaries.map((end, index) => bytes.slice(index === 0 ? 0 : boundaries[index - 1], end));
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
};

const streamingResponse = (source: string, boundaries?: readonly number[]): Response =>
  new Response(boundaries === undefined ? source : encodedChunks(source, boundaries), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });

const lifecycleStream = (endData: Record<string, unknown>, updateData: Record<string, unknown> = { progress: 0 }): string =>
  `: keep-alive\r\n\r\nevent: start\r\ndata: {"id":"job-1"}\r\n\r\nevent: update\r\ndata: ${JSON.stringify(updateData)}\r\n\r\nevent: end\r\ndata: ${JSON.stringify(endData)}\r\n\r\n`;

const streamRequest = (source: string, boundaries?: readonly number[]) =>
  streamJob(
    async (_input, init) => {
      expect(new Headers(init?.headers).get("X-API-Key")).toBe("stream-api-key");
      expect(init?.body).toBeUndefined();
      return streamingResponse(source, boundaries);
    },
    "https://xyops.example.test",
    "stream-api-key",
    "job-1",
    1_000,
  );

test("models dispatch, stream failure, reconciliation, and terminal idempotence", () => {
  let state = createJobObservationState("job-1");
  state = transitionJobObservation(state, {
    kind: "execute-dispatched",
    jobID: "job-1",
  }).state;
  expect(state.kind).toBe("STREAMING");
  state = transitionJobObservation(state, { kind: "stream-failed" }).state;
  expect(state.kind).toBe("STREAM_RECONCILING");
  state = transitionJobObservation(state, { kind: "job-active", attempt: 1 }).state;
  expect(state.kind).toBe("POLLING");
  state = transitionJobObservation(state, { kind: "job-succeeded" }).state;
  expect(state.kind).toBe("SUCCEEDED");
  expect(
    transitionJobObservation(state, { kind: "stream-failed" }).accepted,
  ).toBe(false);
});

test("treats a terminal start event as a candidate until end", async () => {
  const result = await streamRequest(
    "event: start\ndata: {\"id\":\"job-1\",\"code\":0}\n\nevent: end\ndata: {}\n\n",
  );
  expect(result).toMatchObject({ kind: "success", jobID: "job-1", code: 0 });
});

const successfulEnvelope = (): Record<string, unknown> => ({
  ok: true,
  operation: "execute_migration",
  operationID: "operation-1",
  result: {},
  warnings: [],
});

test("parses lifecycle events, comments, blank lines, multiple data lines, and unknown fields", () => {
  expect(parseSSE(
    ": keep-alive\n\nevent: update\nid: ignored\ndata: {\"id\":\"job-1\",\ndata: \"code\":0}\n\nevent: end\ndata: {}\n\n",
  )).toEqual([
    { type: "update", data: { id: "job-1", code: 0 } },
    { type: "end", data: {} },
  ] satisfies readonly XYOpsStreamEvent[]);
});

test("reads chunks split across lines and UTF-8 characters", async () => {
  const source = lifecycleStream({ id: "job-1", code: 0, description: "完成" });
  const utf8Boundary = new TextEncoder().encode(source.slice(0, source.indexOf("完成") + 1)).byteLength;
  const result = await streamRequest(source, [utf8Boundary, new TextEncoder().encode(source).byteLength]);

  expect(result).toMatchObject({ kind: "success", jobID: "job-1", code: 0 });
  expect(result.data.description).toBe("完成");
});

test("uses the terminal event and safely ignores progress-only updates", async () => {
  const result = await streamRequest(lifecycleStream({ id: "job-1", code: 0 }));

  expect(result).toMatchObject({ kind: "success", jobID: "job-1", code: 0 });
});

test("uses the final status update when end is an empty completion marker", async () => {
  const result = await streamRequest(
    lifecycleStream({}, { id: "job-1", code: 0 }),
  );

  expect(result).toMatchObject({ kind: "success", jobID: "job-1", code: 0 });
});

test("uses terminal failure over a successful progress update", async () => {
  const result = await streamRequest(lifecycleStream({ id: "job-1", code: "plugin_failure", description: "migration failed" }, { id: "job-1", code: 0 }));

  expect(result).toMatchObject({ kind: "failure", code: "plugin_failure", data: { description: "migration failed" } });
});

test("rejects malformed JSON, unknown events, oversized input, and incomplete frames", () => {
  expect(() => parseSSE("event: update\ndata: nope\n\n")).toThrow("stream");
  expect(() => parseSSE("event: unknown\ndata: {}\n\n")).toThrow("stream");
  expect(() => parseSSE("event: start\ndata: {}\n\n", { maxBytes: 2 })).toThrow("stream");
  expect(() => parseSSE("event: start\ndata: {}\n\n", { maxFrameBytes: 2 })).toThrow("stream");
  expect(DEFAULT_STREAM_MAX_BYTES).toBeGreaterThan(0);
});

test("rejects EOF before an end event", async () => {
  await expect(streamRequest("event: update\ndata: {\"id\":\"job-1\",\"progress\":1}\n\n")).rejects.toMatchObject({
    diagnostic: { code: "stream" },
  });
});

test("reports HTTP stream errors and aborts", async () => {
  await expect(streamJob(
    async () => new Response("unavailable", { status: 503 }),
    "https://xyops.example.test",
    "stream-api-key",
    "job-1",
    1_000,
  )).rejects.toMatchObject({ diagnostic: { code: "http", status: 503 } });

  await expect(streamJob(
    async (_input, init) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      expect(init?.signal?.aborted).toBe(true);
      throw new DOMException("aborted", "AbortError");
    },
    "https://xyops.example.test",
    "stream-api-key",
    "job-1",
    1,
  )).rejects.toMatchObject({ diagnostic: { code: "timeout" } });
});

test.each(["output", "data"] as const)("fetches the final job once and parses its %s envelope", async (location) => {
  const paths: string[] = [];
  const client = createXYOpsClient({
    baseURL: "https://xyops.example.test",
    apiKey: "stream-api-key",
    events: {} as never,
    httpTimeoutMs: 1_000,
    pollIntervalMs: 1,
    pollTimeoutMs: 1_000,
    streamMaxBytes: 1_000,
    streamMaxFrameBytes: 1_000,
  }, {
    streamer: async () => ({ kind: "success", jobID: "job-1", code: 0, data: { id: "job-1", code: 0 }, requiresJobResponse: true }),
    fetcher: async (input) => {
      paths.push(new URL(String(input)).pathname);
      if (paths.length === 1) return new Response(JSON.stringify({ code: 0, id: "job-1" }), { status: 200 });
      const job = location === "output"
        ? { id: "job-1", code: 0, completed: true, output: JSON.stringify(successfulEnvelope()), data: null }
        : { id: "job-1", code: 0, completed: true, output: null, data: successfulEnvelope() };
      return new Response(JSON.stringify({ code: 0, job }), { status: 200 });
    },
  });

  await expect(client.executeEvent(
    "execute-event",
    { operation: "execute_migration" },
    isVoiceflowEnvelope(() => true),
  )).resolves.toEqual(successfulEnvelope());
  expect(paths).toEqual(["/api/app/run_event/v1", "/api/app/get_job/v1"]);
});

test("does not redispatch after a stream failure", async () => {
  let dispatches = 0;
  const client = createXYOpsClient({
    baseURL: "https://xyops.example.test", apiKey: "stream-api-key", events: {} as never,
    httpTimeoutMs: 1_000, pollIntervalMs: 1, pollTimeoutMs: 1_000, streamMaxBytes: 1_000, streamMaxFrameBytes: 1_000,
  }, {
    fetcher: async () => { dispatches += 1; return new Response(JSON.stringify({ code: 0, id: "job-1" }), { status: 200 }); },
    streamer: async () => { throw new Error("disconnect"); },
  });

  await expect(client.executeEvent(
    "execute-event",
    { operation: "execute_migration" },
    isVoiceflowEnvelope(() => true),
  )).rejects.toMatchObject({ diagnostic: { code: "execute-outcome-unknown" } });
  expect(dispatches).toBe(1);
});
