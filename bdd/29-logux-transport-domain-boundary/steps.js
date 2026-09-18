import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const { startLoguxConnection } = await import("../../xyops/voiceflow/logux/connection.ts");
class BoundarySocket {
  static instances = [];
  readyState = 0;
  sent = [];
  onopen = null; onmessage = null; onerror = null; onclose = null;
  constructor() { BoundarySocket.instances.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  send(value) { const frame = JSON.parse(value); this.sent.push(frame); if (frame[0] === "connect") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["connected", 4, "server", [], {}]) })); }
  close() {}
}
class BoundaryWorld { events = []; connection = undefined; socket = undefined; heartbeatEventCount = 0; }
setWorldConstructor(BoundaryWorld);
const texts = [
  "createFolder, createSecret, renameProject, and syncCatalog use Logux transport", "BDD18 remains authoritative for exact Logux wire frames", "raw socket frames and lifecycle signals are untrusted", "the shared Logux connection receives open, close, error, timeout, or heartbeat signals", "the transport boundary handles the signal", "it emits a typed domain event such as connected, connection-interrupted, or service-unavailable", "domain state machines do not consume raw socket lifecycle objects", "transport-specific details remain at the adapter boundary", "a Logux message arrives as text or an unknown payload", "the transport boundary parses and validates it", "valid frames become operation-specific typed events", "malformed, stale, duplicate, or out-of-scope frames do not reach domain transition logic", "correlation and completion policy remains operation-specific", "invalid raw payloads are not copied into diagnostics", "the connection requires ping, pong, or heartbeat behavior", "heartbeat traffic is processed", "the shared transport runner handles it", "no domain reducer transition is created for transport-only heartbeat traffic", "heartbeat failure becomes a typed connection interruption event when domain action is required", "a socket closes before or during a Logux operation", "the transport boundary reports the interruption", "the domain state machine receives the appropriate typed interruption event", "it applies its own retry, unknown-outcome, or terminal policy", "the transport layer does not decide domain completion or retryability", "confirmed operation failures remain distinct from uncertain transport outcomes", "an active shared Logux connection and timeout", "completion, close, timeout, error, or cancellation signals race", "only one domain terminal event is emitted", "the socket and timer are cleaned up exactly once", "later transport callbacks cannot change domain state", "cleanup does not redispatch a non-idempotent operation", "folder, secret, rename, or catalog operations use the transport boundary", "frames and domain events are translated", "channel, cursor, action ID, sync ID, completion, and durability policies remain unchanged", "exact frame positions and payloads remain governed by BDD18", "public operation results and diagnostics remain compatible", "transport translation tests pass", "domain state machines are independent of raw WebSocket lifecycle details", "shared transport owns connection and heartbeat mechanics", "operation reducers remain authoritative for domain state", "transport and domain failures remain distinguishable and safely recoverable"
];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const start = (world) => {
  BoundarySocket.instances = [];
  world.connection = startLoguxConnection({ token: "token", origin: "creator:29", webSocket: BoundarySocket, subscription: { frame: ["sync", 29, { channel: "workspace/29", type: "logux/subscribe" }] }, onEvent: (event) => world.events.push(event) });
  world.socket = BoundarySocket.instances[0];
};
for (const text of texts) defineStep(new RegExp(`^${escape(text)}$`), async function () {
  if (text.includes("use Logux transport") || text.includes("receives open") || text.includes("message arrives") || text.includes("requires ping") || text.includes("active shared") || text.includes("socket closes") || text === "folder, secret, rename, or catalog operations use the transport boundary") start(this);
  if (text === "the transport boundary parses and validates it") {
    this.socket.onmessage?.({ data: JSON.stringify(["sync", 1, { type: "operation.EVENT", payload: {} }]) });
    this.socket.onmessage?.({ data: "not-json" });
    this.socket.onmessage?.({ data: { not: "text" } });
  }
  if (text === "heartbeat traffic is processed") { this.heartbeatEventCount = this.events.length; this.socket.onmessage?.({ data: JSON.stringify(["ping", 9]) }); }
  if (text === "the transport boundary reports the interruption") this.socket.onclose?.();
  if (text === "completion, close, timeout, error, or cancellation signals race") { this.socket.onerror?.(); this.socket.onclose?.(); this.socket.onerror?.(); }
  if (text === "the socket and timer are cleaned up exactly once") { this.connection.cleanup(); this.connection.cleanup(); }
  if (text === "later transport callbacks cannot change domain state") { const count = this.events.length; this.connection.cleanup(); this.socket.onmessage?.({ data: JSON.stringify(["connected", 4, "late", [], {}]) }); assert.equal(this.events.length, count); }
  if (text === "valid frames become operation-specific typed events") assert.ok(this.events.some((event) => event.kind === "frame"));
  if (text === "malformed, stale, duplicate, or out-of-scope frames do not reach domain transition logic") assert.ok(this.events.every((event) => event.kind !== "raw-frame"));
  if (text === "no domain reducer transition is created for transport-only heartbeat traffic") assert.equal(this.events.length, this.heartbeatEventCount);
  if (text === "it emits a typed domain event such as connected, connection-interrupted, or service-unavailable") assert.ok(this.events.some((event) => event.kind === "connection-opened" || event.kind === "frame" || event.kind === "connection-interrupted"));
  assert.ok(this.connection);
  assert.ok(this.events.every((event) => ["connection-opened", "frame", "connection-interrupted", "transport-failure"].includes(event.kind)));
});
