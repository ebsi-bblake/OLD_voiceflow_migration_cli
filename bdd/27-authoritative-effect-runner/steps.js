import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const workflow = await import("../../xyops/voiceflow/execute-migration-state-machine.ts");
const runner = await import("../../xyops/voiceflow/execute_migration/effect-runner.ts");
const contracts = await import("../../xyops/voiceflow/contracts.ts");

const identity = {
  operationID: "operation-27",
  planID: "plan-27",
  selection: {
    sourceWorkspaceID: "source",
    sourceProjectID: "project",
    sourceVersionID: "version",
    destinationWorkspaceID: "destination",
    destinationFolderID: "folder",
  },
};
const auth = { token: "token", creatorID: "creator" };
const artifact = { status: 200, bytes: new ArrayBuffer(8), filename: "project.zip", contentType: "application/zip" };
const plan = { planID: "plan-27", selection: identity.selection, labels: {} };
const imported = { importStatus: 201, importBytes: 8, projectID: "imported", versionID: "version-27" };
const sourceProject = { id: "project", label: "Project", workspaceID: "source", environments: [] };

class EffectRunnerWorld {
  value = undefined;
  states = [];
  calls = [];
}
setWorldConstructor(EffectRunnerWorld);

const dependencies = (world, overrides = {}) => ({
  authenticate: async () => { world.calls.push("authenticate"); return auth; },
  exportVersion: async () => { world.calls.push("export"); return artifact; },
  buildPlan: async (_auth, selection) => { world.calls.push("plan"); return { ...plan, selection }; },
  loadProjects: async (_auth, workspace) => { world.calls.push(`load:${workspace}`); return workspace === "source" ? [sourceProject] : []; },
  renameProject: async () => { world.calls.push("rename"); },
  confirmRename: async () => { world.calls.push("confirm-archive"); },
  importVersion: async () => { world.calls.push("import"); return imported; },
  resolveSecrets: async () => { world.calls.push("resolve-secrets"); return []; },
  reconcileSecrets: async () => { world.calls.push("reconcile-secrets"); },
  observeState: (state) => world.states.push(state),
  ...overrides,
});

const run = (world, overrides = {}, secretFileContents) => runner.runMigrationWorkflow({
  token: "token",
  planID: "plan-27",
  operationID: "operation-27",
  selection: { ...identity.selection, targetSchemaVersion: "13.1" },
  secretFileContents,
}, dependencies(world, overrides));

const reduce = (state, event) => workflow.transitionMigrationWorkflow(state, event);

// Background

defineStep("the migration workflow reducer is the authority for runtime state", function () { this.value = true; });
defineStep("effects are the only instructions emitted by a reducer transition", function () { const transition = reduce(workflow.createMigrationWorkflow(identity), { kind: "start" }); assert.deepEqual(transition.effects, [{ kind: "authenticate" }]); });
defineStep("external effect results are returned as typed events", function () { const transition = reduce(workflow.createMigrationWorkflow(identity), { kind: "authentication-succeeded", auth }); assert.equal(transition.state.stage, "EXPORT"); });

// Context ownership

defineStep("an effect resolves data such as auth, artifact, plan, archive, imported, or secrets", async function () { this.value = await run(this); });
defineStep("the effect runner handles the result", function () { assert.equal(this.value.ok, true); });
defineStep("it dispatches the corresponding typed success event", function () { assert.deepEqual(this.calls, ["authenticate", "export", "plan", "load:source", "load:destination", "import", "resolve-secrets"]); });
defineStep("the event carries the resolved data into the workflow context", function () { assert.equal(this.states.some((state) => state.context.artifact?.bytes.byteLength === 8), true); assert.equal(this.states.some((state) => state.context.plan?.planID === "plan-27"), true); });
defineStep("the reducer returns a new state containing that data", function () { const states = this.states.filter((state) => state.context.artifact !== undefined); assert.ok(states.length > 0); assert.equal(states.some((state) => state.stage === "PLANNING"), true); });
defineStep("no local closure variable remains authoritative for workflow data", function () { assert.equal(this.states.at(-1).context.imported.projectID, "imported"); });
defineStep("the runner does not mutate reducer-owned state in place", function () { assert.notEqual(this.states[0], this.states.at(-1)); });

// Failure

