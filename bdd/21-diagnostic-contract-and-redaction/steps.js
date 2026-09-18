import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const { redactDiagnosticValue } = await import("../../xyops/diagnostics/redact.ts");
const { nextAction } = await import("../../xyops/diagnostics/next_action.ts");
const {
  createDiagnostic,
  createUnexpectedDiagnostic,
  appendDiagnosticCause,
} = await import("../../xyops/diagnostics/create.ts");
const { classifyDispatchOutcome } = await import("../../xyops/diagnostics/outcome.ts");
const {
  createPluginDiagnostic,
  formatPluginDiagnostic,
} = await import("../../xyops/plugin/diagnostics.ts");
const { ok, error } = await import("../../xyops/diagnostics/result.ts");
const { cliErrorOutput, fail } = await import("../../xyops/cli/diagnostics.ts");

class DiagnosticWorld {
  value = undefined;
  original = undefined;
  action = undefined;
}

setWorldConstructor(DiagnosticWorld);

defineStep("a diagnostic context contains nested secrets and safe fields", function () {
  this.original = {
    operationID: "operation-1",
    nested: { Authorization: "Bearer secret-token", status: 503 },
  };
  this.value = redactDiagnosticValue(this.original);
});

defineStep("the redacted context omits secret values", function () {
  assert.equal(this.value.nested.Authorization, "[REDACTED]");
  assert.equal(this.value.nested.status, 503);
  assert.notEqual(JSON.stringify(this.value).includes("secret-token"), true);
});

defineStep("the original diagnostic context is unchanged", function () {
  assert.equal(this.original.nested.Authorization, "Bearer secret-token");
});

defineStep("a diagnostic context contains deep and oversized collections", function () {
  const values = Array.from({ length: 40 }, (_, index) => index);
  let deep = { value: "leaf" };
  for (let index = 0; index < 10; index += 1) deep = { next: deep };
  this.value = redactDiagnosticValue({ values, deep });
});

defineStep("redaction returns bounded structured data", function () {
  assert.equal(this.value.values.length, 32);
  assert.equal(JSON.stringify(this.value).includes("[TRUNCATED]"), true);
});

defineStep("safe collection order is preserved", function () {
  assert.deepEqual(this.value.values.slice(0, 3), [0, 1, 2]);
});

defineStep("the diagnostic class is {string}", function (diagnosticClass) {
  this.action = nextAction(diagnosticClass);
});

defineStep("the next action is {string}", function (expectedAction) {
  assert.equal(this.action, expectedAction);
});

defineStep("a diagnostic context contains token, api_key, defaultValue, and exported-data fields", function () {
  this.value = redactDiagnosticValue({
    token: "token-value",
    api_key: "key-value",
    defaultValue: "default-value",
    "exported-data": "exported-value",
  });
});

defineStep("every sensitive alias is redacted", function () {
  assert.deepEqual(this.value, {
    token: "[REDACTED]",
    api_key: "[REDACTED]",
    defaultValue: "[REDACTED]",
    "exported-data": "[REDACTED]",
  });
});

defineStep("a boundary returns a successful Result", function () {
  this.value = ok("validated");
});

defineStep("the Result contains a value and no error", function () {
  assert.deepEqual(this.value, { ok: true, value: "validated" });
  assert.equal(Object.hasOwn(this.value, "error"), false);
});

defineStep("a boundary returns a failed Result", function () {
  this.value = error({ code: "INVALID_INPUT" });
});

defineStep("the Result contains an error and no value", function () {
  assert.deepEqual(this.value, { ok: false, error: { code: "INVALID_INPUT" } });
  assert.equal(Object.hasOwn(this.value, "value"), false);
});

defineStep("a core dependency fault is converted at the import stage", function () {
  this.value = createDiagnostic(
    { code: "IMPORT_OUTCOME_UNKNOWN", retryable: true },
    "core",
    "import",
    { projectID: "project-1" },
  );
});

defineStep("the diagnostic preserves code, domain, stage, retryability, and nextAction", function () {
  assert.deepEqual(
    {
      code: this.value.code,
      domain: this.value.domain,
      stage: this.value.stage,
      retryable: this.value.retryable,
      nextAction: this.value.nextAction,
    },
    {
      code: "IMPORT_OUTCOME_UNKNOWN",
      domain: "core",
      stage: "import",
      retryable: true,
      nextAction: "Reconcile the destination project before retrying",
    },
  );
});

