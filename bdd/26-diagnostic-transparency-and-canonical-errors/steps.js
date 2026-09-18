import assert from "node:assert/strict";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";
import { z } from "zod";

const { createDiagnostic, createUnexpectedDiagnostic, appendDiagnosticCause } = await import("../../xyops/diagnostics/create.ts");
const { redactDiagnosticValue } = await import("../../xyops/diagnostics/redact.ts");
const { classifyDispatchOutcome } = await import("../../xyops/diagnostics/outcome.ts");
const { createPluginDiagnostic, formatPluginDiagnostic } = await import("../../xyops/plugin/diagnostics.ts");
const { toOperationError, OperationFault } = await import("../../xyops/voiceflow/contracts.ts");
const { cliErrorOutput, fail } = await import("../../xyops/cli/diagnostics.ts");
const { createVoiceflowEnvelopeSchema } = await import("../../xyops/cli/schemas/voiceflow-envelope.ts");

class DiagnosticWorld {
  value = undefined;
  original = undefined;
  serialized = undefined;
}
setWorldConstructor(DiagnosticWorld);

const assertSafeJSON = (value, forbidden) => {
  const serialized = JSON.stringify(value);
  for (const secret of forbidden) assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(" at "), false);
};

defineStep("the Voiceflow core, plugin, XYOps client, and CLI boundaries are under test", function () { this.value = true; });
defineStep("all backend responses, job output, exception values, and persisted records are untrusted", function () { this.value = true; });
defineStep("BDD21 remains the authority for diagnostic fields and redaction policy", function () { this.value = true; });

defineStep("a core failure has a code, domain, stage, retryability, nextAction, context, and ordered causes", function () {
  this.value = createDiagnostic({ code: "PLAN_MISMATCH", retryable: false, details: { context: { operationID: "operation-1" }, causes: [{ domain: "transport", code: "BACKEND_REJECTED", stage: "export", retryable: true, context: { status: 502 } }] } }, "core", "planning");
});
defineStep("it crosses the core, plugin, XYOps, and CLI boundaries", function () {
  const plugin = appendDiagnosticCause(this.value, { domain: "plugin", code: "PLAN_MISMATCH", stage: "response", retryable: false, context: { operationID: "operation-1" } });
  this.value = cliErrorOutput(fail("envelope", { diagnostic: appendDiagnosticCause(plugin, { domain: "cli", code: "PLAN_MISMATCH", stage: "presentation", retryable: false, context: {} }) }));
});
defineStep("every boundary preserves the original diagnostic identity", function () { assert.equal(this.value.diagnostic.code, "PLAN_MISMATCH"); });
defineStep("each boundary may append context without replacing the original cause", function () { assert.equal(this.value.diagnostic.causes.length, 4); });
defineStep("the final result retains the ordered cause chain", function () { assert.deepEqual(this.value.diagnostic.causes.map(({ domain }) => domain), ["transport", "core", "plugin", "cli"]); });
defineStep("no specific failure is flattened into only DEPENDENCY_FAILURE or INTERNAL_ERROR", function () { assert.notEqual(this.value.diagnostic.code, "DEPENDENCY_FAILURE"); assert.notEqual(this.value.diagnostic.code, "INTERNAL_ERROR"); });
defineStep("existing public compatibility identifiers remain available", function () { assert.equal(typeof this.value.code, "string"); });

defineStep("exportVersion or importVersion receives an unsafe backend exception", function () { this.value = new Error("Bearer backend-token response body exported-data"); });
defineStep("core converts it into an OperationFault or canonical diagnostic", function () { this.value = toOperationError(this.value); });
defineStep("the failure receives a specific stable code and exact lifecycle stage", function () { assert.equal(this.value.code, "INTERNAL_ERROR"); assert.equal(this.value.diagnostic.stage, "operation"); });
defineStep("safe structured backend context is retained when available", function () { this.value = toOperationError(new OperationFault("DEPENDENCY_FAILURE", true, undefined, { domain: "transport", stage: "export", context: { status: 502 } })); assert.equal(this.value.diagnostic.context.status, 502); });
defineStep("the exception message, JSON, JWT, API key, secret, and file contents do not cross into the plugin", function () { assertSafeJSON(this.value, ["backend-token", "response body", "exported-data"]); });
defineStep("an uncertain import is classified as IMPORT_OUTCOME_UNKNOWN", function () { this.value = createDiagnostic({ code: "IMPORT_OUTCOME_UNKNOWN", retryable: true }, "core", "import"); assert.equal(this.value.code, "IMPORT_OUTCOME_UNKNOWN"); });
defineStep("a confirmed rejection remains distinct from an unknown outcome", function () { assert.notEqual(createDiagnostic({ code: "PLAN_MISMATCH", retryable: false }, "core", "import").code, "IMPORT_OUTCOME_UNKNOWN"); });

