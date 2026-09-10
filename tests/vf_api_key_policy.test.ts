import { describe, expect, test } from "bun:test";

import type { AuthContext } from "../xyops/voiceflow/auth";
import {
  retrieveApiKeyStatus,
  type ApiKeyStatus,
} from "../xyops/voiceflow/api_key";

const auth: AuthContext = {
  creatorID: "creator",
  token: "header.payload.signature",
};

const successfulStatus = {
  apiKeyRetrieved: true,
} satisfies ApiKeyStatus;

const failedStatus = {
  apiKeyRetrieved: false,
  postImport: {
    apiKeyRetrieved: false,
    diagnostic: {
      code: "API_KEY_RETRIEVAL_FAILED",
      message: "Project API key could not be retrieved.",
    },
  },
} satisfies ApiKeyStatus;

type FetchObservation = {
  readonly url: string;
  readonly method: string;
  readonly authorization: string | null;
};

type ApiKeyCall = {
  readonly status: ApiKeyStatus;
  readonly requests: readonly FetchObservation[];
};

function requestURL(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return requestObjectURL(input);
}

function requestObjectURL(input: Request | URL): string {
  if (input instanceof URL) return input.href;
  return input.url;
}

async function retrieveWithControlledFetch(
  body: string,
  projectID = " 0123456789abcde0 ",
): Promise<ApiKeyCall> {
  const previousFetch = globalThis.fetch;
  const requests: FetchObservation[] = [];
  globalThis.fetch = controlledFetch(body, requests) as typeof fetch;

  try {
    const status = await retrieveApiKeyStatus(auth, projectID);
    return { status, requests };
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function controlledFetch(body: string, requests: FetchObservation[]) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    rejectRepeatedRequest(requests);
    requests.push(fetchObservation(input, init));
    return new Response(body, { status: 200 });
  };
}

function rejectRepeatedRequest(requests: readonly FetchObservation[]): void {
  if (requests.length > 0) throw new Error("Unexpected repeated API-key request");
}

function fetchObservation(input: RequestInfo | URL, init?: RequestInit): FetchObservation {
  return { url: requestURL(input), method: requestMethod(init), authorization: requestAuthorization(init) };
}

function requestMethod(init?: RequestInit): string {
  if (init === undefined) return "GET";
  return requestMethodValue(init.method);
}

function requestMethodValue(method: string | undefined): string {
  return method === undefined ? "GET" : method;
}

function requestAuthorization(init?: RequestInit): string | null {
  return new Headers(init?.headers).get("Authorization");
}

function expectSanitizedStatus(
  status: ApiKeyStatus,
  keys: readonly string[],
): void {
  const publicStatus = JSON.stringify(status);
  for (const key of keys) expect(publicStatus).not.toContain(key);
  expect(publicStatus).not.toContain("VF.DM.");
}

describe("Voiceflow API-key policy", () => {
  test("normalizes key and project-ID whitespace without leaking the key", async () => {
    const key = "VF.DM.whitespace-secret";
    const previousFetch = globalThis.fetch;

    const { status, requests } = await retrieveWithControlledFetch(
      ` \n\t${key}  \r\n`,
    );

    expect(status).toEqual(successfulStatus);
    expect(requests).toEqual([
      {
        url: "https://identity-api.empyrean.voiceflow.com/v1alpha1/api-key/legacy/project/0123456789abcde0",
        method: "GET",
        authorization: `Bearer ${auth.token}`,
      },
    ]);
    expectSanitizedStatus(status, [key]);
    expect(globalThis.fetch).toBe(previousFetch);
  });

  test("rejects a key with an invalid prefix and returns a sanitized status", async () => {
    const key = "VF.XM.invalid-prefix-secret";

    const { status } = await retrieveWithControlledFetch(key);

    expect(status).toEqual(failedStatus);
    expectSanitizedStatus(status, [key]);
  });

  test("accepts duplicate aliases containing the same normalized key", async () => {
    const key = "VF.DM.duplicate-secret";
    const body = JSON.stringify({
      apiKey: ` ${key} `,
      api_key: key,
      key: `\n${key}\t`,
      token: key,
    });

    const { status } = await retrieveWithControlledFetch(body);

    expect(status).toEqual(successfulStatus);
    expectSanitizedStatus(status, [key]);
  });

  test("uses the first valid key from the returned list", async () => {
    const firstKey = "VF.DM.first-secret";
    const secondKey = "VF.DM.second-secret";
    const body = JSON.stringify([firstKey, secondKey]);

    const { status } = await retrieveWithControlledFetch(body);

    expect(status).toEqual(successfulStatus);
    expectSanitizedStatus(status, [firstKey, secondKey]);
  });
});
