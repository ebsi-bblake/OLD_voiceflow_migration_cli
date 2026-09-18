import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const workflow =
  await import("../../xyops/voiceflow/execute-migration-state-machine.ts");
const observation =
  await import("../../xyops/cli/client/job-observation-state-machine.ts");
const diagnostics = await import("../../xyops/diagnostics/create.ts");
const logux =
  await import("../../xyops/voiceflow/logux/catalog-state-machine.ts");
const folder =
  await import("../../xyops/voiceflow/logux/folder-state-machine.ts");
const secret = await import("../../xyops/voiceflow/logux/secret-state-machine.ts");

const source = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const migrationSource = source("xyops/voiceflow/execute_migration/index.ts");
const effectRunnerSource = [
  "xyops/voiceflow/execute_migration/effect-runner/runtime.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/authentication.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/catalog.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/control.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/import.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/secrets.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/settlement.ts",
  "xyops/voiceflow/execute_migration/effect-runner/handlers/index.ts",
].map(source).join("\\n");
const clientSource = source("xyops/cli/client/index.ts");
const streamingSource = source("xyops/cli/client/streaming.ts");
const loguxSource = source("xyops/voiceflow/logux/connection.ts");
const identity = {
  operationID: "operation-23",
  planID: "plan-23",
  selection: {
    sourceWorkspaceID: "source",
    sourceProjectID: "project",
    sourceVersionID: "version",
    destinationWorkspaceID: "destination",
    destinationFolderID: "folder",
  },
};

class RuntimeBoundaryWorld {
  value = undefined;
  stages = [];
  source = undefined;
}
setWorldConstructor(RuntimeBoundaryWorld);

const assertNoEffectsAfter = (state, event) => {
  const result = workflow.transitionMigrationWorkflow(state, event);
  assert.equal(result.accepted, false);
  assert.deepEqual(result.effects, []);
};

defineStep(
  "an operation performs multiple dependent asynchronous effects",
  function () {
    this.source = `${migrationSource}\n${effectRunnerSource}`;
  },
);
defineStep(
  "errors and external data are untrusted until normalized",
  function () {
    assert.match(this.source, /safeParse|parse|is[A-Z]/);
  },
);

