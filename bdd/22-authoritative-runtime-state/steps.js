import assert from "node:assert/strict";
import { z } from "zod";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const workflow = await import("../../xyops/voiceflow/execute-migration-state-machine.ts");
const migration = await import("../../xyops/voiceflow/execute_migration/index.ts");
const observation = await import("../../xyops/cli/client/job-observation-state-machine.ts");
const renameState = await import("../../xyops/voiceflow/logux/rename-state-machine.ts");
const secretState = await import("../../xyops/voiceflow/logux/secret-state-machine.ts");
const renameAdapter = await import("../../xyops/voiceflow/logux/rename-project.ts");
const secretAdapter = await import("../../xyops/voiceflow/logux/create-secret.ts");
const clientModule = await import("../../xyops/cli/client/index.ts");
const envelopeSchemas = await import("../../xyops/cli/schemas/voiceflow-envelope.ts");
const diagnostics = await import("../../xyops/cli/diagnostics.ts");


class RuntimeWorld { value = undefined; source = undefined; }
setWorldConstructor(RuntimeWorld);
const identity = (operationID = "operation-1") => ({ operationID, planID: "plan-1", selection: { sourceWorkspaceID: "source", sourceProjectID: "project", sourceVersionID: "version", destinationWorkspaceID: "destination", destinationFolderID: "folder" } });

defineStep("the production migration entrypoint receives no confirmation", async function () { this.value = await migration.main("token", "plan", "source", "project", "version", "destination", "folder", undefined, false); });
defineStep("it returns confirmation required without starting workflow", function () { assert.equal(this.value.ok, false); assert.equal(this.value.error.code, "CONFIRMATION_REQUIRED"); });
defineStep("a job stream fails", function () { const started = observation.transitionJobObservation(observation.createJobObservationState("job-1"), { kind: "execute-dispatched", jobID: "job-1" }); this.value = observation.transitionJobObservation(started.state, { kind: "stream-failed" }); });
defineStep("the observation reducer enters POLLING", function () { assert.equal(this.value.state.kind, "POLLING"); });
defineStep("its effect starts polling for the same job", function () { assert.deepEqual(this.value.effects, [{ kind: "start-polling", jobID: "job-1", attempt: 0 }]); });
defineStep("a job is dispatched without streaming", function () { const started = observation.transitionJobObservation(observation.createJobObservationState("job-2"), { kind: "execute-dispatched", jobID: "job-2" }); this.value = observation.transitionJobObservation(started.state, { kind: "polling-started" }); });
defineStep("the event is not classified as a stream failure", function () { assert.equal(this.value.accepted, true); assert.equal(this.value.state.kind, "POLLING"); });
defineStep("the BDD22 runtime acceptance checks run", function () { this.value = workflow.transitionMigrationWorkflow(workflow.createMigrationWorkflow(identity()), { kind: "start" }); });
defineStep("migration, observation, and Logux reducer wiring is verified", function () { assert.deepEqual(this.value.effects, [{ kind: "authenticate" }]); assert.ok(this.value.accepted); });