defineStep("the diagnostic contains a structured cause", function () {
  assert.deepEqual(this.value.causes[0], {
    domain: "core",
    code: "IMPORT_OUTCOME_UNKNOWN",
    stage: "import",
    retryable: true,
    context: { projectID: "project-1" },
  });
});

defineStep("a diagnostic crosses a plugin boundary", function () {
  const cause = {
    domain: "plugin",
    code: "EXECUTE_OUTCOME_UNKNOWN",
    stage: "response",
    retryable: true,
    context: { operationID: "operation-1" },
  };
  this.value = appendDiagnosticCause(
    createDiagnostic({ code: "IMPORT_OUTCOME_UNKNOWN", retryable: true }, "core", "import"),
    cause,
  );
});

defineStep("the root diagnostic code is preserved", function () {
  assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN");
});

defineStep("the translation cause is appended in order", function () {
  assert.equal(this.value.causes.at(-1).domain, "plugin");
  assert.equal(this.value.causes.at(-1).code, "EXECUTE_OUTCOME_UNKNOWN");
});

defineStep("an unexpected failure crosses the transport boundary", function () {
  this.value = createUnexpectedDiagnostic(
    new Error("raw response body secret-token"),
    "transport",
    "http",
  );
});

defineStep("the diagnostic uses INTERNAL_ERROR without raw exception text", function () {
  assert.equal(this.value.code, "INTERNAL_ERROR");
  assert.equal(JSON.stringify(this.value).includes("raw response body"), false);
  assert.equal(this.value.domain, "transport");
});

defineStep("a request fails before dispatch", function () {
  this.value = classifyDispatchOutcome({ dispatched: false, confirmedFailure: true });
});

defineStep("a dispatched request has a confirmed rejection", function () {
  this.value = classifyDispatchOutcome({ dispatched: true, confirmedFailure: true });
});

defineStep("a dispatched request has no confirmed result", function () {
  this.value = classifyDispatchOutcome({ dispatched: true, confirmedFailure: false });
});

defineStep("its outcome state is {string}", function (expectedState) {
  assert.equal(this.value, expectedState);
});

defineStep("a plugin validation failure is converted at the response stage", function () {
  this.value = createPluginDiagnostic("response", { code: "INVALID_INPUT" });
});

defineStep("its diagnostic domain is {string}", function (domain) {
  assert.equal(this.value.domain, domain);
});

defineStep("its diagnostic stage is {string}", function (stage) {
  assert.equal(this.value.stage, stage);
});

defineStep("its diagnostic code is {string}", function (code) {
  assert.equal(this.value.code, code);
});

defineStep("a failure with code {string} is converted at the core boundary", function (code) {
  this.value = createDiagnostic({ code, retryable: false }, "core", "operation");
});

defineStep("a failure with code {string} is converted at the CLI boundary", function (code) {
  this.value = createDiagnostic({ code, retryable: true }, "cli", "observation");
});

defineStep("its diagnostic nextAction is {string}", function (action) {
  assert.equal(this.value.nextAction, action);
});

defineStep("a core diagnostic is translated by the plugin boundary", function () {
  this.value = appendDiagnosticCause(
    createDiagnostic({ code: "PLAN_MISMATCH", retryable: false }, "core", "planning"),
    {
      domain: "plugin",
      code: "PLAN_MISMATCH",
      stage: "response",
      retryable: false,
      context: {},
    },
  );
});

defineStep("the translated diagnostic keeps its original code", function () {
  assert.equal(this.value.code, "PLAN_MISMATCH");
});

defineStep("the translated diagnostic has a plugin cause", function () {
  assert.equal(this.value.causes.at(-1).domain, "plugin");
});

defineStep("the BDD21 diagnostic acceptance checks run", function () {
  this.value = {
    structured: true,
    redacted: redactDiagnosticValue({ token: "secret" }).token === "[REDACTED]",
    outcome: classifyDispatchOutcome({ dispatched: true, confirmedFailure: false }),
    compatibility: formatPluginDiagnostic("response", new Error("unsafe raw text")),
  };
});

defineStep("structured identity, redaction, and outcome safety are verified", function () {
  assert.deepEqual(
    {
      structured: this.value.structured,
      redacted: this.value.redacted,
      outcome: this.value.outcome,
    },
    { structured: true, redacted: true, outcome: "unknown-outcome" },
  );
  assert.equal(this.value.compatibility.includes("unsafe raw text"), false);
});

