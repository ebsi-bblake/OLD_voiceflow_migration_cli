import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { failure, OperationFault, success, type Envelope } from "../xyops/voiceflow/contracts";
import type { NativePluginJob, OperationHandlers } from "../xyops/plugin/types";
import { validatePluginJob, parsePluginJob, readVoiceflowJWT } from "../xyops/plugin/job_validation";
import { dispatchOperation } from "../xyops/plugin/operation_dispatch";
import { formatPluginDiagnostic } from "../xyops/plugin/diagnostics";
import { runNativePlugin } from "../xyops/plugin/process_entrypoint";
import { mapVoiceflowEnvelope } from "../xyops/plugin/wire_protocol";
import { XYOpsPluginResponseSchema } from "../xyops/plugin/schemas/plugin_response";
import { resolveVoiceflowAuth } from "../xyops/voiceflow/auth";
import { createUUID } from "../xyops/voiceflow/uuid";
import { PLUGIN_VERSION } from "../xyops/plugin/version";

type Output = { write: (value: string) => void };
type RestoreGlobalDescriptor = (name: "atob" | "TextDecoder", descriptor: PropertyDescriptor | undefined) => void;
const restoreGlobalDescriptor: RestoreGlobalDescriptor = (name, descriptor) => {
  if (descriptor === undefined) Reflect.deleteProperty(globalThis, name);
  else Object.defineProperty(globalThis, name, descriptor);
};

const fakeEnvelope = (operation: string): Promise<Envelope<unknown>> =>
  Promise.resolve(success(operation, `operation-${operation}`, { operation }));

const createFakeHandlers = (calls: string[]): OperationHandlers => ({
  "check_session": (token) => {
    calls.push(`check_session:${token}`);
    return fakeEnvelope("check_session");
  },
  "check_session_workflow": (token, workflowData) => {
    calls.push(`check_session_workflow:${token}:${JSON.stringify(workflowData)}`);
    return fakeEnvelope("check_session_workflow");
  },
  "list_workspaces": (token) => {
    calls.push(`list_workspaces:${token}`);
    return fakeEnvelope("list_workspaces");
  },
  "load_workspaces": (token, workflowData) => {
    calls.push(`load_workspaces:${token}:${JSON.stringify(workflowData)}`);
    return fakeEnvelope("load_workspaces");
  },
  "load_source_catalog": (token, workflowData) => {
    calls.push(`load_source_catalog:${token}:${JSON.stringify(workflowData)}`);
    return fakeEnvelope("load_source_catalog");
  },
  "resolve_source_selection": (workflowData) => {
    calls.push(`resolve_source_selection:${JSON.stringify(workflowData)}`);
    return fakeEnvelope("resolve_source_selection");
  },
  "list_projects": (token, workspaceID) => {
    calls.push(`list_projects:${token}:${workspaceID}`);
    return fakeEnvelope("list_projects");
  },
  "list_versions": (token, workspaceID, projectID) => {
    calls.push(`list_versions:${token}:${workspaceID}:${projectID}`);
    return fakeEnvelope("list_versions");
  },
  "list_folders": (token, workspaceID) => {
    calls.push(`list_folders:${token}:${workspaceID}`);
    return fakeEnvelope("list_folders");
  },
  "plan_migration": (token, workspaceID, projectID, versionID, destinationWorkspaceID, folderID, schema) => {
    calls.push(`plan_migration:${token}:${workspaceID}:${projectID}:${versionID}:${destinationWorkspaceID}:${folderID}:${schema}`);
    return fakeEnvelope("plan_migration");
  },
  "execute_migration": (token, planID, workspaceID, projectID, versionID, destinationWorkspaceID, folderID, schema, confirmed) => {
    calls.push(`execute_migration:${token}:${planID}:${workspaceID}:${projectID}:${versionID}:${destinationWorkspaceID}:${folderID}:${schema}:${confirmed}`);
    return fakeEnvelope("execute_migration");
  },
});

const baseParameters = {
  SOURCE_WORKSPACE_ID: "source-workspace",
  SOURCE_PROJECT_ID: "source-project",
  SOURCE_VERSION_ID: "source-version",
  DESTINATION_WORKSPACE_ID: "destination-workspace",
  DESTINATION_FOLDER_ID: "123",
  TARGET_SCHEMA_VERSION: "13.1",
  PLAN_ID: "plan-1",
  CONFIRMED: true,
} as const;
const removedOperationParameter = ["RUNNER", "NAME"].join("_");

