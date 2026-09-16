import { describe, expect, test } from "bun:test";
import { createXYOpsClient } from "../xyops/cli/client";
import { DEFAULT_XYOPS_BASE_URL, readXYOpsConfig } from "../xyops/cli/config";
import {
  isCheckSessionResult,
  isOptionResult,
  isVoiceflowEnvelope,
  isEventParameterEntry,
} from "../xyops/cli/guards";
import { run } from "../xyops/cli/index";
import {
  executeParameters,
  listFoldersParameters,
  listProjectsParameters,
  listVersionsParameters,
  listWorkspacesParameters,
  planParameters,
} from "../xyops/cli/state";

const config = {
  baseURL: "https://xyops.example.test",
  apiKey: "api-key-must-not-leak",
  events: {
    checkSession: "event-check",
    listWorkspaces: "event-workspaces",
    listProjects: "event-projects",
    listVersions: "event-versions",
    listFolders: "event-folders",
    planMigration: "event-plan",
    executeMigration: "event-execute",
  },
  httpTimeoutMs: 1_000,
  pollIntervalMs: 1,
  pollTimeoutMs: 1_000,
} as const;

const selection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "destination-folder",
  targetSchemaVersion: "13.1",
} as const;

const nativePluginOutput = (envelope: unknown): string =>
  JSON.stringify({
    xy: 1,
    complete: true,
    code: 0,
    data: { voiceflow: envelope },
  });

const requestBody = (init: RequestInit | undefined): string => String(init?.body);
const requestHeaders = (init: RequestInit | undefined): Headers => new Headers(init?.headers);
const requestURL = (input: RequestInfo | URL): string => String(input);
const firstRequest = <T>(requests: readonly T[]): T | undefined => requests[0];
const requiredRequest = <T>(requests: readonly T[]): T => { const request = firstRequest(requests); if (request === undefined) throw new Error("Expected request"); return request; };
const readOnlyResponse = (): Response => new Response(JSON.stringify({ code: 0, job: { id: "job-1", code: 0, completed: 1787683968.928, output: `${JSON.stringify({ ok: true, operation: "list_projects", operationID: "operation-1", result: { options: [{ value: "project-1", label: "Project 1" }] }, warnings: [] })}\n`, data: null } }), { status: 200, headers: { "content-type": "application/json" } });