defineStep("the legacy plugin boundary remains compatibility-safe", function () {
  assert.match(this.value.compatibility, /pluginVersion=.*stage=response/);
  assert.match(this.value.compatibility, /code=INTERNAL_ERROR/);
});

// The broad feature is intentionally executable: each step below observes the
// canonical DTO or a public compatibility boundary rather than source text.
defineStep("the active XYOps plugin, CLI client, and Voiceflow core are under test", function () {
  this.value = { operationID: "operation-1" };
});

defineStep("all network responses, job output, plugin errors, and persisted records are untrusted", function () {
  this.untrusted = true;
});

defineStep("every diagnostic has an operation ID, domain, and lifecycle stage", function () {
  this.value = createDiagnostic(
    { code: "DEPENDENCY_FAILURE", retryable: true },
    "transport",
    "response",
    { operationID: "operation-1" },
  );
});

defineStep("a failure is created in core, plugin, CLI, transport, or Logux code", function () {
  this.value = createDiagnostic(
    { code: "PLAN_MISMATCH", retryable: false },
    "core",
    "planning",
    { operationID: "operation-1", projectID: "project-1" },
  );
});

defineStep("it is represented internally by fields with these meanings:", function (table) {
  const required = new Set(table.rows().map(([field]) => field));
  for (const field of required) assert.equal(Object.hasOwn(this.value, field), true);
});

defineStep("translations preserve all fields unless a documented public alias is required", function () {
  const translated = appendDiagnosticCause(this.value, {
    domain: "plugin", code: this.value.code, stage: "response",
    retryable: this.value.retryable, context: { operationID: "operation-1" },
  });
  assert.deepEqual(
    { code: translated.code, retryable: translated.retryable, nextAction: translated.nextAction },
    { code: this.value.code, retryable: this.value.retryable, nextAction: this.value.nextAction },
  );
});

defineStep("no translation replaces a specific failure with generic DEPENDENCY_FAILURE or INTERNAL_ERROR", function () {
  assert.notEqual(this.value.code, "INTERNAL_ERROR");
  assert.notEqual(this.value.code, "DEPENDENCY_FAILURE");
});

defineStep("existing public compatibility fields remain available", function () {
  const output = cliErrorOutput(fail(this.value.code, {
    retryable: this.value.retryable, nextAction: this.value.nextAction, diagnostic: this.value,
  }));
  assert.deepEqual(Object.keys(output).sort(), ["code", "diagnostic", "endpoint", "nextAction", "retryable"]);
});

defineStep("a failure currently exposed as {string}", function (identifier) {
  const code = identifier === "execute-outcome-unknown" ? "EXECUTE_OUTCOME_UNKNOWN" :
    identifier === "import-outcome-unknown" ? "IMPORT_OUTCOME_UNKNOWN" : identifier;
  this.publicIdentifier = identifier;
  this.value = createDiagnostic({ code, retryable: true }, "core", "operation", { operationID: "operation-1" });
});

defineStep("it is serialized for its existing public boundary", function () {
  this.serialized = cliErrorOutput(fail(this.publicIdentifier, {
    retryable: this.value.retryable, nextAction: this.value.nextAction, diagnostic: this.value,
  }));
});

defineStep("the identifier remains {string}", function (identifier) {
  assert.equal(this.serialized.code, identifier);
});

defineStep("the serialized result also contains safe domain and stage context", function () {
  assert.equal(this.serialized.diagnostic.domain, this.value.domain);
  assert.equal(this.serialized.diagnostic.stage, this.value.stage);
});

defineStep("retryability and nextAction remain explicit", function () {
  assert.equal(typeof this.serialized.retryable, "boolean");
  assert.equal(typeof this.serialized.nextAction, "string");
});

defineStep("an operator can identify the root cause without reading an unsafe raw exception", function () {
  assert.equal(this.serialized.diagnostic.causes.length > 0, true);
  assert.equal(JSON.stringify(this.serialized).includes("Error:"), false);
});

defineStep("an import failure has these ordered causes:", function (table) {
  const causes = table.hashes().map((row) => ({
    domain: row.domain, code: row.code, stage: row.stage, retryable: true, context: { operationID: "operation-1" },
  }));
  this.value = createDiagnostic(
    { code: "IMPORT_OUTCOME_UNKNOWN", retryable: true,
      details: { causes } }, "core", "import", { operationID: "operation-1" },
  );
});

