import { z } from "zod";
import { expect, test } from "bun:test";
import { createXYOpsClient } from "../xyops/cli/client";
import { streamJob } from "../xyops/cli/client/streaming";
import { createVoiceflowEnvelopeSchema } from "../xyops/cli/schemas/voiceflow-envelope";
import { createSecret } from "../xyops/voiceflow/logux/create-secret";

const config = {
  baseURL: "https://xyops.example.test",
  apiKey: "key",
  events: {},
  httpTimeoutMs: 1_000,
  pollIntervalMs: 1,
  pollTimeoutMs: 1_000,
  streamMaxBytes: 1_000,
  streamMaxFrameBytes: 1_000,
} as const;
const guard = createVoiceflowEnvelopeSchema(z.unknown());
const result = { ok: true, operation: "execute_migration", operationID: "operation", result: {}, warnings: [] };
const response = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 });

const clientWithJob = (streamer: Parameters<typeof createXYOpsClient>[1]["streamer"], requests: string[]) =>
  createXYOpsClient(config, {
    streamer,
    sleeper: async () => undefined,
    fetcher: async (input) => {
      const path = new URL(String(input)).pathname;
      requests.push(path);
      return path.endsWith("run_event/v1")
        ? response({ code: 0, id: "job" })
        : response({ code: 0, job: { id: "job", completed: true, code: 0, output: JSON.stringify(result), data: null } });
    },
  });

test("settles a polling timeout once and ignores a later success response", async () => {
  let polls = 0;
  const client = createXYOpsClient({ ...config, streamMaxBytes: undefined, streamMaxFrameBytes: undefined, pollTimeoutMs: 10 }, {
    sleeper: async () => { await new Promise((resolve) => setTimeout(resolve, 20)); },
    fetcher: async (input) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("run_event/v1")) return response({ code: 0, id: "job" });
      polls += 1;
      return response({ code: 0, job: { id: "job", completed: false, code: 0, data: null } });
    },
  });
  await expect(client.executeEvent("event", {}, guard)).rejects.toMatchObject({ diagnostic: { code: "execute-outcome-unknown" } });
  expect(polls).toBe(1);
});

test("reconciles a rejected stream through one reducer-owned poll without redispatch", async () => {
  const requests: string[] = [];
  const client = clientWithJob(async () => { throw new Error("stream unavailable"); }, requests);

  await expect(client.executeEvent("event", {}, guard)).resolves.toEqual(result);
  expect(requests).toEqual(["/api/app/run_event/v1", "/api/app/get_job/v1"]);
});

test("settles a malformed stream through polling rather than leaving a pending promise", async () => {
  const requests: string[] = [];
  const client = clientWithJob(async () => ({ kind: "success", jobID: "job", code: 0, data: {}, requiresJobResponse: true }), requests);

  await expect(client.executeEvent("event", {}, guard)).resolves.toEqual(result);
  expect(requests.filter((path) => path.endsWith("run_event/v1"))).toHaveLength(1);
});

test("handles a WebSocket completion and close race with one settled operation", async () => {
  let closeCount = 0;
  class RacingWebSocket {
    static instances: RacingWebSocket[] = [];
    readyState = 1;
    onopen: (() => void) | undefined;
    onmessage: ((event: { data: string }) => void) | undefined;
    onclose: (() => void) | undefined;
    onerror: (() => void) | undefined;
    constructor() {
      RacingWebSocket.instances.push(this);
      queueMicrotask(() => this.onopen?.());
    }
    send(value: string): void {
      const frame = JSON.parse(value) as unknown[];
      if (frame[0] === "connect")
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["connected", 4, "server", [1, 2], {}]) }));
      if (frame[0] !== "sync") return;
      const action = frame[2] as { type?: string; meta?: { actionID?: string } };
      if (action.type === "logux/subscribe")
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["synced", frame[1]]) }));
      if (action.type === "secret.CREATE_ONE_STARTED")
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["sync", 99, { type: "secret.CREATE_ONE_DONE", payload: { result: { context: { assistantID: "assistant" } } }, meta: { actionID: action.meta?.actionID } }]) }));
    }
    close(): void {
      closeCount += 1;
      queueMicrotask(() => this.onclose?.());
    }
  }
  await expect(createSecret(
    { token: "token", creatorID: "creator" },
    "assistant",
    { name: "KEY", value: "value" },
    { webSocket: RacingWebSocket as unknown as typeof WebSocket },
  )).resolves.toBeUndefined();
  expect(closeCount).toBeGreaterThan(0);
});

test("releases the SSE reader when stream parsing fails", async () => {
  let captured: Response | undefined;
  const fetcher = async (): Promise<Response> => {
    captured = new Response("event: end\ndata: not-json\n\n", { status: 200 });
    return captured;
  };

  await expect(streamJob(fetcher, config.baseURL, config.apiKey, "job", 1_000)).rejects.toMatchObject({
    diagnostic: { code: "stream" },
  });
  expect(captured?.body?.locked).toBe(false);
});

