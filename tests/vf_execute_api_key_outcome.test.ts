import { describe, expect, mock, test } from "bun:test";
import {
  resolveVoiceflowAuth as originalResolveVoiceflowAuth,
  type AuthContext,
} from "../xyops/voiceflow/auth";
import {
  retrieveApiKeyStatus as originalRetrieveApiKeyStatus,
  type ApiKeyStatus,
} from "../xyops/voiceflow/api_key";
import type {
  ImportedReceipt,
  MigrationPlan,
  MigrationSelection,
  Warning,
} from "../xyops/voiceflow/contracts";
import {
  exportVersion as originalExportVersion,
  type ExportArtifact,
} from "../xyops/voiceflow/export";
import { importVersion as originalImportVersion } from "../xyops/voiceflow/import";
import { buildMigrationPlan as originalBuildMigrationPlan } from "../xyops/voiceflow/planning";
import type { ProjectRecord } from "../xyops/voiceflow/types";

type ExecuteScenario = "retrieval-failure" | "success";

const scenarioEnvironmentVariable = "VF_EXECUTE_API_KEY_OUTCOME_SCENARIO";

const auth: AuthContext = {
  creatorID: "creator",
  token: "token",
};

const selection: MigrationSelection = {
  sourceWorkspaceID: "source-workspace",
  sourceProjectID: "source-project",
  sourceVersionID: "source-version",
  destinationWorkspaceID: "destination-workspace",
  destinationFolderID: "1",
  targetSchemaVersion: "13.1",
};

const plan: MigrationPlan = {
  planID: "plan-id",
  selection,
  labels: {
    sourceWorkspace: "Source Workspace",
    sourceProject: "Source Project",
    sourceVersion: "Source Version",
    destinationWorkspace: "Destination Workspace",
    destinationFolder: "Destination Folder",
  },
};

const artifact: ExportArtifact = {
  status: 200,
  bytes: new Uint8Array([1, 2, 3, 4]).buffer,
  filename: "voiceflow-source-version.vf",
  contentType: "application/octet-stream",
};

const imported: ImportedReceipt = {
  importStatus: 201,
  importBytes: artifact.bytes.byteLength,
  projectID: "imported-project",
  workspaceID: selection.destinationWorkspaceID,
  folderID: selection.destinationFolderID,
};

const executeArguments = [
  "token",
  plan.planID,
  selection.sourceWorkspaceID,
  selection.sourceProjectID,
  selection.sourceVersionID,
  selection.destinationWorkspaceID,
  selection.destinationFolderID,
  selection.targetSchemaVersion,
  true,
] as const;

const successfulApiKeyOutcome: ApiKeyStatus = {
  apiKeyRetrieved: true,
};

const apiKeyRetrievalFailure: ApiKeyStatus = {
  apiKeyRetrieved: false,
  postImport: {
    apiKeyRetrieved: false,
    diagnostic: {
      code: "API_KEY_RETRIEVAL_FAILED",
      message: "Project API key could not be retrieved.",
    },
  },
};

let apiKeyOutcome: ApiKeyStatus = successfulApiKeyOutcome;

const resolveVoiceflowAuth = mock(async () => auth);
const buildMigrationPlan = mock(async () => plan);
const exportVersion = mock(async () => artifact);
const importVersion = mock(async () => imported);
const retrieveApiKeyStatus = mock(async () => apiKeyOutcome);
const loadProjects = mock(async (_auth: unknown, workspaceID: string): Promise<readonly ProjectRecord[]> => [{
  id: selection.sourceProjectID,
  label: "Source Project",
  workspaceID,
  environments: [],
}]);

function installDependencyMocks(): void {
  mock.module("../xyops/voiceflow/auth", () => ({ resolveVoiceflowAuth }));
  mock.module("../xyops/voiceflow/planning", () => ({ buildMigrationPlan }));
  mock.module("../xyops/voiceflow/export", () => ({ exportVersion }));
  mock.module("../xyops/voiceflow/import", () => ({ importVersion }));
  mock.module("../xyops/voiceflow/api_key", () => ({ retrieveApiKeyStatus }));
  mock.module("../xyops/voiceflow/catalog", () => ({ loadProjects }));
}