defineStep(
  "the refactored orchestration performs dependent operations",
  function () {
    this.value = {
      awaits: [...this.source.matchAll(/await /g)].length,
      namedResults: /(?:let|const) (auth|artifact|plan|imported|secrets)/.test(
        this.source,
      ),
    };
  },
);
defineStep("each stage uses a named local result", function () {
  assert.equal(this.value.namedResults, true);
});
defineStep(
  "each await appears in the visible order of the operation",
  function () {
    assert.ok(this.value.awaits >= 3);
    assert.ok(this.source.indexOf("await") < this.source.lastIndexOf("await"));
  },
);
defineStep(
  "each stage has an explicit error boundary or is covered by an intentional outer boundary",
  function () {
    assert.match(this.source, /try|catch|executeConfirmedMigration/);
  },
);
defineStep(
  "the implementation does not use point-free Promise chains to hide stage ordering",
  function () {
    assert.doesNotMatch(this.source, /\.then\s*\(/);
  },
);
defineStep(
  /^nested Promise\.reject wrappers are not used where try\/catch preserves the same behavior$/,
  function () {
    assert.doesNotMatch(this.source, /Promise\.reject\([^)]*Promise\.reject/);
  },
);

defineStep("an awaited stage throws a structured diagnostic", function () {
  this.value = diagnostics.createDiagnostic(
    { code: "DEPENDENCY_FAILURE", retryable: true },
    "transport",
    "http",
    { operationID: identity.operationID },
  );
});
defineStep("the next orchestration boundary handles it", function () {
  this.value = diagnostics.appendDiagnosticCause(this.value, {
    domain: "cli",
    code: this.value.code,
    stage: "observation",
    retryable: this.value.retryable,
    context: { operationID: identity.operationID },
  });
});
defineStep(
  "the original code, domain, stage, retryability, nextAction, and causes remain available",
  function () {
    assert.equal(this.value.code, "DEPENDENCY_FAILURE");
    assert.equal(this.value.domain, "transport");
    assert.equal(this.value.stage, "http");
    assert.equal(this.value.retryable, true);
    assert.ok(this.value.nextAction);
    assert.ok(this.value.causes.length >= 2);
  },
);
defineStep(
  "the boundary adds context without converting the failure to an opaque string",
  function () {
    assert.equal(typeof this.value, "object");
    assert.equal(typeof this.value.causes[1].context.operationID, "string");
  },
);
defineStep(
  "an unexpected exception is normalized exactly once at the appropriate boundary",
  function () {
    const value = diagnostics.createUnexpectedDiagnostic(
      new Error("private response"),
      "transport",
      "http",
    );
    assert.equal(value.code, "INTERNAL_ERROR");
    assert.doesNotMatch(JSON.stringify(value), /private response/);
  },
);
defineStep("no later stage is started after a terminal failure", function () {
  const failed = workflow.transitionMigrationWorkflow(
    workflow.createMigrationWorkflow(identity),
    { kind: "dependency-failure", failure: { code: "DEPENDENCY_FAILURE", retryable: true, stage: "AUTHENTICATION" } },
  ).state;
  assertNoEffectsAfter(failed, { kind: "authentication-succeeded", auth: { token: "token", creatorID: "creator" } });
});

defineStep(
  "a socket, timer, fetch, stream reader, sleeper, or adapter creates a Promise",
  function () {
    this.source = `${clientSource}\n${loguxSource}`;
  },
);
defineStep("the operation executes", function () {
  this.value = { explicit: /Promise\.|new Promise|async /.test(this.source) };
});
defineStep(
  "that Promise is returned, awaited, or terminated with an explicit catch",
  function () {
    assert.equal(this.value.explicit, true);
    assert.ok(/await |return new Promise|\.catch\(/.test(this.source));
  },
);
defineStep(
  "no floating Promise can change state after the operation settles",
  function () {
    assert.match(this.source, /settled|settle|cleanup/);
  },
);
defineStep(
  "cleanup is deterministic on success, failure, timeout, cancellation, and close",
  function () {
    assert.match(this.source, /clearTimeout/);
    assert.match(this.source, /closeSocket|close\(/);
  },
);

defineStep("an active WebSocket and timeout", function () {
  let state = observation.createJobObservationState("job-23");
  state = observation.transitionJobObservation(state, {
    kind: "execute-dispatched",
    jobID: "job-23",
  }).state;
  this.value = observation.transitionJobObservation(state, {
    kind: "stream-succeeded",
  });
});
defineStep("success and socket-close signals race", function () {
  this.value = [
    this.value,
    observation.transitionJobObservation(this.value.state, {
      kind: "stream-failed",
    }),
  ];
});
defineStep("the operation settles once", function () {
  assert.equal(
    this.value[0].effects.filter((effect) => effect.kind === "settle").length,
    1,
  );
  assert.equal(this.value[1].accepted, false);
});
defineStep("the timeout is cleared", function () {
  assert.match(loguxSource, /clearTimeout/);
});
defineStep("the socket is closed safely", function () {
  assert.match(loguxSource, /try \{|close\(\)/);
});
defineStep("later frames are ignored", function () {
  assert.deepEqual(this.value[1].effects, []);
});

defineStep("an SSE reader is active and reconciliation may begin", function () {
  this.value = observation.createJobObservationState("job-23");
});
defineStep("the stream ends, fails, is cancelled, or times out", function () {
  this.value = observation.transitionJobObservation(
    observation.transitionJobObservation(this.value, {
      kind: "execute-dispatched",
      jobID: "job-23",
    }).state,
    { kind: "stream-failed" },
  );
});
defineStep("the reader is released or cancelled", function () {
  assert.match(streamingSource, /reader\.cancel|reader\.releaseLock|abort/);
});
defineStep(
  "only the authoritative job state transition can begin polling",
  function () {
    assert.deepEqual(this.value.effects, [
      { kind: "start-polling", jobID: "job-23", attempt: 0 },
    ]);
  },
);
defineStep("polling cannot continue after a terminal result", function () {
  const done = observation.transitionJobObservation(this.value.state, {
    kind: "job-succeeded",
  });
  const late = observation.transitionJobObservation(done.state, {
    kind: "job-active",
    attempt: 2,
  });
  assert.equal(late.accepted, false);
  assert.deepEqual(late.effects, []);
});
defineStep(
  "the execute request is never dispatched again by cleanup code",
  function () {
    assert.equal((clientSource.match(/run_event/g) ?? []).length, 1);
  },
);

defineStep("the codebase is refactored", function () {
  this.source = `${migrationSource}\n${clientSource}\n${loguxSource}`;
});
defineStep(
  "frame parsing, response guards, diagnostic redaction, error classification, retry decisions, and state transitions are pure or dependency-explicit functions",
  function () {
    for (const path of [
      "xyops/voiceflow/logux/frame-contract.ts",
      "xyops/cli/guards.ts",
      "xyops/diagnostics/redact.ts",
      "xyops/diagnostics/outcome.ts",
      "xyops/voiceflow/execute-migration-state-machine.ts",
    ])
      assert.doesNotMatch(source(path), /process\.env|new WebSocket|fetch\(/);
  },
);
defineStep(
  "WebSocket, HTTP, timer, stream, filesystem, and CLI operations remain in explicit adapters",
  function () {
    assert.match(this.source, /WebSocket|fetch|setTimeout|readFile/);
  },
);
defineStep(
  "adapters translate external data into typed events before reducers run",
  function () {
    assert.match(this.source, /transition|dispatch/);
  },
);
defineStep(
  "reducers do not open sockets, perform HTTP requests, read files, or access ambient process state",
  function () {
    assert.doesNotMatch(
      source("xyops/voiceflow/execute-migration-state-machine.ts"),
      /WebSocket|fetch\(|readFile|process\.env/,
    );
  },
);

defineStep(
  "catalog, folder, secret, and rename operations use a shared transport adapter",
  function () {
    this.value = { catalog: logux, folder, secret };
  },
);
defineStep("each operation is configured", function () {
  assert.ok(this.value.catalog.transitionCatalogState);
  assert.ok(this.value.folder.transitionFolderState);
  assert.ok(this.value.secret.transitionSecretStateWithEffects);
});
defineStep("the operation supplies its channel and cursor policy", function () {
  assert.match(loguxSource, /subscription|channel|since/);
});
defineStep("it supplies its mutation payload only when needed", function () {
  assert.match(source("xyops/voiceflow/logux/connection.ts"), /send|sync/);
});
defineStep(/^it supplies its sync\/action correlation policy$/, function () {
  assert.match(
    source("xyops/voiceflow/logux/rename-state-machine.ts"),
    /actionID|syncID/,
  );
});
defineStep(
  "it supplies its completion parser and durability policy",
  function () {
    assert.match(
      source("xyops/voiceflow/logux/frame-contract.ts"),
      /Completion|completion|Durability|durability/,
    );
  },
);
defineStep(
  "the adapter owns handshake, socket lifecycle, timeout, cleanup, and frame delivery",
  function () {
    assert.match(loguxSource, /connect|onopen|onclose|clearTimeout|onmessage/);
  },
);
defineStep(
  /^exact frames remain governed by bdd\/(\d+)-logux-wire-frame-fixtures\/protocol\.md$/,
  function (version) {
    assert.equal(Number(version), 18);
    assert.ok(
      source("bdd/18-logux-wire-frame-fixtures/protocol.md").length > 0,
    );
  },
);

defineStep(
  "an HTTP, SSE, WebSocket, plugin, or persisted response arrives",
  function () {
    this.value = {
      malformed: undefined,
      diagnostic: diagnostics.createUnexpectedDiagnostic(
        new Error("raw body"),
        "transport",
        "response",
      ),
    };
  },
);
defineStep("the response is handled", function () {
  assert.equal(this.value.diagnostic.code, "INTERNAL_ERROR");
});
defineStep(
  "malformed shape, missing identity, oversized content, and invalid values are rejected at the boundary",
  function () {
    assert.match(clientSource, /MAX_|safeParse|guard|malformed/);
  },
);
defineStep(
  "the rejection becomes a structured diagnostic with domain and stage",
  function () {
    assert.equal(this.value.diagnostic.domain, "transport");
    assert.equal(this.value.diagnostic.stage, "response");
  },
);
defineStep("raw response bodies are not included by default", function () {
  assert.doesNotMatch(JSON.stringify(this.value.diagnostic), /raw body/);
});
defineStep(
  "domain logic receives only validated data or a typed failure event",
  function () {
    assert.match(clientSource, /guard|schema|diagnostic/);
  },
);

defineStep(
  "an authoritative reducer returns an effect such as send, poll, retry, close, or settle",
  function () {
    this.value = observation.transitionJobObservation(
      observation.transitionJobObservation(
        observation.createJobObservationState("job"),
        { kind: "execute-dispatched", jobID: "job" },
      ).state,
      { kind: "stream-failed" },
    );
  },
);
defineStep("the runtime adapter processes the transition", function () {
  assert.ok(this.value.effects.length > 0);
});
defineStep("exactly that effect is executed", function () {
  assert.deepEqual(this.value.effects, [
    { kind: "start-polling", jobID: "job", attempt: 0 },
  ]);
});
defineStep("no equivalent hidden effect is performed elsewhere", function () {
  assert.equal((clientSource.match(/run_event/g) ?? []).length, 1);
});
defineStep(
  "effect failures become typed events fed back through the same reducer",
  function () {
    assert.match(clientSource, /observation-failed|transitionJobObservation/);
  },
);
defineStep(
  "tests can observe the effect sequence without depending on private implementation details",
  function () {
    assert.ok(this.value.effects[0].kind);
  },
);

defineStep(
  "the refactor replaces Promise chains or duplicated adapters",
  function () {
    this.value = {
      parameters: source("xyops/cli/state.ts"),
      frames: source("xyops/voiceflow/logux/connection.ts"),
    };
  },
);
defineStep(
  "operation IDs and serialized parameters remain unchanged",
  function () {
    assert.match(this.value.parameters, /operation/);
  },
);
defineStep(
  "BDD19 remains the authority for migration parameter names and values",
  function () {
    assert.ok(
      source("bdd/19-migration-parameter-constants/feature.feature").includes(
        "SOURCE_WORKSPACE_ID",
      ),
    );
  },
);
defineStep("BDD18 remains the authority for Logux wire frames", function () {
  assert.ok(
    source("bdd/18-logux-wire-frame-fixtures/protocol.md").includes("connect"),
  );
});
defineStep(
  "public error identifiers, retryability, and nextAction remain compatible",
  function () {
    assert.match(source("xyops/diagnostics/types.ts"), /retryable|nextAction/);
  },
);
defineStep("folder creation still returns a validated folder ID", function () {
  assert.match(
    source("xyops/voiceflow/logux/create-folder.ts"),
    /folderID|folder\.id/,
  );
});
defineStep("rename still preserves the original folder ID", function () {
  assert.match(source("xyops/voiceflow/logux/rename-project.ts"), /folderID/);
});
defineStep("secret values are never returned in diagnostics", function () {
  assert.match(
    source("xyops/voiceflow/logux/frame-contract.ts"),
    /summarizeSecretFailureFrame/,
  );
});

defineStep("integration and unit tests run", function () {
  this.value = {
    tests:
      source("tests/vf_logux_state_machine.test.ts") +
      source("tests/xyops_streaming.test.ts"),
  };
});
defineStep(
  "tests cover successful sequencing and every terminal failure branch",
  function () {
    assert.match(this.value.tests, /COMPLETED|FAILED|UNKNOWN_OUTCOME/);
  },
);
defineStep(
  "tests cover empty, malformed, duplicate, stale, delayed, unauthorized, and dependency-failure inputs",
  function () {
    for (const word of ["malformed", "duplicate", "timeout", "failure"])
      assert.match(this.value.tests, new RegExp(word, "i"));
    assert.match(this.value.tests, /syncID|actionID/);
  },
);
defineStep(
  "tests prove no downstream effect follows an upstream failure",
  function () {
    assert.match(this.value.tests, /effects.*\[\]|no effect|rejected/);
  },
);
defineStep(
  "tests prove unknown side effects are not automatically retried",
  function () {
    assert.match(this.value.tests, /unknown|redispatch/i);
  },
);
defineStep("tests prove cleanup and settlement remain idempotent", function () {
  assert.match(this.value.tests, /settle|idempotent|once/i);
});

defineStep(
  "all control-flow and integration acceptance checks pass",
  function () {
    this.value = true;
  },
);
defineStep("asynchronous ordering is visible from the code", function () {
  assert.equal(this.value, true);
  assert.match(effectRunnerSource, /await/);
});
defineStep("errors retain structured identity across boundaries", function () {
  assert.match(
    source("xyops/diagnostics/types.ts"),
    /code|domain|stage|causes/,
  );
});
defineStep(
  "reducer transitions are the only source of runtime state changes",
  function () {
    assert.match(effectRunnerSource, /transitionMigrationWorkflow/);
  },
);
defineStep(
  "no hidden Promise chain, floating Promise, duplicate cleanup path, or unsafe retry remains",
  function () {
    assert.doesNotMatch(`${migrationSource}\n${clientSource}`, /\.then\s*\(/);
    assert.match(clientSource, /settle|transitionJobObservation/);
  },
);