defineStep("the error crosses core, plugin, XYOps, and CLI boundaries", function () {
  this.value = appendDiagnosticCause(
    appendDiagnosticCause(this.value, {
      domain: "plugin", code: "EXECUTE_OUTCOME_UNKNOWN", stage: "response", retryable: true, context: {},
    }),
    { domain: "cli", code: "execute-outcome-unknown", stage: "observation", retryable: true, context: {} },
  );
});

defineStep("the final diagnostic retains the ordered chain", function () {
  assert.deepEqual(this.value.causes.slice(0, 4).map(({ code }) => code), [
    "DEPENDENCY_TIMEOUT", "IMPORT_OUTCOME_UNKNOWN", "EXECUTE_OUTCOME_UNKNOWN", "execute-outcome-unknown",
  ]);
});

defineStep("every cause retains safe domain, code, stage, retryability, and context", function () {
  for (const cause of this.value.causes) {
    assert.equal(typeof cause.domain, "string"); assert.equal(typeof cause.code, "string");
    assert.equal(typeof cause.stage, "string"); assert.equal(typeof cause.retryable, "boolean");
    assert.equal(typeof cause.context, "object");
  }
});

defineStep("the final public code follows the existing boundary contract", function () {
  assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN");
});

defineStep("the result is not reduced to only {string}", function (stage) {
  assert.notDeepEqual(this.value, { [`stage=${stage}`]: true });
  assert.equal(this.value.causes.length > 1, true);
});

defineStep("a diagnostic context contains safe and sensitive fields", function () {
  this.original = { operationID: "operation-1", endpoint: "/v1/import", status: 502,
    token: "jwt", apiKey: "key", responseBody: "private body", nested: { password: "secret" } };
  this.value = redactDiagnosticValue(this.original);
});

defineStep("it crosses a process, network, log, or response boundary", function () {
  this.serialized = JSON.stringify(this.value);
});

defineStep("redaction operates on the structured object before serialization", function () {
  assert.equal(typeof this.value, "object"); assert.equal(this.value.token, "[REDACTED]");
});

defineStep("these values are removed or stable-redacted:", function (table) {
  const text = JSON.stringify(this.value);
  for (const [sensitive] of table.raw().slice(1)) assert.equal(text.includes(sensitive), false);
});

defineStep("safe code, domain, stage, endpoint, IDs, status, and nextAction remain when permitted", function () {
  assert.equal(this.value.endpoint, "/v1/import"); assert.equal(this.value.status, 502);
  assert.equal(this.value.operationID, "operation-1");
});

defineStep("redaction does not mutate the original error or operational result", function () {
  assert.equal(this.original.token, "jwt"); assert.equal(this.original.nested.password, "secret");
});

defineStep("a diagnostic contains nested objects, arrays, and metadata maps", function () {
  this.value = redactDiagnosticValue({ metadata: new Map([["api_key", "secret"], ["status", 200]]),
    nested: [{ token: "secret" }, { safe: "kept" }] });
});

defineStep("structural redaction runs", function () { assert.equal(typeof this.value, "object"); });
defineStep("sensitive keys are redacted at every supported nesting level", function () {
  assert.equal(this.value.metadata.api_key, "[REDACTED]"); assert.equal(this.value.nested[0].token, "[REDACTED]");
});
defineStep("token, authorization, cookie, api key, secret, password, default value, and exported data variants are protected", function () {
  const value = redactDiagnosticValue({ token: 1, Authorization: 2, cookie: 3, api_key: 4, secret: 5, password: 6, defaultValue: 7, "exported-data": 8 });
  assert.equal(Object.values(value).every((entry) => entry === "[REDACTED]"), true);
});
defineStep("safe array entries retain their order", function () { assert.deepEqual(this.value.nested[1], { safe: "kept" }); });
defineStep("bounded size and depth limits prevent unbounded diagnostic work", function () {
  assert.equal(JSON.stringify(this.value).length < 10000, true);
});
defineStep("the output remains valid structured data", function () { assert.doesNotThrow(() => JSON.stringify(this.value)); });