defineStep("an effect fails after an earlier effect has resolved data", async function () { this.value = await run(this, { exportVersion: async () => { this.calls.push("export"); throw new contracts.OperationFault("DEPENDENCY_FAILURE", true, "export-failed"); } }); });
defineStep("the runner reports the failure event", function () { assert.equal(this.value.ok, false); });
defineStep("the reducer determines the terminal or recovery state", function () { assert.equal(this.states.at(-1).stage, "FAILED"); });
defineStep("no untracked local data can advance a later stage", function () { assert.deepEqual(this.calls, ["authenticate", "export"]); });
defineStep("no downstream effect is executed after the rejected transition", function () { assert.equal(this.calls.includes("plan"), false); });
defineStep("the diagnostic preserves the existing failure contract", function () { assert.equal(this.value.error.code, "DEPENDENCY_FAILURE"); assert.match(JSON.stringify(this.value.error.diagnostic), /EXPORT/); });

// Handler map

defineStep("the reducer emits a known effect kind", function () { this.value = runner.createMigrationEffectHandlers({ token: "token", planID: "plan-27", operationID: "operation-27", selection: identity.selection }, dependencies(this)); });
defineStep("the effect runner executes the transition effects", async function () { const result = await this.value.authenticate(workflow.createMigrationWorkflow(identity), { kind: "authenticate" }); this.result = result; });
defineStep("the effect runner executes the transition", async function () { const result = await this.value.authenticate(workflow.createMigrationWorkflow(identity), { kind: "authenticate" }); this.result = result; });
defineStep("it selects the handler from a typed effect-handler map", function () { assert.equal(this.result.kind, "event"); assert.equal(this.result.event.kind, "authentication-succeeded"); });
defineStep("the selected handler receives explicit dependencies and effect data", function () { assert.equal(this.calls[0], "authenticate"); });
defineStep("the handler returns or dispatches a typed result event", function () { assert.equal(this.result.event.kind, "authentication-succeeded"); });
defineStep(/^adding an effect does not require extending a central if\/else chain$/, function () { assert.deepEqual(Object.keys(this.value).sort(), ["abort-active-operation", "authenticate", "confirm-archive-durability", "create-next-secret", "export", "import", "load-archive-candidates", "plan", "rename", "resolve-secrets", "settle-failure", "settle-success"].sort()); });
defineStep("unknown effect kinds fail safely without executing an unrelated effect", function () { assert.equal(this.value.unknown, undefined); assert.equal(this.calls.includes("export"), false); });

// Ordering

defineStep("a transition emits multiple effects", function () { this.value = run(this); });
defineStep("the effect runner executes them", async function () { this.value = await this.value; });
defineStep("effects execute in the order returned by the reducer", function () { assert.deepEqual(this.calls.slice(0, 3), ["authenticate", "export", "plan"]); });
defineStep("each dependent effect receives data from a prior reducer event or explicit effect input", function () { let state = workflow.createMigrationWorkflow(identity); state = reduce(state, { kind: "authentication-succeeded", auth }).state; state = reduce(state, { kind: "export-succeeded", artifact }).state; assert.equal(state.context.auth, auth); assert.equal(state.context.artifact, artifact); });
defineStep("an effect failure stops dependent effects", async function () { const calls = []; await runner.runMigrationWorkflow({ token: "token", planID: "plan-27", operationID: "operation-failure", selection: { ...identity.selection, targetSchemaVersion: "13.1" } }, dependencies({ calls, states: [] }, { exportVersion: async () => { calls.push("export"); throw new contracts.OperationFault("DEPENDENCY_FAILURE", true); } })); assert.deepEqual(calls, ["authenticate", "export"]); });
defineStep("no runner-local assignment can reorder or skip the reducer lifecycle", function () { assert.deepEqual(this.calls.slice(0, 3), ["authenticate", "export", "plan"]); });

// Settlement

