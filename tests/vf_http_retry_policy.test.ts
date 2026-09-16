import { expect, test } from "bun:test";

import { exportVersion } from "../xyops/voiceflow/export";
import {
  importVersion,
  isImportOutcomeUnknownStatus,
} from "../xyops/voiceflow/import";
import { isRetryableHttpStatus } from "../xyops/voiceflow/http";

const TOKEN = "aaa.eyJzdWIiOiJjcmVhdG9yIn0.zzz";
const AUTH = { token: TOKEN, creatorID: "creator" };
const IMPORT_ARTIFACT = {
  status: 200,
  bytes: new ArrayBuffer(0),
  filename: "voiceflow-export.vf",
  contentType: "application/octet-stream",
} as const;
const originalFetch = globalThis.fetch;
const scenarioEnvironmentVariable = "VF_HTTP_RETRY_POLICY_SCENARIO";

function installStatusResponse(status: number): void {
  globalThis.fetch = (async () => new Response(null, { status })) as typeof fetch;
}

function expectedRetryability(status: number): boolean {
  return retryableStatuses.has(status) || isServerError(status);
}
const retryableStatuses = new Set([408, 429]);
const isServerError = (status: number): boolean => status >= 500 && status < 600;

function runCheckSessionScenario(status: number): unknown {
  installStatusResponse(status);
  return import("../xyops/voiceflow/check_session").then(({ main }) => main(TOKEN));
}

function runIsolatedCheckSession(status: number): unknown {
  const child = Bun.spawnSync([process.execPath, "run", import.meta.path], {
    env: {
      ...process.env,
      [scenarioEnvironmentVariable]: String(status),
    },
    stderr: "pipe",
    stdout: "pipe",
  });
  const stderr = new TextDecoder().decode(child.stderr).trim();
  const stdout = new TextDecoder().decode(child.stdout).trim();
  if (child.exitCode !== 0) {
    throw new Error(`Isolated check_session failed with exit ${child.exitCode}: ${stderr}`);
  }
  return JSON.parse(stdout) as unknown;
}

const requestedScenario = process.env[scenarioEnvironmentVariable];

if (requestedScenario !== undefined) {
  const status = Number(requestedScenario);
  if (!Number.isInteger(status)) throw new Error("Invalid retry policy scenario");
  const envelope = await runCheckSessionScenario(status);
  process.stdout.write(JSON.stringify(envelope));
} else {
  for (const status of [400, 404, 408, 429, 500, 503]) {
    test(`check_session classifies HTTP ${status}`, () => {
      expect(runIsolatedCheckSession(status)).toMatchObject({
        ok: false,
        error: {
          code: "DEPENDENCY_FAILURE",
          message: "The Voiceflow dependency failed.",
          retryable: expectedRetryability(status),
        },
      });
    });

    test(`exportVersion classifies HTTP ${status}`, async () => {
      installStatusResponse(status);
      try {
        await expect(exportVersion(AUTH, "version")).rejects.toMatchObject({
          code: "DEPENDENCY_FAILURE",
          message: "The Voiceflow dependency failed.",
          retryable: expectedRetryability(status),
        });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  }

  for (const status of [408, 429, 500, 503]) {
    test(`import preserves unknown outcomes for HTTP ${status}`, async () => {
      installStatusResponse(status);
      try {
        await expect(
          importVersion(AUTH, IMPORT_ARTIFACT, "workspace", "42", "13.1"),
        ).rejects.toMatchObject({ code: "IMPORT_OUTCOME_UNKNOWN" });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  }

  for (const status of [401, 403]) {
    test(`check_session treats HTTP ${status} as login required`, () => {
      expect(runIsolatedCheckSession(status)).toMatchObject({
        ok: true,
        result: {
          active: false,
          loginRequired: true,
          loginUrl: "https://creator.empyrean.voiceflow.com/",
        },
      });
    });
  }

  test("keeps retry and import-outcome policies bounded conservatively", () => {
    expect(isRetryableHttpStatus(599)).toBe(true);
    expect(isRetryableHttpStatus(600)).toBe(false);
    expect(isImportOutcomeUnknownStatus(599)).toBe(true);
    expect(isImportOutcomeUnknownStatus(600)).toBe(true);
  });
}