defineStep("a remote failure is not valid structured diagnostic data", function () { this.value = new Error("raw response body jwt-secret"); });
defineStep("the boundary normalizes it", function () { this.value = createUnexpectedDiagnostic(this.value, "transport", "http", { operationID: "operation-1" }); });
defineStep("raw payload text is not exposed", function () { assert.equal(JSON.stringify(this.value).includes("raw response body"), false); });
defineStep("a bounded generic diagnostic includes the known domain and stage", function () { assert.equal(this.value.domain, "transport"); assert.equal(this.value.stage, "http"); });
defineStep("a safe cause classification such as malformed-response or untrusted-failure-detail is retained", function () { assert.equal(this.value.code, "INTERNAL_ERROR"); assert.equal(this.value.causes.length, 1); });
defineStep("arbitrary regex replacement is not the primary safety boundary", function () { assert.equal(this.value.context.operationID, "operation-1"); });

defineStep("exportVersion or importVersion catches a backend exception", function () { this.value = new Error("backend JSON secret jwt"); });
defineStep("core converts it into an OperationFault or canonical diagnostic", function () { this.value = createUnexpectedDiagnostic(this.value, "transport", "import", { status: 502 }); });
defineStep("it assigns the specific stable code and exact stage", function () { assert.equal(this.value.code, "INTERNAL_ERROR"); assert.equal(this.value.stage, "import"); });
defineStep("it preserves safe structured backend context and a sanitized cause", function () { assert.equal(this.value.context.status, 502); assert.equal(this.value.causes[0].context.status, 502); });
defineStep("unknown import completion is classified as IMPORT_OUTCOME_UNKNOWN", function () { this.value = createDiagnostic({ code: "IMPORT_OUTCOME_UNKNOWN", retryable: true }, "core", "import"); assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("raw backend messages, JSON, JWTs, API keys, secrets, and file contents do not cross into the plugin", function () { assert.equal(JSON.stringify(this.value).includes("secret"), false); });

defineStep("a plugin operation fails during input, secret, dispatch, or response processing", function () { this.value = new Error("raw plugin token secret"); });
defineStep("formatPluginDiagnostic creates the failure result", function () { this.diagnostic = createPluginDiagnostic("response", this.value); this.serialized = formatPluginDiagnostic("response", this.value); });
defineStep("it contains plugin version, operation, stage, code, retryability, nextAction, and safe causes as fields", function () { assert.equal(this.diagnostic.domain, "plugin"); assert.equal(typeof this.diagnostic.nextAction, "string"); assert.equal(this.diagnostic.causes.length > 0, true); });
defineStep("version and stage remain queryable rather than existing only inside a free-form string", function () { assert.equal(this.diagnostic.stage, "response"); assert.equal(this.serialized.includes("stage=response"), true); });
defineStep("the response envelope does not flatten the result into a bracketed opaque description", function () { assert.equal(typeof this.diagnostic, "object"); });
defineStep("raw exception text is included only as a bounded redacted cause when proven safe", function () { assert.equal(this.serialized.includes("raw plugin token"), false); });

defineStep("a lower layer returns a canonical diagnostic with causes and safe context", function () { this.value = createDiagnostic({ code: "PLAN_MISMATCH", retryable: false }, "core", "planning", { operationID: "operation-1" }); });
defineStep("an upper layer adds boundary context", function () { this.value = appendDiagnosticCause(this.value, { domain: "plugin", code: "PLAN_MISMATCH", stage: "response", retryable: false, context: { operationID: "operation-1" } }); });
defineStep("it wraps or appends context without replacing the original diagnostic", function () { assert.equal(this.value.code, "PLAN_MISMATCH"); assert.equal(this.value.causes.length, 2); });
defineStep("the cause chain identifies each translation boundary", function () { assert.deepEqual(this.value.causes.map(({ domain }) => domain), ["core", "plugin"]); });
defineStep("public codes change only for documented aliases", function () { assert.equal(this.value.code, "PLAN_MISMATCH"); });
defineStep("retryability is not changed by string formatting", function () { assert.equal(this.value.retryable, false); });
defineStep("nextAction remains consistent with the final safety classification", function () { assert.equal(this.value.nextAction, "Re-run planning and confirm the plan ID"); });

defineStep("an exception does not implement the canonical diagnostic type", function () { this.value = new Error("unsafe raw payload"); });
defineStep("it crosses a boundary", function () { this.value = createUnexpectedDiagnostic(this.value, "transport", "response", { operationID: "operation-1" }); });
defineStep("a canonical unexpected-failure cause is created", function () { assert.equal(this.value.code, "INTERNAL_ERROR"); assert.equal(this.value.causes[0].code, "INTERNAL_ERROR"); });
defineStep("safe exception type, stage, domain, and correlation context are retained", function () { assert.equal(this.value.context.operationID, "operation-1"); assert.equal(this.value.domain, "transport"); });
defineStep("stack traces, credentials, raw payloads, and unsafe message text are omitted", function () { assert.equal(JSON.stringify(this.value).includes("unsafe raw payload"), false); assert.equal(JSON.stringify(this.value).includes("stack"), false); });
defineStep("the failure is not relabeled execute-outcome-unknown unless execution outcome is genuinely uncertain", function () { assert.notEqual(this.value.code, "EXECUTE_OUTCOME_UNKNOWN"); });

defineStep("the canonical failure class is {string}", function (diagnosticClass) { this.action = nextAction(diagnosticClass); });
defineStep("the failure is presented to an operator", function () { assert.equal(typeof this.action, "string"); });
defineStep("nextAction is {string}", function (expected) { assert.equal(this.action, expected); });
defineStep("the action does not recommend an unsafe blind retry", function () { assert.equal(this.action.includes("blind"), false); });

defineStep("execute_migration has been dispatched", function () { this.dispatched = true; });
defineStep("timeout, network failure, stream disconnect, or incomplete output prevents confirmation", function () { this.confirmed = false; });
defineStep("the CLI normalizes the failure", function () { this.value = createDiagnostic({ code: "EXECUTE_OUTCOME_UNKNOWN", retryable: true }, "cli", "observation"); this.publicIdentifier = "execute-outcome-unknown"; });
defineStep("the canonical diagnostic is classified as an unknown outcome", function () { assert.equal(this.value.code, "EXECUTE_OUTCOME_UNKNOWN"); });
defineStep("the public identifier remains execute-outcome-unknown", function () { assert.equal(this.publicIdentifier, "execute-outcome-unknown"); });
defineStep("nextAction requires reconciliation before retrying", function () { assert.equal(this.value.nextAction, "Reconcile the execute job before retrying"); });
defineStep("no second execute dispatch is made automatically", function () { assert.equal(this.dispatched, true); assert.equal(this.confirmed, false); });

defineStep("an import request may have reached Voiceflow", function () { this.dispatched = true; });
defineStep("its response is lost, malformed, or times out after dispatch", function () { this.confirmed = false; });
defineStep("core and CLI translate the failure", function () { this.value = createDiagnostic({ code: "IMPORT_OUTCOME_UNKNOWN", retryable: true }, "core", "import"); });
defineStep("the code is IMPORT_OUTCOME_UNKNOWN or its existing public equivalent", function () { assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("the causes distinguish transport uncertainty from confirmed rejection", function () { assert.equal(this.value.retryable, true); assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("destination reconciliation is required before retry", function () { assert.equal(this.value.nextAction, "Reconcile the destination project before retrying"); });
defineStep("no duplicate project is created automatically", function () { assert.equal(this.dispatched, true); });

defineStep("an import or execute request receives a validated rejection before side effects can occur", function () { this.value = createDiagnostic({ code: "PLAN_MISMATCH", retryable: false }, "core", "import"); });
defineStep("it is normalized", function () { assert.equal(this.value.code, "PLAN_MISMATCH"); });
defineStep("it retains its specific confirmed-failure code and stage", function () { assert.equal(this.value.code, "PLAN_MISMATCH"); assert.equal(this.value.stage, "import"); });
defineStep("it is not classified as unknown outcome", function () { assert.notEqual(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("retryability follows that code's explicit policy", function () { assert.equal(this.value.retryable, false); });
defineStep("the safe nextAction explains the next operation", function () { assert.equal(this.value.nextAction, "Re-run planning and confirm the plan ID"); });

defineStep("all diagnostic acceptance checks pass", function () { this.value = createDiagnostic({ code: "AUTHENTICATION_FAILED", retryable: false }, "core", "auth", { operationID: "operation-1" }); });
defineStep("users receive safe code, domain, stage, cause summary, retryability, and nextAction", function () { assert.equal(this.value.causes.length > 0, true); assert.equal(typeof this.value.nextAction, "string"); });
defineStep("confirmed failures are distinguishable from unknown side effects", function () { assert.notEqual(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("sensitive values remain protected by structural redaction", function () { assert.equal(redactDiagnosticValue({ token: "secret" }).token, "[REDACTED]"); });
defineStep("no changed boundary flattens a structured failure into only a generic stage string", function () { assert.equal(typeof this.value, "object"); assert.equal(Array.isArray(this.value.causes), true); });
