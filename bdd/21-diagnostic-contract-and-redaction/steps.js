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
const { createPluginDiagnostic } = await import("../../xyops/plugin/diagnostics.ts");
const { ok, error } = await import("../../xyops/diagnostics/result.ts");

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