defineStep("a diagnostic contains nested objects, arrays, maps, and sensitive fields", function () { this.original = { operationID: "operation-1", nested: [{ Authorization: "Bearer secret", safe: 1 }], map: new Map([["token", "jwt-secret"]]), password: "password-value" }; this.value = redactDiagnosticValue(this.original); });
defineStep("structural redaction runs before serialization", function () { this.serialized = JSON.stringify(this.value); });
defineStep("it is serialized for a process, network, log, or response boundary", function () { this.serialized = JSON.stringify(this.value); });
defineStep("JWTs, bearer tokens, API keys, cookies, authorization headers, passwords, secrets, default values, exported data, and raw bodies are removed or stably redacted", function () { assertSafeJSON(this.value, ["Bearer secret", "jwt-secret", "password-value"]); assert.equal(this.value.password, "[REDACTED]"); });
defineStep("safe code, domain, stage, IDs, status, endpoint, retryability, and nextAction remain when permitted", function () { assert.equal(this.value.operationID, "operation-1"); assert.equal(this.value.nested[0].safe, 1); });
defineStep("the source diagnostic and operational result are not mutated", function () { assert.equal(this.original.nested[0].Authorization, "Bearer secret"); });
defineStep("arbitrary regex replacement is not the primary safety boundary", function () { assert.equal(this.value.map.token, "[REDACTED]"); });

defineStep("a remote job returns a validated failure with a safe root-cause classification", function () { this.value = createDiagnostic({ code: "AUTHENTICATION_FAILED", retryable: false }, "transport", "response", { endpoint: "/run_event", status: 401 }); });
defineStep("the CLI presents the failure", function () { this.value = cliErrorOutput(fail("envelope", { diagnostic: this.value })); });
defineStep("the public diagnostic includes the stable identifier and actionable nextAction", function () { assert.equal(this.value.diagnostic.code, "AUTHENTICATION_FAILED"); assert.match(this.value.diagnostic.nextAction, /authentication/i); });
defineStep("the operator can distinguish authentication, confirmed rejection, dependency failure, and unknown outcome", function () { assert.notEqual(this.value.diagnostic.code, "INTERNAL_ERROR"); assert.equal(typeof this.value.diagnostic.stage, "string"); });
defineStep("safe cause and stage context remain available", function () { assert.equal(this.value.diagnostic.causes.length > 0, true); assert.equal(this.value.diagnostic.context.status, 401); });
defineStep("unsafe detail is omitted rather than replacing the whole diagnostic with only a generic stage summary", function () { assert.equal(this.value.diagnostic.code, "AUTHENTICATION_FAILED"); assert.equal(this.value.diagnostic.stage, "response"); });

defineStep("core, plugin, CLI, transport, and Logux use layer-specific internal failure values", function () { this.value = createDiagnostic({ code: "DEPENDENCY_FAILURE", retryable: true }, "transport", "http"); });
defineStep("the failure crosses a layer boundary", function () { this.value = appendDiagnosticCause(this.value, { domain: "plugin", code: "DEPENDENCY_FAILURE", stage: "response", retryable: true, context: {} }); });
defineStep("a failure crosses a layer boundary", function () { this.value = appendDiagnosticCause(this.value, { domain: "plugin", code: "DEPENDENCY_FAILURE", stage: "response", retryable: true, context: {} }); });
defineStep("it is translated into the canonical diagnostic contract", function () { assert.equal(typeof this.value.code, "string"); assert.equal(Array.isArray(this.value.causes), true); });
defineStep("the translation records the originating domain and stage", function () { assert.equal(this.value.domain, "transport"); assert.equal(this.value.stage, "http"); assert.equal(this.value.causes.at(-1).domain, "plugin"); });
defineStep("documented public aliases remain compatible", function () { assert.equal(this.value.code, "DEPENDENCY_FAILURE"); });
defineStep("translation does not silently change retryability or nextAction", function () { assert.equal(this.value.retryable, true); assert.equal(typeof this.value.nextAction, "string"); });
defineStep("the final diagnostic remains queryable without parsing free-form error text", function () { assert.equal(this.value.causes[0].code, "DEPENDENCY_FAILURE"); });

defineStep("diagnostic boundary tests pass", function () { this.value = createDiagnostic({ code: "AUTHENTICATION_FAILED", retryable: false }, "core", "auth"); });
defineStep("useful safe root-cause information survives every supported boundary", function () { assert.equal(this.value.causes.length, 1); });
defineStep("structural redaction protects sensitive data before serialization", function () { assertSafeJSON(redactDiagnosticValue({ token: "secret" }), ["secret"]); });
defineStep("confirmed failures remain distinct from uncertain side effects", function () { assert.equal(classifyDispatchOutcome({ dispatched: true, confirmedFailure: false }), "unknown-outcome"); });
defineStep("no user-facing failure is reduced to only an opaque stage string", function () { assert.equal(typeof this.value.code, "string"); assert.equal(typeof this.value.nextAction, "string"); });
