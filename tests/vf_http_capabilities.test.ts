import { expect, test } from "bun:test";

import { requestBytes } from "../xyops/voiceflow/http";

const request = {
  url: "https://example.test/session",
  maxBytes: 1024,
  timeoutMs: 1000,
} as const;

const originalFetch = globalThis.fetch;
const originalAbortController = globalThis.AbortController;
const originalDOMException = globalThis.DOMException;

const restoreGlobals = (): void => {
  globalThis.fetch = originalFetch;
  globalThis.AbortController = originalAbortController;
  globalThis.DOMException = originalDOMException;
};

test("translates missing HTTP capabilities to dependency failure", async () => {
  globalThis.fetch = undefined as typeof fetch;
  try {
    await expect(requestBytes(request)).rejects.toMatchObject({
      code: "DEPENDENCY_FAILURE",
      retryable: true,
    });
  } finally {
    restoreGlobals();
  }
});

test("translates a missing abort controller to dependency failure", async () => {
  globalThis.AbortController = undefined as typeof AbortController;
  try {
    await expect(requestBytes(request)).rejects.toMatchObject({
      code: "DEPENDENCY_FAILURE",
      retryable: true,
    });
  } finally {
    restoreGlobals();
  }
});

test("classifies aborts safely when DOMException is unavailable", async () => {
  globalThis.DOMException = undefined as typeof DOMException;
  globalThis.fetch = (async () => {
    throw { name: "AbortError" };
  }) as typeof fetch;
  try {
    await expect(requestBytes(request)).rejects.toMatchObject({
      code: "DEPENDENCY_TIMEOUT",
      retryable: true,
    });
  } finally {
    restoreGlobals();
  }
});

test("translates rejected bounded body reads to dependency failure", async () => {
  globalThis.fetch = (async () => new Response(new ReadableStream({
    start(controller) {
      controller.error(new Error("body read failed"));
    },
  }))) as typeof fetch;
  try {
    await expect(requestBytes(request)).rejects.toMatchObject({
      code: "DEPENDENCY_FAILURE",
      retryable: true,
    });
  } finally {
    restoreGlobals();
  }
});
