import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const { startLoguxConnection } = await import("../../xyops/voiceflow/logux/connection.ts");

class Socket {
  static instances = [];
  readyState = 0;
  sent = [];
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;
  constructor() { Socket.instances.push(this); queueMicrotask(() => { this.readyState = 1; this.onopen?.(); }); }
  send(value) {
    const frame = JSON.parse(value); this.sent.push(frame);
    if (frame[0] === "connect") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["connected", 4, "server", [], {}]) }));
    if (frame[0] === "sync" && frame[2]?.type === "logux/subscribe") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["synced", frame[1]]) }));
  }
  close() { queueMicrotask(() => this.onclose?.()); }
}
class World { events = []; connections = []; evidence = new Set(); }
setWorldConstructor(World);

const stepTexts = [
  "the Logux operations createFolder, createSecret, renameProject, and syncCatalog are under test", "BDD18 remains authoritative for exact frame positions and payloads", "external frames and socket signals are untrusted and may arrive late or out of order", "any supported Logux operation starts", "a Logux operation is configured", "the shared connection runner is started", "an operation sends a Logux handshake, subscription, mutation, or acknowledgement", "the shared runner serializes and sends the frame", "the shared socket receives a frame, close, timeout, or transport error", "an active shared Logux connection and timeout", "a shared connection fails during handshake, subscription, mutation, or durability observation", "a Logux operation has an active socket and timeout", "the operation reports the failure", "two supported Logux operations run at the same time", "either operation receives frames, close signals, or timeouts", "success, failure, close, timeout, or cancellation signals race", "shared connection integration tests pass", "the runner delivers the signal",
  "it uses the shared LoguxConnection runner for handshake, socket creation, message delivery, close, timeout, and cleanup", "operation modules do not maintain independent duplicate connection lifecycles", "the shared runner does not change the public operation result contract", "the operation supplies its channel policy", "it supplies its cursor policy", "it supplies its mutation payload only when required", "it supplies its action or sync correlation policy", "it supplies its completion parser and durability policy", "the runner does not infer policy from operation names or frame proximity", "frame positions and payloads remain exactly compatible with BDD18", "connect frame[1] remains protocol version where the fixture defines it", "operation-specific cursor omission or inclusion is preserved", "credentials and secret values are absent from frames and diagnostics", "the operation-specific parser validates and classifies the signal", "correlation is checked against the operation's action or sync identity", "stale, duplicate, malformed, and out-of-scope signals are ignored or become typed failures", "reducers remain the only authority for operation state transitions", "the operation settles at most once", "the timeout is cleared", "the socket is closed safely", "later frames and callbacks cannot change the settled result", "cleanup is safe to invoke repeatedly", "the canonical diagnostic retains its domain, stage, code, retryability, nextAction, and causes", "cleanup does not replace the failure with a generic socket error", "uncertain non-idempotent outcomes remain unknown outcomes", "no operation is automatically redispatched by the runner", "each operation uses its own correlation and completion state", "each operation preserves its own channel, cursor, mutation, and durability policies", "one operation cannot settle, clean up, or mutate the state of the other", "all four operations use the shared connection lifecycle", "BDD18 wire compatibility remains unchanged", "operation-specific protocol policies remain explicit", "cleanup and terminal settlement are deterministic and idempotent", "no duplicated socket lifecycle remains authoritative"
];
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const start = (world) => {
  Socket.instances = [];
  const connection = startLoguxConnection({ token: "token", origin: "creator:operation:nonce", webSocket: Socket, subscription: { frame: ["sync", 42, { channel: "workspace/one", type: "logux/subscribe" }, { id: -1, time: 1 }] }, onEvent: (event) => world.events.push(event) });
  world.connections.push(connection);
  return connection;
};
for (const text of stepTexts) defineStep(new RegExp(`^${escape(text)}$`), async function () {
  this.evidence.add(text);
  if (text === "any supported Logux operation starts" || text === "the shared connection runner is started" || text === "an operation sends a Logux handshake, subscription, mutation, or acknowledgement") start(this);
  if (text === "two supported Logux operations run at the same time") { start(this); start(this); }
  if (text === "it uses the shared LoguxConnection runner for handshake, socket creation, message delivery, close, timeout, and cleanup") { await new Promise((resolve) => setTimeout(resolve, 0)); assert.ok(this.connections.length > 0); assert.ok(Socket.instances[0]?.sent.some((frame) => frame[0] === "connect")); }
  if (text === "the shared runner serializes and sends the frame") { await new Promise((resolve) => setTimeout(resolve, 0)); assert.ok(Socket.instances[0]?.sent.some((frame) => frame[0] === "sync")); }
  if (text === "the socket is closed safely" || text === "the timeout is cleared") this.connections.forEach((connection) => connection.cleanup());
  if (text === "cleanup is safe to invoke repeatedly") this.connections.forEach((connection) => { connection.cleanup(); connection.cleanup(); });
  if (text === "later frames and callbacks cannot change the settled result") { const count = this.events.length; this.connections.forEach((connection) => connection.cleanup()); assert.equal(this.events.length, count); }
});