function restoreDependencyModules(): void {
  mock.module("../xyops/voiceflow/auth", () => ({
    resolveVoiceflowAuth: originalResolveVoiceflowAuth,
  }));
  mock.module("../xyops/voiceflow/planning", () => ({
    buildMigrationPlan: originalBuildMigrationPlan,
  }));
  mock.module("../xyops/voiceflow/export", () => ({
    exportVersion: originalExportVersion,
  }));
  mock.module("../xyops/voiceflow/import", () => ({
    importVersion: originalImportVersion,
  }));
  mock.module("../xyops/voiceflow/api_key", () => ({
    retrieveApiKeyStatus: originalRetrieveApiKeyStatus,
  }));
  mock.module("../xyops/voiceflow/catalog", () => ({
    loadProjects: async () => [],
  }));
}

function apiKeyOutcomeForScenario(scenario: ExecuteScenario): ApiKeyStatus {
  return scenario === "success"
    ? successfulApiKeyOutcome
    : apiKeyRetrievalFailure;
}

async function executeMockedScenario(scenario: ExecuteScenario): Promise<unknown> {
  apiKeyOutcome = apiKeyOutcomeForScenario(scenario);
  installDependencyMocks();

  try {
    const { main: executeMigration } = await import(
      "../xyops/voiceflow/execute_migration"
    );
    return await executeMigration(...executeArguments);
  } finally {
    restoreDependencyModules();
  }
}

function isExecuteScenario(value: string): value is ExecuteScenario {
  return value === "success" || value === "retrieval-failure";
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function executeScenarioInIsolatedProcess(scenario: ExecuteScenario): unknown {
  const child = Bun.spawnSync(
    [process.execPath, "run", import.meta.path],
    {
      env: {
        ...process.env,
        [scenarioEnvironmentVariable]: scenario,
      },
      stderr: "pipe",
      stdout: "pipe",
    },
  );
  const stderr = decode(child.stderr).trim();
  const stdout = decode(child.stdout).trim();

  validateIsolatedExecution(child.exitCode, stdout, scenario, stderr);
  return JSON.parse(stdout) as unknown;
}

function validateIsolatedExecution(exitCode: number, stdout: string, scenario: ExecuteScenario, stderr: string): void {
  validateExecuteExit(exitCode, stderr);
  validateExecuteStdout(stdout);
}

function validateExecuteExit(exitCode: number, stderr: string): void {
  if (exitCode !== 0) throw new Error(`Isolated execute scenario failed with exit ${exitCode}: ${stderr}`);
}

function validateExecuteStdout(stdout: string): void {
  if (!stdout) throw new Error("Isolated execute scenario returned no envelope");
}

function expectedExecuteResult() {
  return {
    planID: plan.planID,
    exportStatus: artifact.status,
    exportBytes: artifact.bytes.byteLength,
    importStatus: imported.importStatus,
    importBytes: imported.importBytes,
    selected: selection,
    imported,
  };
}

function expectedSuccessEnvelope(warnings: readonly Warning[]) {
  return {
    ok: true,
    operation: "execute_migration",
    operationID: expect.any(String),
    result: expectedExecuteResult(),
    warnings,
  };
}

const requestedScenario = process.env[scenarioEnvironmentVariable];

if (requestedScenario !== undefined) {
  if (!isExecuteScenario(requestedScenario)) {
    throw new Error(`Unknown execute scenario: ${requestedScenario}`);
  }

  const envelope = await executeMockedScenario(requestedScenario);
  process.stdout.write(JSON.stringify(envelope));
} else {
  describe("execute migration API-key outcome", () => {
    test("returns success without postImport and only the non-idempotent warning", () => {
      const envelope = executeScenarioInIsolatedProcess("success");

      expect(envelope).toEqual(
        expectedSuccessEnvelope([]),
      );
      expect(envelope).not.toHaveProperty("result.postImport");
    });

    test("keeps retrieval failure in an ok envelope with the exact diagnostic and warning", () => {
      const envelope = executeScenarioInIsolatedProcess("retrieval-failure");

      expect(envelope).toEqual(
        expectedSuccessEnvelope([]),
      );
    });
  });
}