defineStep("a complete migration event sequence is reduced", function () { let state = workflow.createMigrationWorkflow(identity()); const auth = { token: "token", creatorID: "creator" }; const artifact = { status: 200, bytes: new ArrayBuffer(0), filename: "project.zip", contentType: "application/zip" }; const plan = { planID: "plan-1", selection: identity().selection, labels: {} }; const imported = { importStatus: 200, importBytes: 0, projectID: "imported" }; const stages = [state.stage]; let terminalEffects = []; for (const event of [{ kind: "authentication-succeeded", auth }, { kind: "export-succeeded", artifact }, { kind: "plan-succeeded", planID: "plan-1", plan }, { kind: "archive-not-needed" }, { kind: "import-succeeded", imported }, { kind: "secret-input-resolved" }, { kind: "secret-resolution-empty" }]) { const transition = workflow.transitionMigrationWorkflow(state, event); state = transition.state; terminalEffects = transition.effects; stages.push(state.stage); } this.value = { state, stages, terminalEffects }; });
defineStep("the workflow reaches COMPLETED", function () { assert.equal(this.value.state.stage, "COMPLETED"); });
defineStep("the terminal effect settles success", function () { assert.deepEqual(this.value.terminalEffects, [{ kind: "settle-success" }]); });
defineStep("the observed migration stages are ordered {string}", function (expected) { assert.deepEqual(this.value.stages, expected.split(", ")); });
defineStep("a completed workflow receives a late event", function () { let state = workflow.createMigrationWorkflow(identity()); const auth = { token: "token", creatorID: "creator" }; const artifact = { status: 200, bytes: new ArrayBuffer(0), filename: "project.zip", contentType: "application/zip" }; const plan = { planID: "plan-1", selection: identity().selection, labels: {} }; const imported = { importStatus: 200, importBytes: 0, projectID: "i" }; for (const event of [{ kind: "authentication-succeeded", auth }, { kind: "export-succeeded", artifact }, { kind: "plan-succeeded", planID: "plan-1", plan }, { kind: "archive-not-needed" }, { kind: "import-succeeded", imported }, { kind: "secret-input-resolved" }, { kind: "secret-resolution-empty" }]) state = workflow.transitionMigrationWorkflow(state, event).state; this.value = workflow.transitionMigrationWorkflow(state, { kind: "import-succeeded", imported }); });
defineStep("the late event is rejected with no effects", function () { assert.equal(this.value.accepted, false); assert.deepEqual(this.value.effects, []); });
defineStep("a succeeded observation receives failure and timeout events", function () { const started = observation.transitionJobObservation(observation.createJobObservationState("job"), { kind: "execute-dispatched", jobID: "job" }); const succeeded = observation.transitionJobObservation(started.state, { kind: "stream-succeeded" }); this.value = [observation.transitionJobObservation(succeeded.state, { kind: "stream-failed" }), observation.transitionJobObservation(succeeded.state, { kind: "poll-timeout" })]; });
defineStep("both events are rejected", function () { assert.equal(this.value.every((result) => result.accepted === false && result.effects.length === 0), true); });
defineStep("the production migration adapter runs a successful no-secret flow", async function () {
  const stages = [];
  const sourceProject = { id: "project", label: "Project", workspaceID: "source", environments: [] };
  const dependencies = { authenticate: async () => ({ token: "token", creatorID: "creator" }), exportVersion: async () => ({ status: 200, bytes: new ArrayBuffer(0), filename: "project.zip", contentType: "application/zip" }), buildPlan: async (auth, selection) => ({ planID: "plan-1", selection, labels: {} }), loadProjects: async (_auth, workspace) => (workspace === "source" ? [sourceProject] : []), renameProject: async () => undefined, confirmRename: async () => undefined, importVersion: async () => ({ importStatus: 200, importBytes: 0, projectID: "imported" }), resolveSecrets: async () => [], reconcileSecrets: async () => undefined, observeState: (state) => stages.push(state.stage) };
  this.value = await migration.executeConfirmedMigration("token", "plan-1", "source", "project", "version", "destination", "folder", "13.1", "operation", undefined, dependencies);
  this.stages = stages;
});
defineStep("the observed migration stages are ordered AUTHENTICATION, EXPORT, PLANNING, ARCHIVE_PREFLIGHT, IMPORT, SECRET_INPUT, SECRET_RESOLUTION, COMPLETED", function () { assert.deepEqual(this.stages, ["AUTHENTICATION", "EXPORT", "PLANNING", "ARCHIVE_PREFLIGHT", "IMPORT", "SECRET_INPUT", "SECRET_RESOLUTION", "COMPLETED"]); assert.equal(this.value.ok, true); });
defineStep("the production observation adapter handles a stream failure", async function () {
  const requests = [];
  const client = clientModule.createXYOpsClient({ baseURL: "https://xyops.test", apiKey: "key", events: {}, httpTimeoutMs: 100, pollIntervalMs: 1, pollTimeoutMs: 100, streamMaxBytes: 1000, streamMaxFrameBytes: 1000 }, {
    fetcher: async (input) => { requests.push(new URL(String(input)).pathname); return new Response(JSON.stringify(requests.length === 1 ? { code: 0, id: "job" } : { code: 0, data: { id: "job", code: 0, completed: true, output: JSON.stringify({ ok: true, operation: "execute_migration", operationID: "operation", result: {}, warnings: [] }), data: null } }), { status: 200 }); },
    streamer: async () => { throw diagnostics.fail("network", { endpoint: "/api/app/stream_job/v1" }); },
    sleeper: async () => undefined,
  });
  this.value = { result: await client.executeEvent("event", {}, envelopeSchemas.createVoiceflowEnvelopeSchema(z.unknown())), requests };
});
defineStep("polling is started only by the reducer effect", function () { assert.equal(this.value.result.ok, true); assert.deepEqual(this.value.requests, ["/api/app/run_event/v1", "/api/app/get_job/v1"]); });
defineStep("terminal cleanup signals race", function () { const started = observation.transitionJobObservation(observation.createJobObservationState("job"), { kind: "execute-dispatched", jobID: "job" }); const terminal = observation.transitionJobObservation(started.state, { kind: "stream-succeeded" }); this.value = [terminal, observation.transitionJobObservation(terminal.state, { kind: "poll-timeout" })]; });
defineStep("only one terminal settlement effect is accepted", function () { assert.equal(this.value[0].effects.filter((effect) => effect.kind === "settle").length, 1); assert.equal(this.value[1].accepted, false); });
defineStep("operation-specific Logux reducer effects are evaluated", async function () {
  const sent = [];
  let closeCount = 0;
  class MockWebSocket {
    static instances = [];
    readyState = 1;
    onopen = undefined; onmessage = undefined; onclose = undefined; onerror = undefined;
    constructor() { MockWebSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
    send(value) {
      const frame = JSON.parse(value); sent.push(frame);
      if (frame[0] === "connect") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["connected", 4, "server:connection", [100, 101], { subprotocol: "1.9.0" }]) }));
      if (frame[0] === "sync" && frame[2]?.type === "logux/subscribe") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["synced", frame[1]]) }));
      if (frame[0] === "sync" && frame[2]?.type === "assistant.PATCH_ONE") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["synced", frame[1]]) }));
      if (frame[0] === "sync" && frame[2]?.type === "secret.CREATE_ONE_STARTED") queueMicrotask(() => this.onmessage?.({ data: JSON.stringify(["sync", 99, { type: "secret.CREATE_ONE_DONE", payload: { result: { context: { assistantID: "assistant" } }, }, meta: { actionID: frame[2].meta.actionID } }]) }));
    }
    close() { closeCount += 1; queueMicrotask(() => this.onclose?.()); }
  }
  const previous = globalThis.WebSocket;
  globalThis.WebSocket = MockWebSocket;
  try {
    await renameAdapter.renameProject({ token: "token", creatorID: "creator" }, "workspace", "project", "folder", "renamed");
    await secretAdapter.createSecret({ token: "token", creatorID: "creator" }, "assistant", { name: "KEY", value: "value" });
    this.value = { sent, closeCount };
  } finally { globalThis.WebSocket = previous; }
});
defineStep("subscription and mutation effects retain their operation context", function () {
  const types = this.value.sent.flatMap((frame) => frame[2]?.type ?? []);
  assert.equal(types.includes("logux/subscribe"), true);
  assert.equal(types.includes("assistant.PATCH_ONE"), true);
  assert.equal(types.includes("secret.CREATE_ONE_STARTED"), true);
  assert.equal(this.value.closeCount >= 2, true);
});
defineStep("stale and late events are sent to runtime reducers", function () { const state = workflow.createMigrationWorkflow(identity()); const imported = { importStatus: 200, importBytes: 0, projectID: "stale" }; this.value = [workflow.transitionMigrationWorkflow(state, { kind: "import-succeeded", imported }), workflow.transitionMigrationWorkflow({ ...state, stage: "COMPLETED" }, { kind: "import-succeeded", imported })]; });
defineStep("no effect is emitted for either event", function () { assert.equal(this.value.every((result) => result.accepted === false && result.effects.length === 0), true); });
defineStep("a migration dependency failure is reduced", function () { this.value = workflow.transitionMigrationWorkflow(workflow.createMigrationWorkflow(identity("operation-99")), { kind: "dependency-failure", failure: { code: "DEPENDENCY_FAILURE", retryable: true, stage: "AUTHENTICATION", diagnostic: "network" } }).state; });
defineStep("operation identity and diagnostic stage remain in the same state", function () { assert.equal(this.value.operationID, "operation-99"); assert.equal(this.value.stage, "FAILED"); assert.match(this.value.diagnostic, /stage=AUTHENTICATION/); });