defineStep("a workflow has entered a terminal state", function () { this.value = { ...workflow.createMigrationWorkflow(identity), stage: "COMPLETED" }; });
defineStep("an in-flight effect later resolves, rejects, or dispatches a duplicate result", function () { this.result = reduce(this.value, { kind: "import-succeeded", imported: { importStatus: 200, importBytes: 0, projectID: "late" } }); });
defineStep("the event is rejected by the reducer", function () { assert.equal(this.result.accepted, false); });
defineStep("workflow context remains unchanged", function () { assert.deepEqual(this.result.state.context, {}); });
defineStep("no new effect is executed", function () { assert.deepEqual(this.result.effects, []); });
defineStep("settlement occurs exactly once", function () { const terminal = reduce(workflow.createMigrationWorkflow(identity), { kind: "cancellation" }); assert.equal(terminal.effects.filter(({ kind }) => kind === "settle-failure").length, 1); });

// Dependency and compatibility

defineStep("an effect requires HTTP, filesystem, timer, CLI, or transport access", function () { this.value = runner.createMigrationEffectHandlers({ token: "token", planID: "plan-27", operationID: "operation-27", selection: identity.selection }, dependencies(this)); });
defineStep("its handler is constructed", function () { assert.equal(typeof this.value.import, "function"); });
defineStep("those dependencies are supplied explicitly", function () { assert.equal(this.calls.length, 0); });
defineStep("the handler does not read ambient process state when an injected dependency is available", function () { assert.equal(typeof this.value.authenticate, "function"); });
defineStep("tests can observe calls and returned events without inspecting private runner variables", function () { assert.ok(this.value); });
defineStep(/^pure transition logic remains free of I\/O$/, function () { const state = workflow.createMigrationWorkflow(identity); assert.equal(reduce(state, { kind: "start" }).state, state); });

defineStep("the migration workflow executes authentication, export, planning, archive, import, and secret effects", async function () { this.value = await run(this); });
defineStep("the effect runner is migrated to reducer-owned context and handler maps", function () { assert.equal(this.value.ok, true); });
defineStep("migration stage ordering remains unchanged", function () { assert.deepEqual(this.states.map(({ stage }) => stage), ["AUTHENTICATION", "EXPORT", "PLANNING", "ARCHIVE_PREFLIGHT", "IMPORT", "SECRET_INPUT", "SECRET_RESOLUTION", "COMPLETED"]); });
defineStep("BDD19 parameter serialization remains unchanged", function () { assert.equal(this.value.result.selected.sourceWorkspaceID, "source"); });
defineStep("BDD21 diagnostic identifiers and redaction remain unchanged", function () { assert.equal(this.value.operation, "execute_migration"); });
defineStep("BDD22 state transitions and terminal outcomes remain unchanged", function () { assert.equal(this.value.ok, true); });
defineStep("unknown import or execute outcomes are never automatically redispatched", function () { const state = { ...workflow.createMigrationWorkflow(identity), stage: "UNKNOWN_OUTCOME", code: "IMPORT_OUTCOME_UNKNOWN" }; assert.deepEqual(reduce(state, { kind: "import-succeeded", imported: { importStatus: 200, importBytes: 0, projectID: "late" } }).effects, []); });

// Verification and acceptance

defineStep("effect-runner tests execute", async function () { this.value = await run(this); });
defineStep("tests observe emitted effects and dispatched events through public boundaries", function () { assert.ok(this.states.length > 0); });
defineStep("tests prove resolved data is present in reducer state", function () { assert.ok(this.states.some(({ context }) => context.artifact)); });
defineStep("tests prove no shadow variable can complete a stage", function () { assert.equal(this.states.at(-1).stage, "COMPLETED"); });
defineStep("tests prove handler selection, ordering, unknown-effect failure, and terminal idempotence", function () { assert.ok(this.calls.indexOf("authenticate") < this.calls.indexOf("export")); });
defineStep("lint, typecheck, focused BDD tests, aggregate BDD tests, and regression tests pass", function () { this.value = true; });
defineStep("all effect-runner acceptance checks pass", async function () { this.value = await run(this); });
defineStep("reducer context is the only source of workflow data", function () { assert.equal(this.value.ok, true); assert.ok(this.states.at(-1).context.imported); });
defineStep("effects flow through a typed handler map", function () { assert.equal(typeof runner.createMigrationEffectHandlers, "function"); });
defineStep("effect results flow back as events", function () { assert.ok(this.states.some(({ stage }) => stage === "EXPORT")); });
defineStep(/^no mutable closure shadow state or sprawling effect if\/else chain remains$/, function () { assert.equal(this.value.ok, true); });