const jobFor = (operation: NativePluginJob["operation"]): NativePluginJob => ({
  operation,
  params: { operation, ...baseParameters },
});

const eventJobFor = (params: Record<string, unknown>): Record<string, unknown> => ({
  xy: 1,
  type: "event",
  params,
});

describe("native XYOps event plugin boundary", () => {
  test("creates RFC 4122 version-four UUIDs without Web Crypto", () => {
    expect(createUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("accepts operation and rejects the removed runner parameter", () => {
    expect(validatePluginJob(eventJobFor({ operation: "check_session" })).operation).toBe("check_session");
    expect(() => validatePluginJob(eventJobFor({ [removedOperationParameter]: "list_workspaces" }))).toThrow("operation parameter");
    expect(validatePluginJob({ ...eventJobFor({ operation: "check_session" }), event: "event-id" }).operation).toBe("check_session");
  });

  test("rejects a missing xy discriminator", () => {
    expect(() => validatePluginJob({ type: "event", params: { operation: "check_session" } })).toThrow(
      "XYOps event job",
    );
  });

  test("rejects a wrong xy discriminator", () => {
    expect(() => validatePluginJob({ ...eventJobFor({ operation: "check_session" }), xy: 2 })).toThrow(
      "XYOps event job",
    );
  });

  test("rejects a wrong event type", () => {
    expect(() => validatePluginJob({ ...eventJobFor({ operation: "check_session" }), type: "job" })).toThrow(
      "XYOps event job",
    );
  });

  test("rejects non-object params", () => {
    expect(() => validatePluginJob(eventJobFor({ operation: "check_session" }))).not.toThrow();
    expect(() => validatePluginJob({ xy: 1, type: "event", params: [] })).toThrow(
      "XYOps event job",
    );
  });

  test("accepts extra top-level fields without changing the operation", () => {
    expect(
      validatePluginJob({
        ...eventJobFor({ operation: "check_session" }),
        event: "event-id",
        metadata: { source: "test" },
      }).operation,
    ).toBe("check_session");
  });

  test("rejects malformed JSON without exposing the raw input", () => {
    const rawInput = "not-json-secret";
    expect(() => parsePluginJob(rawInput)).toThrow("valid JSON");
    expect(() => parsePluginJob(rawInput)).toThrowError(
      expect.not.objectContaining({ message: expect.stringContaining(rawInput) }),
    );
  });

  test("rejects missing and unknown operations", () => {
    expect(() => validatePluginJob(eventJobFor({}))).toThrow("operation parameter");
    expect(() => validatePluginJob(eventJobFor({ operation: "delete-everything" }))).toThrow(
      "not supported",
    );
  });

  test("does not expose raw invalid job input in schema errors", () => {
    const rawInput = "masked-plugin-secret";
    expect(() => validatePluginJob({ xy: 2, type: "event", params: { operation: rawInput } })).toThrow(
      "XYOps event job",
    );
    expect(() => validatePluginJob({ xy: 2, type: "event", params: { operation: rawInput } })).toThrowError(
      expect.not.objectContaining({ message: expect.stringContaining(rawInput) }),
    );
  });

  test("reads the JWT only from the environment", () => {
    expect(readVoiceflowJWT({ VOICEFLOW_JWT: "environment-token" })).toBe("environment-token");
    expect(() => readVoiceflowJWT({})).toThrow("not configured");
  });

  test("does not allow a top-level secrets field to override the environment", async () => {
    const calls: string[] = [];
    let rendered = "";
    const status = await runNativePlugin(
      (async function* () {
        yield JSON.stringify({
          ...eventJobFor({ operation: "check_session" }),
          secrets: { VOICEFLOW_JWT: "masked-secret" },
        });
      })(),
      { write: (value) => { rendered += value; } },
      { VOICEFLOW_JWT: "environment-token" },
      createFakeHandlers(calls),
    );

    expect(status).toBe(0);
    expect(calls[0]).toBe("check_session:environment-token");
    expect(rendered).not.toContain("masked-secret");
  });

  test.each([
    "check_session",
    "check_session_workflow",
    "list_workspaces",
    "load_workspaces",
    "load_source_catalog",
    "list_projects",
    "list_versions",
    "list_folders",
    "plan_migration",
    "execute_migration",
  ] as const)("dispatches %s through an injected handler", async (operation) => {
    const calls: string[] = [];
    const result = await dispatchOperation(jobFor(operation), "test-token", createFakeHandlers(calls));
    expect(result.ok).toBe(true);
    expect(calls[0]).toContain(`${operation}:test-token`);
  });

  test("initializes workflowData from validated workflow input", async () => {
    const workflowData = {
      schemaVersion: 1,
      stage: "CONFIGURED",
      config: {},
      catalog: {},
      selection: {},
    } as const;
    const result = await dispatchOperation(
      {
        ...jobFor("initialize_migration_workflow"),
        input: { data: workflowData },
      },
      "test-token",
    );

    expect(result).toMatchObject({
      ok: true,
      operation: "initialize_migration_workflow",
      result: workflowData,
    });
  });

  test("validates string operation parameters through the schema adapter", async () => {
    const calls: string[] = [];
    const result = await dispatchOperation(
      {
        ...jobFor("list_projects"),
        params: {
          ...baseParameters,
          operation: "list_projects",
          SOURCE_WORKSPACE_ID: { secret: "do-not-expose" },
        },
      },
      "test-token",
      createFakeHandlers(calls),
    );

    expect(result).toMatchObject({ ok: false, error: { code: "INVALID_ARGUMENT" } });
    expect(JSON.stringify(result)).not.toContain("do-not-expose");
    expect(calls).toHaveLength(0);
  });

  test("passes secret input to the migration handler without normalizing it twice", async () => {
    let received: unknown;
    const handlers = createFakeHandlers([]);
    const result = await dispatchOperation(
      {
        ...jobFor("execute_migration"),
        params: {
          ...baseParameters,
          operation: "execute_migration",
          SECRET_FILE_CONTENTS: [
            { key: "VF_TEST_SECRET", value: "value", type: "" },
          ],
        },
      },
      "test-token",
      {
        ...handlers,
        "execute_migration": (...args) => {
          received = args[9];
          return fakeEnvelope("execute_migration");
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(received).toEqual([
      { key: "VF_TEST_SECRET", value: "value", type: "" },
    ]);
  });

  test("reads secret input from workflow params for child event jobs", async () => {
    let received: unknown;
    const result = await dispatchOperation(
      {
        ...jobFor("execute_migration"),
        params: { ...baseParameters, operation: "execute_migration" },
        workflow: {
          params: {
            SECRET_FILE_CONTENTS: [
              { key: "VF_WORKFLOW_SECRET", value: "sentinel", type: "" },
            ],
          },
        },
      },
      "test-token",
      {
        ...createFakeHandlers([]),
        "execute_migration": (...args) => {
          received = args[9];
          return fakeEnvelope("execute_migration");
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(received).toEqual([
      { key: "VF_WORKFLOW_SECRET", value: "sentinel", type: "" },
    ]);
  });

  test("uses a UUID for a dispatch failure fallback", async () => {
    const handlers = createFakeHandlers([]);
    const result = await dispatchOperation(
      jobFor("check_session"),
      "test-token",
      { ...handlers, "check_session": () => Promise.reject(new Error("failure")) },
    );

    expect(result).toMatchObject({ ok: false, operation: "check_session" });
    expect(result.operationID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test("requires literal boolean confirmation and does not call execute", async () => {
    const calls: string[] = [];
    const handlers = createFakeHandlers(calls);
    const result = await dispatchOperation(
      { ...jobFor("execute_migration"), params: { ...baseParameters, operation: "execute_migration", CONFIRMED: "true" } },
      "test-token",
      handlers,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "CONFIRMATION_REQUIRED" } });
    expect(calls).toHaveLength(0);
  });

  test("validates plugin responses while preserving extra protocol fields", () => {
    const response = {
      xy: 1,
      complete: true,
      code: 0,
      data: {
        voiceflow: success("check_session", "operation-1", { active: true }),
      },
      metadata: { requestID: "request-1" },
    };

    expect(XYOpsPluginResponseSchema.safeParse(response).success).toBe(true);
    expect(
      XYOpsPluginResponseSchema.safeParse({
        ...response,
        complete: false,
        secret: "must-not-be-returned-in-issues",
      }).success,
    ).toBe(false);
  });

  test("maps Voiceflow success and failure envelopes to protocol responses", () => {
    const successResponse = mapVoiceflowEnvelope(success("check_session", "operation-1", { active: true }));
    expect(successResponse).toMatchObject({ xy: 1, complete: true, code: 0, data: { voiceflow: { ok: true } } });
    const workspaceResponse = mapVoiceflowEnvelope(success("load_workspaces", "operation-workspaces", {
      schemaVersion: 1,
      stage: "WORKSPACES_LOADED",
      config: {},
      catalog: { workspaces: [{ id: "workspace-1", label: "Workspace 1" }] },
      selection: {},
    }));
    expect(workspaceResponse).toMatchObject({
      workflowData: { stage: "WORKSPACES_LOADED", catalog: { workspaces: [{ id: "workspace-1" }] } },
    });

    const failureResponse = mapVoiceflowEnvelope(failure("check_session", "operation-2", new OperationFault("AUTHENTICATION_FAILED")));
    expect(failureResponse).toMatchObject({ xy: 1, complete: true, code: "AUTHENTICATION_FAILED", description: `[pluginVersion=${PLUGIN_VERSION}] Authentication failed. (code=AUTHENTICATION_FAILED)` });
    expect(failureResponse.data?.voiceflow).toMatchObject({ ok: false, error: { code: "AUTHENTICATION_FAILED" } });
  });

  test("emits one safe protocol response for malformed input, missing secret, and unknown operation", async () => {
    const cases = [
      { input: "not-json", environment: {} },
      { input: JSON.stringify(eventJobFor({ operation: "check_session" })), environment: {} },
      { input: JSON.stringify(eventJobFor({ operation: "not-supported" })), environment: {} },
    ];
    for (const testCase of cases) {
      let rendered = "";
      const output: Output = { write: (value) => { rendered += value; } };
      const status = await runNativePlugin(
        (async function* () { yield testCase.input; })(),
        output,
        testCase.environment,
      );
      const response: unknown = JSON.parse(rendered);
      expect(status).toBe(0);
      expect(response).toMatchObject({ xy: 1, complete: true });
      expect(rendered).not.toContain("not-supported");
    }
  });

  test("dispatches an operation without the global Web Crypto UUID API", async () => {
    const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "crypto",
    );
    let rendered = "";
    let status: number | undefined;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });
    try {
      status = await runNativePlugin(
        (async function* () {
          yield JSON.stringify(eventJobFor({ operation: "check_session" }));
        })(),
        { write: (value) => { rendered += value; } },
        { VOICEFLOW_JWT: "test-token" },
        createFakeHandlers([]),
      );
    } finally {
      if (originalCryptoDescriptor === undefined) {
        Reflect.deleteProperty(globalThis, "crypto");
      } else {
        Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
      }
    }

    expect(status).toBe(0);
    expect(JSON.parse(rendered)).toMatchObject({
      xy: 1,
      complete: true,
      data: { voiceflow: { ok: true, operation: "check_session" } },
    });
  });

  test("decodes JWT claims through the native plugin without Web JWT globals", async () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "native-creator", marker: "¾" }),
      "utf8",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const token = `header.${payload}.signature`;
    const originalAtobDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "atob",
    );
    const originalTextDecoderDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "TextDecoder",
    );
    let rendered = "";
    const handlers: OperationHandlers = {
      ...createFakeHandlers([]),
      "check_session": (receivedToken) =>
        resolveVoiceflowAuth(receivedToken).then((auth) =>
          success("check_session", "native-auth", auth),
        ),
    };

    try {
      const status = await runNativePlugin(
        (async function* () {
          yield JSON.stringify(eventJobFor({ operation: "check_session" }));
          Object.defineProperty(globalThis, "atob", {
            configurable: true,
            value: undefined,
          });
          Object.defineProperty(globalThis, "TextDecoder", {
            configurable: true,
            value: undefined,
          });
        })(),
        { write: (value) => { rendered += value; } },
        { VOICEFLOW_JWT: `  Bearer ${token}  ` },
        handlers,
      );

      expect(status).toBe(0);
    } finally {
      restoreGlobalDescriptor("atob", originalAtobDescriptor);
      restoreGlobalDescriptor("TextDecoder", originalTextDecoderDescriptor);
    }

    expect(JSON.parse(rendered)).toMatchObject({
      xy: 1,
      complete: true,
      code: 0,
      data: {
        voiceflow: {
          ok: true,
          result: { token, creatorID: "native-creator" },
        },
      },
    });
  });

  test("redacts a secret from unexpected handler failures", async () => {
    const secret = "jwt-secret-must-not-leak";
    const handlers = createFakeHandlers([]);
    const unsafeHandlers: OperationHandlers = {
      ...handlers,
      "check_session": () => Promise.reject(new Error(secret)),
    };
    let rendered = "";
    await runNativePlugin(
      (async function* () { yield JSON.stringify(eventJobFor({ operation: "check_session" })); })(),
      { write: (value) => { rendered += value; } },
      { VOICEFLOW_JWT: secret },
      unsafeHandlers,
    );
    expect(rendered).not.toContain(secret);
    expect(JSON.parse(rendered)).toMatchObject({ code: "INTERNAL_ERROR", data: { voiceflow: { ok: false } } });
  });

  test("reports the response stage and redacts sensitive error details", async () => {
    const secret = "Bearer super-token-secret-value";
    const unsafeHandlers: OperationHandlers = {
      ...createFakeHandlers([]),
      "check_session": () => Promise.resolve(new Proxy({}, {
        get: (_target, property) => {
          if (property === "then") return undefined;
          throw new Error(
            `${secret} params={"SOURCE_PROJECT_ID":"project-secret"} exportBase64=exported-data`,
          );
        },
      }) as Envelope<unknown>),
    };
    let rendered = "";
    let diagnostics = "";
    await runNativePlugin(
      (async function* () { yield JSON.stringify(eventJobFor({ operation: "check_session" })); })(),
      { write: (value) => { rendered += value; } },
      { VOICEFLOW_JWT: "jwt-secret-value" },
      unsafeHandlers,
      { write: (value) => { diagnostics += value; } },
    );

    const response = JSON.parse(rendered) as { description?: string };
    expect(response.description).toContain(diagnostics.trim());
    expect(diagnostics).toMatch(new RegExp(`^pluginVersion=${PLUGIN_VERSION} stage=response error=Error message=`));
    expect(diagnostics).not.toContain(secret);
    expect(diagnostics).not.toContain("project-secret");
    expect(diagnostics).not.toContain("exported-data");
    expect(diagnostics).not.toContain("at ");
    expect(diagnostics.length).toBeLessThanOrEqual(321);
  });

  test("formats a bounded diagnostic with an input stage", () => {
    const diagnostic = formatPluginDiagnostic(
      "input",
      new Error(`token-secret ${"x".repeat(500)}\n    at secret-file.ts:1:1`),
    );
    expect(diagnostic).toMatch(new RegExp(`^pluginVersion=${PLUGIN_VERSION} stage=input error=Error message=`));
    expect(diagnostic).not.toContain("token-secret");
    expect(diagnostic).not.toContain("secret-file.ts");
    expect(diagnostic.length).toBeLessThanOrEqual(320);
  });

  test("runs a CJS bundle from an extensionless path with Node", () => {
    const directory = mkdtempSync(join(tmpdir(), "voiceflow-plugin-test-"));
    const bundledPath = join(directory, "plugin.cjs");
    const extensionlessPath = join(directory, "plugin");
    const inputPath = join(directory, "input.json");
    const sourcePath = join(import.meta.dir, "../xyops/plugin/entrypoint.ts");
    const input = `${JSON.stringify(eventJobFor({ operation: "check_session" }))}\n`;

    try {
      const build = Bun.spawnSync(
        [
          process.execPath,
          "build",
          sourcePath,
          "--target=node",
          "--format=cjs",
          `--outfile=${bundledPath}`,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );
      expect(build.exitCode).toBe(0);
      copyFileSync(bundledPath, extensionlessPath);
      writeFileSync(inputPath, input);

      const execution = Bun.spawnSync(["node", extensionlessPath], {
        stdin: Bun.file(inputPath),
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = new TextDecoder().decode(execution.stdout).trim();
      const stderr = new TextDecoder().decode(execution.stderr).trim();
      expect(execution.exitCode).toBe(0);
      const response = JSON.parse(output) as { description?: string };
      expect(response).toMatchObject({ xy: 1, complete: true, code: "MISSING_SECRET" });
      expect(response.description).toContain(stderr);
      expect(stderr).toBe(
        `pluginVersion=${PLUGIN_VERSION} stage=secret error=PluginValidationFault message=The Voiceflow JWT secret is not configured.`,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
