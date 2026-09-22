import { afterEach, describe, expect, test } from "bun:test";

import { main } from "../xyops/voiceflow/check_session";

const TOKEN = "aaa.eyJzdWIiOiJjcmVhdG9yIn0.zzz";
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("check_session operation boundary", () => {
  test("returns an active session for a successful identity response", async () => {
    let request: Request | undefined;
    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    await expect(main(TOKEN)).resolves.toMatchObject({
      ok: true,
      operation: "check_session",
      result: { active: true },
    });
    expect(request?.url).toBe("https://identity-api.empyrean.voiceflow.com/v1alpha1/user");
    expect(request?.headers.get("authorization")).toBe("Bearer aaa.eyJzdWIiOiJjcmVhdG9yIn0.zzz");
  });

  test("maps authentication responses to a login-required result", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 401 })) as typeof fetch;

    await expect(main(TOKEN)).resolves.toMatchObject({
      ok: true,
      operation: "check_session",
      result: {
        active: false,
        loginRequired: true,
        loginUrl: "https://creator.empyrean.voiceflow.com/",
      },
    });
  });

  test("returns authentication failure without calling the identity service", async () => {
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    await expect(main("not-a-jwt")).resolves.toMatchObject({
      ok: false,
      operation: "check_session",
      error: { code: "AUTHENTICATION_FAILED", retryable: false },
    });
    expect(fetchCalls).toBe(0);
  });
});
