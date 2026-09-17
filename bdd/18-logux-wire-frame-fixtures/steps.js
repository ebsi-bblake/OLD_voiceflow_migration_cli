import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defineStep, setWorldConstructor } from "@cucumber/cucumber";

const contract = await import("../../xyops/voiceflow/logux/frame-contract.ts");

class WireFrameWorld {
  frame = undefined;
  parsed = undefined;
  rawMessage = undefined;
}

setWorldConstructor(WireFrameWorld);

const parseFixture = (value) => {
  const source = value.trim();
  const decoded = source.startsWith('"') ? JSON.parse(source) : source;
  const text = typeof decoded === "string" ? decoded : JSON.stringify(decoded);
  return contract.parseLoguxFrame(text);
};

const action = (world) => world.frame?.[2];

defineStep("the {string} wire-frame fixture", async function (fixtureName) {
  const fixtureURL = new URL(`./fixtures/${fixtureName}.json`, import.meta.url);
  this.rawMessage = await readFile(fixtureURL, "utf8");
});

defineStep("the malformed Logux message {string}", function (message) {
  this.rawMessage = message;
});

defineStep(/^the frame is parsed$/, function () {
  this.frame = parseFixture(this.rawMessage);
  this.parsed = true;
});

defineStep(/^parsing succeeds$/, function () {
  assert.equal(this.parsed, true);
  assert.ok(this.frame);
});

defineStep(/^parsing fails$/, function () {
  assert.equal(this.parsed, true);
  assert.equal(this.frame, undefined);
});

defineStep("the frame kind is {string}", function (expected) {
  assert.equal(this.frame?.[0], expected);
});

defineStep("the frame sync ID is {int}", function (expected) {
  assert.equal(this.frame?.[1], expected);
});

defineStep("the frame protocol version is {int}", function (expected) {
  assert.equal(this.frame?.[1], expected);
});

defineStep("the action channel is {string}", function (expected) {
  assert.equal(action(this)?.channel, expected);
});

defineStep("the action has no since field", function () {
  assert.equal(action(this)?.since, undefined);
});

defineStep("the action type is {string}", function (expected) {
  assert.equal(action(this)?.type, expected);
});

defineStep("the action ID is {string}", function (expected) {
  assert.equal(action(this)?.meta?.actionID, expected);
});

defineStep("the catalog values are an array", function () {
  assert.equal(Array.isArray(action(this)?.payload?.values), true);
});

defineStep("the catalog values are not an array", function () {
  assert.equal(Array.isArray(action(this)?.payload?.values), false);
});

defineStep("the error code is {string}", function (expected) {
  assert.equal(this.frame?.[1], expected);
});

defineStep("the frame is not a domain action", function () {
  assert.notEqual(this.frame?.[0], "sync");
});

defineStep("the secret failure matches action ID {string}", function (actionID) {
  assert.equal(contract.isSecretFailure(this.frame, actionID), true);
});

defineStep("the secret failure does not match action ID {string}", function (actionID) {
  assert.equal(contract.isSecretFailure(this.frame, actionID), false);
});

defineStep("the normalized failure is exactly dependency-failed", function () {
  assert.deepEqual(contract.summarizeSecretFailureFrame(this.frame), {
    failureCause: { kind: "dependency-failure", code: "dependency-failed" },
  });
});

defineStep("the normalized failure contains no raw payload", function () {
  const summary = contract.summarizeSecretFailureFrame(this.frame);
  assert.deepEqual(Object.keys(summary), ["failureCause"]);
  assert.equal(JSON.stringify(summary).includes("sensitive-token"), false);
});

defineStep(
  "secret completion matches action ID {string} and assistant ID {string}",
  function (actionID, assistantID) {
    assert.equal(contract.isSecretCompletion(this.frame, actionID, assistantID), true);
  },
);

defineStep("secret completion rejects action ID {string}", function (actionID) {
  assert.equal(contract.isSecretCompletion(this.frame, actionID, "assistant-id"), false);
});