const recordingReadFetcher = (requests: Array<{ url: string; body: string; headers: Headers }>) => (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => { requests.push({ url: requestURL(input), body: requestBody(init), headers: requestHeaders(init) }); return Promise.resolve(readOnlyResponse()); };
const optionEnvelopeResponse = (): Response => new Response(JSON.stringify({ code: 0, job: { id: "job-1", code: 0, completed: true, data: { ok: true, operation: "check_session", operationID: "operation-1", result: { options: [{ value: "workspace-1", label: "Workspace 1" }] }, warnings: [] } } }), { status: 200 });
const firstBodyJSON = (requests: readonly string[]): Record<string, unknown> => JSON.parse(firstRequest(requests) ?? "{}");
const restoreEnvironmentValue = (name: string, value: string | undefined): void => { if (value === undefined) delete process.env[name]; else process.env[name] = value; };
const restoreEnvironment = (names: readonly string[], previous: Readonly<Record<string, string | undefined>>): void => names.forEach((name) => restoreEnvironmentValue(name, previous[name]));
const inactiveSessionResponse = (): Response => new Response(JSON.stringify({ code: 0, job: { id: "job-1", code: 0, data: { ok: true, operation: "check_session", operationID: "operation-1", result: { active: false }, warnings: [] } } }), { status: 200 });
const topLevelLaunchResponse = (): Response => new Response(JSON.stringify({ code: 0, id: "official-job-id" }), { status: 200 });
const topLevelPollResponse = (pollCount: number): Response => new Response(JSON.stringify({ code: 0, job: pollCount === 1 ? { id: "official-job-id", code: 0, completed: null, output: "", data: null } : { id: "official-job-id", completed: 1787683968.928, code: 0, output: `${JSON.stringify({ ok: true, operation: "execute_migration", operationID: "operation-3", result: {}, warnings: [] })}\n`, data: null } }), { status: 200 });
const topLevelResponse = (path: string, pollCount: number): Response => path === "/api/app/run_event/v1" ? topLevelLaunchResponse() : topLevelPollResponse(pollCount);
const nextPollCount = (path: string, pollCount: number): number => path === "/api/app/run_event/v1" ? pollCount : pollCount + 1;
const isFirstPoll = (pollCount: number): boolean => pollCount === 1;

describe("XYOps CLI adapter", () => {
  test("guards secret event parameters as ordered name/value arrays", () => {
    expect(isEventParameterEntry(["SECRET_FILE_CONTENTS", [
      { key: "TOKEN", value: "value", type: "" },
    ]])).toBe(true);
    expect(isEventParameterEntry(["SECRET_FILE_CONTENTS", { TOKEN: "value" }])).toBe(false);
    expect(isEventParameterEntry(["SECRET_FILE_CONTENTS", [
      { key: "TOKEN", value: "value", type: "", extra: true },
    ]])).toBe(false);
  });

  test("sends a title-based event request without a JWT and unwraps a read-only envelope", async () => {
    const requests: Array<{ url: string; body: string; headers: Headers }> = [];
    const client = createXYOpsClient(config, {
      fetcher: recordingReadFetcher(requests),
    });

    const result = await client.readEvent(
      "event-projects",
      { operation: "list_projects", SOURCE_WORKSPACE_ID: "workspace-1" },
      isVoiceflowEnvelope(isOptionResult),
    );

    const request = requiredRequest(requests);
    expect(result.ok).toBe(true);
    expect(request.url).toBe("https://xyops.example.test/api/app/run_event/v1/wait");
    expect(request.headers.get("X-API-Key")).toBe("api-key-must-not-leak");
    expect(JSON.parse(request.body)).toEqual({
      title: "event-projects",
      params: { operation: "list_projects", SOURCE_WORKSPACE_ID: "workspace-1" },
    });
    expect(request.body).not.toContain("VOICEFLOW_JWT");
    expect(request.body).not.toContain("api-key-must-not-leak");
  });

  test("unwraps a native plugin response from a synchronous wait job", async () => {
    const envelope = {
      ok: true,
      operation: "list_projects",
      operationID: "operation-native-read",
      result: { options: [{ value: "project-1", label: "Project 1" }] },
      warnings: [],
    };
    const client = createXYOpsClient(config, {
      fetcher: async () =>
        new Response(
          JSON.stringify({
            code: 0,
            job: {
              id: "job-native-read",
              code: 0,
              completed: true,
              output: `${nativePluginOutput(envelope)}\n`,
            },
          }),
          { status: 200 },
        ),
    });

    await expect(
      client.readEvent(
        "event-projects",
        { operation: "list_projects" },
        isVoiceflowEnvelope(isOptionResult),
      ),
    ).resolves.toEqual(envelope);
  });

  test("unwraps a native plugin envelope stored in job data", async () => {
    const envelope = {
      ok: true,
      operation: "check_session",
      operationID: "operation-native-data",
      result: { active: true },
      warnings: [],
    };
    const client = createXYOpsClient(config, {
      fetcher: async () =>
        new Response(
          JSON.stringify({
            code: 0,
            job: {
              id: "job-native-data",
              code: 0,
              completed: true,
              output: null,
              data: { voiceflow: envelope },
            },
          }),
          { status: 200 },
        ),
    });

    await expect(
      client.readEvent(
        "event-check_session",
        { operation: "check_session" },
        isVoiceflowEnvelope(isCheckSessionResult),
      ),
    ).resolves.toEqual(envelope);
  });

  test("requires only the API key and supplies local event-title defaults", () => {
    const config = readXYOpsConfig({ XYOPS_API_KEY: "local-api-key" });

    expect(config.baseURL).toBe(DEFAULT_XYOPS_BASE_URL);
    expect(config.events).toEqual({
      checkSession: { title: "voiceflow_check_session" },
      listWorkspaces: { title: "voiceflow_list_workspaces" },
      listProjects: { title: "voiceflow_list_projects" },
      listVersions: { title: "voiceflow_list_versions" },
      listFolders: { title: "voiceflow_list_folders" },
      createFolder: { title: "voiceflow_create_folder" },
      planMigration: { title: "voiceflow_plan_migration" },
      executeMigration: { title: "voiceflow_execute_migration" },
    });
  });

  test("keeps the API key required", () => {
    expect(() => readXYOpsConfig({})).toThrow();
  });

  test("supports URL, title, and explicit ID event overrides", () => {
    const config = readXYOpsConfig({
      XYOPS_API_KEY: "local-api-key",
      XYOPS_BASE_URL: "https://xyops.example.test/",
      XYOPS_EVENT_CHECK_SESSION: "id:event-check",
      XYOPS_EVENT_LIST_PROJECTS: "title:custom-projects",
    });

    expect(config.baseURL).toBe("https://xyops.example.test");
    expect(config.events.checkSession).toEqual({ id: "event-check" });
    expect(config.events.listProjects).toEqual({ title: "custom-projects" });
  });

  test("uses an explicit ID reference in the XYOps request body", async () => {
    const requests: string[] = [];
    const client = createXYOpsClient(config, {
      fetcher: async (_input, init) => { requests.push(requestBody(init)); return optionEnvelopeResponse(); },
    });

    await client.readEvent(
      { id: "event-check" },
      { operation: "check_session" },
      isVoiceflowEnvelope(isOptionResult),
    );

    expect(firstBodyJSON(requests)).toMatchObject({ id: "event-check" });
    expect(firstBodyJSON(requests)).not.toHaveProperty("title");
  });

  test("reads a job nested under the get_job data envelope", async () => {
    const client = createXYOpsClient(config, {
      fetcher: async () =>
        new Response(
          JSON.stringify({
            code: 0,
            data: {
              job: {
                id: "job-nested",
                code: 0,
                completed: true,
                data: {
                  ok: true,
                  operation: "execute_migration",
                  operationID: "operation-nested",
                  result: {},
                  warnings: [],
                },
              },
            },
          }),
          { status: 200 },
        ),
    });

    await expect(
      client.executeEvent(
        "event-execute",
        { operation: "execute_migration", CONFIRMED: true },
        isVoiceflowEnvelope((value): value is Readonly<Record<string, unknown>> =>
          typeof value === "object" && value !== null,
        ),
      ),
    ).resolves.toMatchObject({ ok: true, operation: "execute_migration" });
  });

  test("falls back to job data when output is empty", async () => {
    const client = createXYOpsClient(config, {
      fetcher: async () => new Response(
        JSON.stringify({
          code: 0,
          job: {
            id: "job-1",
            code: 0,
            completed: true,
            output: "  ",
            data: {
              ok: true,
              operation: "list_projects",
              operationID: "operation-1",
              result: { options: [{ value: "project-1", label: "Project 1" }] },
              warnings: [],
            },
          },
        }),
        { status: 200 },
      ),
    });

    const result = await client.readEvent(
      "event-projects",
      { operation: "list_projects" },
      isVoiceflowEnvelope(isOptionResult),
    );

    expect(result.ok).toBe(true);
  });

  test("rejects malformed job output without exposing the raw output", async () => {
    const rawOutput = "not-json-secret-output";
    const client = createXYOpsClient(config, {
      fetcher: async () => new Response(
        JSON.stringify({
          code: 0,
          job: { id: "job-1", code: 0, completed: true, output: rawOutput, data: null },
        }),
        { status: 200 },
      ),
    });

    const error = await client.readEvent(
      "event-projects",
      { operation: "list_projects" },
      isVoiceflowEnvelope(isOptionResult),
    ).catch((value: unknown) => value);

    expect(error).toMatchObject({
      diagnostic: {
        code: "job",
        nextAction: "XYOps returned malformed job output.",
      },
    });
    expect(String(error)).not.toContain(rawOutput);
  });

  test("reports a plain-text wait job failure before parsing its output", async () => {
    const failureDescription = "The Voiceflow plugin could not complete the request.";
    const client = createXYOpsClient(config, {
      fetcher: async () => new Response(
        JSON.stringify({
          code: 0,
          job: {
            id: "job-plugin-failure",
            code: "plugin_failure",
            completed: true,
            output: `${failureDescription}\n`,
            data: null,
          },
        }),
        { status: 200 },
      ),
    });

    await expect(
      client.readEvent(
        "event-projects",
        { operation: "list_projects" },
        isVoiceflowEnvelope(isOptionResult),
      ),
    ).rejects.toMatchObject({
      diagnostic: { code: "job", nextAction: failureDescription },
    });
  });

  test("checks for an active session before requesting workspace choices", async () => {
    const environmentNames = [
      "XYOPS_API_KEY",
      "XYOPS_BASE_URL",
      "XYOPS_EVENT_CHECK_SESSION",
      "XYOPS_EVENT_LIST_WORKSPACES",
    ];
    const previousEnvironment = Object.fromEntries(
      environmentNames.map((name) => [name, process.env[name]]),
    );
    const previousFetch = globalThis.fetch;
    const previousLog = console.log;
    const requests: string[] = [];
    const output: string[] = [];
    process.env.XYOPS_API_KEY = "local-api-key";
    delete process.env.XYOPS_BASE_URL;
    delete process.env.XYOPS_EVENT_CHECK_SESSION;
    delete process.env.XYOPS_EVENT_LIST_WORKSPACES;
    globalThis.fetch = async (_input, init) => {
      requests.push(requestBody(init));
      return inactiveSessionResponse();
    };
    console.log = (...values: unknown[]) => output.push(values.join(" "));

    try {
      await expect(run()).rejects.toThrow();
      expect(requests).toHaveLength(1);
      expect(JSON.parse(requests[0] ?? "{}")).toMatchObject({ title: "voiceflow_check_session" });
      expect(output.some((line) => line.includes("Source workspace"))).toBe(false);
    } finally {
      globalThis.fetch = previousFetch;
      console.log = previousLog;
      restoreEnvironment(environmentNames, previousEnvironment);
    }
  });

  test("uses a top-level launch ID and polls get_job exactly once per dispatch", async () => {
    const requests: Array<{ path: string; body: string }> = [];
    let pollCount = 0;
    const client = createXYOpsClient(config, {
      fetcher: async (input, init) => {
        const path = new URL(requestURL(input)).pathname;
        requests.push({ path, body: requestBody(init) });
        pollCount = nextPollCount(path, pollCount);
        return topLevelResponse(path, pollCount);
      },
      sleeper: async () => undefined,
    });

    const result = await client.executeEvent(
      "event-execute",
      executeParameters(selection, "plan-1"),
      isVoiceflowEnvelope((value): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null),
    );

    expect(result).toEqual({
      ok: true,
      operation: "execute_migration",
      operationID: "operation-3",
      result: {},
      warnings: [],
    });
    expect(requests.map(({ path }) => path)).toEqual([
      "/api/app/run_event/v1",
      "/api/app/get_job/v1",
      "/api/app/get_job/v1",
    ]);
    expect(requests.slice(1).map(({ body }) => JSON.parse(body))).toEqual([
      { id: "official-job-id" },
      { id: "official-job-id" },
    ]);
    expect(requests.filter(({ path }) => path === "/api/app/run_event/v1")).toHaveLength(1);
  });

  test("reports an unknown execute outcome without redispatching when launch ID is absent", async () => {
    let dispatchCount = 0;
    const client = createXYOpsClient(config, {
      fetcher: async (input) => {
        if (new URL(requestURL(input)).pathname === "/api/app/run_event/v1") dispatchCount += 1;
        return new Response(JSON.stringify({ code: 0 }), { status: 200 });
      },
    });

    await expect(client.executeEvent(
      "event-execute",
      executeParameters(selection, "plan-1"),
      isVoiceflowEnvelope((value): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null),
    )).rejects.toMatchObject({
      diagnostic: { code: "execute-outcome-unknown" },
    });
    expect(dispatchCount).toBe(1);
  });

  // The fixture intentionally models dispatch, active, and completed protocol states.
  const nativeJobResponse = (path: string, requestCount: number): Response => {
    if (path === "/api/app/run_event/v1")
      return new Response(JSON.stringify({ code: 0, id: "native-job" }));
    if (requestCount === 2)
      return new Response(JSON.stringify({
        code: 0,
        job: { id: "native-job", state: "active", progress: 0 },
      }));
    return new Response(JSON.stringify({
      code: 0,
      job: {
        id: "native-job",
        state: "complete",
        completed: 1787683968.928,
        code: 0,
        output: JSON.stringify({
          ok: true,
          operation: "execute_migration",
          operationID: "operation-native-complete",
          result: {},
          warnings: [],
        }),
      },
    }));
  };

  test("accepts the native XYOps active job DTO before completion", async () => {
    let requestCount = 0;
    const client = createXYOpsClient(config, {
      sleeper: () => Promise.resolve(),
      fetcher: async (input) => {
        requestCount += 1;
        return nativeJobResponse(new URL(String(input)).pathname, requestCount);
      },
    });

    await expect(
      client.executeEvent(
        "event-execute",
        { operation: "execute_migration" },
        isVoiceflowEnvelope(() => true),
      ),
    ).resolves.toMatchObject({
      ok: true,
      operation: "execute_migration",
    });
    expect(requestCount).toBe(3);
  });

  test("dispatches execute once and polls native plugin output until completion", async () => {
    const requests: Array<{ path: string; body: string }> = [];
    let pollCount = 0;
    const client = createXYOpsClient(config, {
      fetcher: async (input, init) => {
        const url = requestURL(input);
        const path = new URL(url).pathname;
        requests.push({ path, body: requestBody(init) });
        if (url.endsWith("/run_event/v1")) {
          return new Response(JSON.stringify({ code: 200, description: "OK", data: { id: "job-1" } }), { status: 200 });
        }
        pollCount += 1;
        return new Response(
          JSON.stringify({
            code: 200,
            description: "OK",
            data: [{ id: "job-1", completed: false, code: 0, data: null }, {
                  id: "job-1",
                  completed: 1787683968.928,
                  code: 0,
                  output: `${nativePluginOutput({
                    ok: true,
                    operation: "execute_migration",
                    operationID: "operation-2",
                    result: {
                      planID: "plan-1",
                      exportStatus: 200,
                      exportBytes: 10,
                      importStatus: 200,
                      importBytes: 20,
                      selected: {
                        sourceWorkspaceID: "source-workspace",
                        sourceProjectID: "source-project",
                        sourceVersionID: "source-version",
                        destinationWorkspaceID: "destination-workspace",
                        destinationFolderID: "destination-folder",
                        targetSchemaVersion: "13.1",
                      },
                      imported: { projectID: "imported-project" },
                      apiKeyRetrieved: true,
                    },
                    warnings: [],
                  })}\n`,
                  data: null,
                }][Number(!isFirstPoll(pollCount))],
          }),
          { status: 200 },
        );
      },
      sleeper: async () => undefined,
    });

    const result = await client.executeEvent(
      "event-execute",
      executeParameters(selection, "plan-1"),
      isVoiceflowEnvelope((value): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null),
    );

    expect(result.ok).toBe(true);
    expect(requests.map(({ path }) => path)).toEqual(["/api/app/run_event/v1", "/api/app/get_job/v1", "/api/app/get_job/v1"]);
    expect(JSON.parse(requiredRequest(requests).body).params.CONFIRMED).toBe(true);
    expect(requests.filter(({ path }) => path === "/api/app/run_event/v1")).toHaveLength(1);
  });

  test("reports a plain-text execute job failure before parsing its output", async () => {
    const failureDescription = "The Voiceflow plugin could not complete the request.";
    const client = createXYOpsClient(config, {
      fetcher: async (input) => {
        const path = new URL(requestURL(input)).pathname;
        if (path === "/api/app/run_event/v1")
          return new Response(
            JSON.stringify({ code: 200, data: { id: "job-plugin-failure" } }),
            { status: 200 },
          );
        return new Response(
          JSON.stringify({
            code: 200,
            data: {
              id: "job-plugin-failure",
              completed: true,
              code: "plugin_failure",
              output: `${failureDescription}\n`,
              data: null,
            },
          }),
          { status: 200 },
        );
      },
    });

    await expect(
      client.executeEvent(
        "event-execute",
        executeParameters(selection, "plan-1"),
        isVoiceflowEnvelope((value): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null),
      ),
    ).rejects.toMatchObject({
      diagnostic: { code: "job", nextAction: failureDescription },
    });
  });

  test("uses operation values and exact migration parameter keys", () => {
    expect(listWorkspacesParameters()).toEqual({ operation: "list_workspaces" });
    expect(listProjectsParameters("source-workspace")).toEqual({
      operation: "list_projects",
      SOURCE_WORKSPACE_ID: "source-workspace",
    });
    expect(listVersionsParameters("source-workspace", "source-project")).toEqual({
      operation: "list_versions",
      SOURCE_WORKSPACE_ID: "source-workspace",
      SOURCE_PROJECT_ID: "source-project",
    });
    expect(listFoldersParameters("destination-workspace")).toEqual({
      operation: "list_folders",
      DESTINATION_WORKSPACE_ID: "destination-workspace",
    });
    expect(planParameters(selection)).toEqual({
      operation: "plan_migration",
      SOURCE_WORKSPACE_ID: "source-workspace",
      SOURCE_PROJECT_ID: "source-project",
      SOURCE_VERSION_ID: "source-version",
      DESTINATION_WORKSPACE_ID: "destination-workspace",
      DESTINATION_FOLDER_ID: "destination-folder",
      TARGET_SCHEMA_VERSION: "13.1",
    });
    expect(executeParameters(selection, "plan-1")).toMatchObject({
      operation: "execute_migration",
      PLAN_ID: "plan-1",
      CONFIRMED: true,
    });
    expect(
      executeParameters(selection, "plan-1", [
        { key: "VF_TEST_SECRET", value: "value", type: "" },
      ]),
    ).toMatchObject({
      SECRET_FILE_CONTENTS: [{ key: "VF_TEST_SECRET", value: "value", type: "" }],
    });
  });
});
