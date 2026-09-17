import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const { redactDiagnosticValue } = await import("../../xyops/diagnostics/redact.ts");
const { nextAction } = await import("../../xyops/diagnostics/next_action.ts");
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
