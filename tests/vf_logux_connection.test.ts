import { expect, test } from "bun:test";
import { startLoguxConnection } from "../xyops/voiceflow/logux/connection";

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[][] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closeCount = 0;
  constructor() { FakeSocket.instances.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  send(value: string): void {
    const frame = JSON.parse(value) as unknown[];
    this.sent.push(frame);
    if (frame[0] === "connect") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["connected", 4, "server", [], {}]) }));
  }
  close(): void { this.closeCount += 1; }
}
const input = (events: Array<{ kind: string }>, subscriptionID: number, timeoutMs = 1_000) => startLoguxConnection({
  token: "token",
  origin: `creator:${subscriptionID}`,
  webSocket: FakeSocket as unknown as typeof WebSocket,
  timeoutMs,
  subscription: { frame: ["sync", subscriptionID, { channel: `workspace/${subscriptionID}`, type: "logux/subscribe" }] },
  onEvent: (event) => events.push(event),
});

test("shared runner authenticates, subscribes, and handles heartbeat outside operation events", async () => {
  FakeSocket.instances = [];
  const events: Array<{ kind: string }> = [];
  const connection = input(events, 10);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const socket = FakeSocket.instances[0];
  expect(socket.sent[0]?.slice(0, 2)).toEqual(["connect", 4]);
  expect(socket.sent[1]?.slice(0, 2)).toEqual(["sync", 10]);
  socket.onmessage?.({ data: JSON.stringify(["ping", 8]) });
  expect(socket.sent.at(-1)?.slice(0, 2)).toEqual(["pong", 8]);
  expect(events.map(({ kind }) => kind)).toEqual(["connection-opened", "frame"]);
  connection.cleanup();
});

test("boundary rejects malformed and non-text frames before domain delivery", async () => {
  FakeSocket.instances = [];
  const events: Array<{ kind: string }> = [];
  const connection = input(events, 12);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const socket = FakeSocket.instances[0];
  const before = events.length;
  socket.onmessage?.({ data: "not-json" });
  socket.onmessage?.({ data: { raw: "payload" } });
  socket.onmessage?.({ data: JSON.stringify(["sync", 1, { type: "operation.EVENT", payload: "invalid" }]) });
  expect(events.length).toBe(before);
  connection.cleanup();
});

test("shared runner emits terminal transport signals once and cleanup is idempotent", async () => {
  FakeSocket.instances = [];
  const events: Array<{ kind: string }> = [];
  const connection = input(events, 11);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const socket = FakeSocket.instances[0];
  socket.onerror?.(); socket.onclose?.(); socket.onerror?.();
  expect(events.filter(({ kind }) => kind === "transport-failure")).toHaveLength(1);
  connection.cleanup(); connection.cleanup();
  expect(socket.closeCount).toBe(1);
  socket.onmessage?.({ data: JSON.stringify(["connected", 4, "server", [], {}]) });
  expect(events.filter(({ kind }) => kind === "frame")).toHaveLength(1);
});

test("concurrent runners keep sockets and subscription channels isolated", async () => {
  FakeSocket.instances = [];
  const first: Array<{ kind: string }> = [];
  const second: Array<{ kind: string }> = [];
  const a = input(first, 21); const b = input(second, 22);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(FakeSocket.instances[0].sent[1]?.[1]).toBe(21);
  expect(FakeSocket.instances[1].sent[1]?.[1]).toBe(22);
  a.cleanup();
  expect(FakeSocket.instances[1].closeCount).toBe(0);
  b.cleanup();
});

test("timeout becomes a typed interruption and remains terminal", async () => {
  FakeSocket.instances = [];
  const events: Array<{ kind: string }> = [];
  const connection = input(events, 31, 1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(events.filter(({ kind }) => kind === "connection-interrupted")).toHaveLength(1);
  connection.cleanup();
});

test("cleanup before timeout suppresses late callbacks", async () => {
  FakeSocket.instances = [];
  const events: Array<{ kind: string }> = [];
  const connection = input(events, 30, 1);
  connection.cleanup();
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(events).toEqual([]);
});
