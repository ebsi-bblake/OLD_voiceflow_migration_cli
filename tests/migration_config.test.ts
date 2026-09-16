import { describe, expect, test } from "bun:test";
import { readMigrationFileConfig } from "../xyops/cli/config";
import { selectDestinationSelection, selectSourceSelection } from "../xyops/cli/migration/selection";
import { readSecretsForMigration } from "../xyops/cli/migration/secret-input";
import { cliErrorOutput } from "../xyops/cli/diagnostics";
import { executeParameters, stateSelection } from "../xyops/cli/state";
import { isEventParameterEntry } from "../xyops/cli/guards";

const configPath = "/tmp/voiceflow-migration-config-test.json";
const secretsPath = "/tmp/voiceflow-migration-secrets-test.json";

describe("migration configuration contract", () => {
  test("accepts resource names or IDs with the new field names", async () => {
    await Bun.write(configPath, JSON.stringify({
      source_workspace: "Support Workspace",
      source_project: "Customer Assistant",
      source_version: "Production",
      destination_workspace: "Production Workspace",
      destination_folder: "Customer Imports",
    }));
    await expect(readMigrationFileConfig(configPath)).resolves.toEqual({
      sourceWorkspaceID: "Support Workspace",
      sourceProjectID: "Customer Assistant",
      sourceVersionID: "Production",
      destinationWorkspaceID: "Production Workspace",
      destinationFolderID: "Customer Imports",
    });
  });

  test("accepts path-based resource fields and source folder context", async () => {
    await Bun.write(configPath, JSON.stringify({
      source_path: " Source Workspace / Source Folder / Source Project ",
      source_folder: "Source Folder",
      destination_path: "Destination Workspace/Import Folder",
    }));
    await expect(readMigrationFileConfig(configPath)).resolves.toEqual({
      sourcePath: "Source Workspace / Source Folder / Source Project",
      sourceFolderID: "Source Folder",
      destinationPath: "Destination Workspace/Import Folder",
    });
  });

  test("rejects malformed path-based fields", async () => {
    await Bun.write(configPath, JSON.stringify({ source_path: "   " }));
    await expect(readMigrationFileConfig(configPath)).rejects.toMatchObject({
      diagnostic: { code: "configuration" },
    });
  });

  test("rejects the removed ID-suffixed configuration fields", async () => {
    await Bun.write(configPath, JSON.stringify({
      source_workspace_id: "workspace",
    }));
    await expect(readMigrationFileConfig(configPath)).rejects.toMatchObject({
      diagnostic: { code: "configuration" },
    });
  });

  test("maps snake_case inputs and preserves the configured secrets path", async () => {
    await Bun.write(secretsPath, JSON.stringify([
      { key: "FIRST_SECRET", value: "FIRST_REDACTED", type: "" },
      { key: "SECOND_SECRET", value: "SECOND_REDACTED", type: "" },
    ]));
    await Bun.write(configPath, JSON.stringify({
      source_workspace: "source-workspace",
      source_project: "source-project",
      source_version: "source-version",
      destination_workspace: "destination-workspace",
      destination_folder: "destination-folder",
      target_schema_version: "13.1",
      secrets: secretsPath,
    }));
    await expect(readMigrationFileConfig(configPath)).resolves.toEqual({
      sourceWorkspaceID: "source-workspace",
      sourceProjectID: "source-project",
      sourceVersionID: "source-version",
      destinationWorkspaceID: "destination-workspace",
      destinationFolderID: "destination-folder",
      targetSchemaVersion: "13.1",
      secrets: secretsPath,
    });
  });

  test("preserves an omitted secrets property as absent", async () => {
    await Bun.write(configPath, JSON.stringify({ source_workspace: "workspace" }));
    await expect(readMigrationFileConfig(configPath)).resolves.toEqual({
      sourceWorkspaceID: "workspace",
    });
  });

  test("accepts a config containing only an empty inline secrets array", async () => {
    await Bun.write(configPath, JSON.stringify({ secrets: [] }));
    await expect(readMigrationFileConfig(configPath)).resolves.toEqual({
      secrets: [],
    });
  });

  test("rejects unsupported fields and malformed secret entries", async () => {
    await Bun.write(configPath, JSON.stringify({ unsupported: "value" }));
    await expect(readMigrationFileConfig(configPath)).rejects.toMatchObject({
      diagnostic: { code: "configuration" },
    });
    await Bun.write(configPath, JSON.stringify({ secrets: [{ key: "TOKEN", value: "x", extra: true }] }));
    await expect(readMigrationFileConfig(configPath)).rejects.toMatchObject({
      diagnostic: { code: "configuration" },
    });
    await Bun.write(configPath, JSON.stringify({ secrets: [{ key: "TOKEN", value: "SECRET_VALUE" }, { key: "TOKEN", value: "OTHER_VALUE" }] }));
    const duplicateFailure = await readMigrationFileConfig(configPath).catch((error: unknown) => error);
    expect(duplicateFailure).toMatchObject({ diagnostic: { code: "configuration" } });
    expect(JSON.stringify(duplicateFailure)).not.toContain("SECRET_VALUE");
    expect(JSON.stringify(duplicateFailure)).not.toContain("OTHER_VALUE");
  });

  test("rejects blank configured migration identifiers before prompting", async () => {
    await Bun.write(configPath, JSON.stringify({
      source_workspace: "  ",
    }));
    await expect(readMigrationFileConfig(configPath)).rejects.toMatchObject({
      diagnostic: { code: "configuration" },
    });
  });

  test("formats configuration failures without file paths or raw content", async () => {
    await Bun.write(configPath, "{ not-json SECRET_VALUE");
    const failure = await readMigrationFileConfig(configPath).catch((error: unknown) => error);
    const output = JSON.stringify(cliErrorOutput(failure));
    expect(output).not.toContain("SECRET_VALUE");
    expect(output).not.toContain(configPath);
    expect(output).not.toContain("not-json");
  });

  test("rejects blank secret names without exposing values", async () => {
    await Bun.write(configPath, JSON.stringify({
      secrets: [{ key: "  ", value: "SECRET_VALUE" }],
    }));
    const failure = await readMigrationFileConfig(configPath).catch((error: unknown) => error);
    expect(failure).toMatchObject({ diagnostic: { code: "configuration" } });
    expect(JSON.stringify(failure)).not.toContain("SECRET_VALUE");
  });

  test("rejects legacy secret maps and malformed JSON safely", async () => {
    await Bun.write(configPath, JSON.stringify({ secrets: { TOKEN: "SECRET_VALUE" } }));
    const mapFailure = await readMigrationFileConfig(configPath).catch((error: unknown) => error);
    expect(mapFailure).toMatchObject({ diagnostic: { code: "configuration" } });
    expect(JSON.stringify(mapFailure)).not.toContain("SECRET_VALUE");

    await Bun.write(configPath, "{ not-json");
    const jsonFailure = await readMigrationFileConfig(configPath).catch((error: unknown) => error);
    expect(jsonFailure).toMatchObject({ diagnostic: { code: "configuration" } });
    expect(JSON.stringify(jsonFailure)).not.toContain("not-json");
  });

  test("rejects the removed --secrets option", async () => {
    const originalArguments = process.argv;
    process.argv = [...originalArguments, "--secrets=/tmp/secrets.json"];
    try {
      await expect(readMigrationFileConfig()).rejects.toMatchObject({
        diagnostic: { code: "configuration" },
      });
    } finally {
      process.argv = originalArguments;
    }
  });

  test("prompts for omitted secrets and treats blank input as no secrets", async () => {
    await Bun.write(configPath, JSON.stringify({
      source_workspace: "workspace",
    }));
    const originalArguments = process.argv;
    process.argv = [...originalArguments, `--config=${configPath}`];
    try {
      await expect(readMigrationFileConfig()).resolves.toEqual({
        sourceWorkspaceID: "workspace",
      });
      const calls: string[] = [];
      const reader = {
        ask: async (question: string) => { calls.push(question); return ""; },
        close: () => undefined,
      };
      await expect(readSecretsForMigration(reader, {})).resolves.toEqual([]);
      expect(calls).toEqual([
        "Path to secrets file (local or network; press Enter for no secrets): ",
      ]);
    } finally {
      process.argv = originalArguments;
    }
  });

  test("uses configured secrets without prompting for a path", async () => {
    const secrets = [{ key: "TOKEN", value: "SECRET_VALUE", type: "" }];
    await Bun.write(secretsPath, JSON.stringify(secrets));
    const reader = {
      ask: async () => { throw new Error("unexpected prompt"); },
      close: () => undefined,
    };
    await expect(readSecretsForMigration(reader, { secrets: secretsPath })).resolves.toEqual(secrets);
  });

  test("preserves configured secret arrays in execute event parameters", () => {
    const selection = {
      sourceWorkspaceID: "source-workspace",
      sourceProjectID: "source-project",
      sourceVersionID: "source-version",
      destinationWorkspaceID: "destination-workspace",
      destinationFolderID: "destination-folder",
      targetSchemaVersion: "13.1",
    };
    const secrets = [
      { key: "FIRST_SECRET", value: "FIRST_VALUE", type: "" },
      { key: "SECOND_SECRET", value: "SECOND_VALUE", type: "" },
    ];
    const parameters = executeParameters(selection, "plan-id", secrets);
    expect(parameters.SECRET_FILE_CONTENTS).toBe(secrets);
    expect(isEventParameterEntry(["SECRET_FILE_CONTENTS", parameters.SECRET_FILE_CONTENTS])).toBe(true);
    expect(isEventParameterEntry(["SECRET_FILE_CONTENTS", { FIRST_SECRET: "FIRST_VALUE" }])).toBe(false);
  });

  test("reports each missing required migration value before planning", () => {
    const completeState = {
      sourceWorkspaceID: "source-workspace",
      sourceProjectID: "source-project",
      sourceVersionID: "source-version",
      destinationWorkspaceID: "destination-workspace",
      destinationFolderID: "destination-folder",
      targetSchemaVersion: "13.1",
    };
    const requiredFields = [
      ["sourceWorkspaceID", "source_workspace"],
      ["sourceProjectID", "source_project"],
      ["sourceVersionID", "source_version"],
      ["destinationWorkspaceID", "destination_workspace"],
      ["destinationFolderID", "destination_folder"],
    ] as const;
    requiredFields.forEach(([field, configurationName]) => {
      expect(() => stateSelection({ ...completeState, [field]: undefined })).toThrow();
      try {
        stateSelection({ ...completeState, [field]: undefined });
      } catch (error: unknown) {
        expect(JSON.stringify(cliErrorOutput(error))).toContain(configurationName);
      }
    });
  });

  test("returns to destination folder selection after creation is declined", async () => {
    const questions: string[] = [];
    const executedEvents: string[] = [];
    const context = {
      reader: {
        ask: async (question: string) => {
          questions.push(question);
          return ["Paricipant Assistants", "no", "Participant Assistants"][questions.length - 1];
        },
        close: () => undefined,
      },
      client: {
        readEvent: async (_event: unknown, parameters: { operation: string }) => ({
          ok: true,
          operation: parameters.operation,
          operationID: "test",
          warnings: [],
          result: {
            options: parameters.operation === "list_workspaces"
              ? [{ value: "destination-workspace", label: "Destination Workspace" }]
              : [{ value: "folder-id", label: "Participant Assistants" }],
          },
        }),
        executeEvent: async () => {
          executedEvents.push("create_folder");
          return {};
        },
      },
      config: { events: { listWorkspaces: "workspaces", listFolders: "folders", createFolder: "create-folder" } },
      migrationConfig: { destinationWorkspaceID: "destination-workspace" },
    } as never;

    await expect(selectDestinationSelection(context)).resolves.toMatchObject({
      destinationFolderID: "folder-id",
    });
    expect(questions).toEqual([
      "Select number or enter a new folder name: ",
      "Create destination folder 'Paricipant Assistants'? (yes/no): ",
      "Select number or enter a new folder name: ",
    ]);
    expect(executedEvents).toEqual([]);
  });

  test("redisplays destination folders after an illegal number", async () => {
    const questions: string[] = [];
    const context = {
      reader: {
        ask: async (question: string) => {
          questions.push(question);
          return questions.length === 1 ? "99" : "1";
        },
        close: () => undefined,
      },
      client: {
        readEvent: async (_event: unknown, parameters: { operation: string }) => ({
          ok: true,
          operation: parameters.operation,
          operationID: "test",
          warnings: [],
          result: {
            options: parameters.operation === "list_workspaces"
              ? [{ value: "destination-workspace", label: "Destination Workspace" }]
              : [{ value: "folder-id", label: "Participant Assistants" }],
          },
        }),
        executeEvent: async () => { throw new Error("unexpected folder creation"); },
      },
      config: { events: { listWorkspaces: "workspaces", listFolders: "folders", createFolder: "create-folder" } },
      migrationConfig: { destinationWorkspaceID: "destination-workspace" },
    } as never;

    await expect(selectDestinationSelection(context)).resolves.toMatchObject({
      destinationFolderID: "folder-id",
    });
    expect(questions).toEqual([
      "Select number or enter a new folder name: ",
      "Select number or enter a new folder name: ",
    ]);
  });

  test("preserves an omitted schema version for artifact discovery", async () => {
    const calls: string[] = [];
    const context = {
      reader: { ask: async () => { calls.push("prompt"); return ""; }, close: () => undefined },
      client: { readEvent: async (_event: unknown, parameters: { operation: string }) => ({
        ok: true, operation: "list_workspaces", operationID: "test", warnings: [],
        result: { options: parameters.operation === "list_workspaces"
          ? [{ value: "destination-workspace", label: "Destination Workspace" }]
          : [{ value: "destination-folder", label: "Destination Folder" }] },
      }) },
      config: { events: { listWorkspaces: "workspaces", listFolders: "folders" } },
      migrationConfig: {
        destinationWorkspaceID: "destination-workspace",
        destinationFolderID: "destination-folder",
      },
    } as never;
    await expect(selectDestinationSelection(context)).resolves.toMatchObject({
      destinationWorkspaceID: "destination-workspace",
      destinationFolderID: "destination-folder",
      targetSchemaVersion: undefined,
    });
    expect(calls).toEqual([]);
  });

  test("selects draft development by default without prompting", async () => {
    const calls: string[] = [];
    const context = {
      reader: { ask: async () => { calls.push("prompt"); return ""; }, close: () => undefined },
      client: { readEvent: async (_event: unknown, parameters: { operation: string }) => ({
        ok: true, operation: parameters.operation, operationID: "test", warnings: [],
        result: { options: parameters.operation === "list_workspaces"
          ? [{ value: "workspace-id", label: "Workspace" }]
          : parameters.operation === "list_projects"
            ? [{ value: "project-id", label: "Project" }]
            : [
                { value: "published-id", label: "[Published] Project — Development" },
                { value: "draft-id", label: "[Draft] Project — Development" },
              ] },
      }) },
      config: { events: { listWorkspaces: "workspaces", listProjects: "projects", listVersions: "versions" } },
      migrationConfig: { sourceWorkspaceID: "workspace-id", sourceProjectID: "project-id" },
    } as never;
    await expect(selectSourceSelection(context)).resolves.toEqual({
      sourceWorkspaceID: "workspace-id",
      sourceProjectID: "project-id",
      sourceVersionID: "draft-id",
    });
    expect(calls).toEqual([]);
  });

  test("falls back to interactive version selection when draft development is unavailable", async () => {
    const calls: string[] = [];
    const context = {
      reader: { ask: async (question: string) => { calls.push(question); return ["1", "1", "2"][calls.length - 1]; }, close: () => undefined },
      client: { readEvent: async (_event: unknown, parameters: { operation: string }) => ({
        ok: true, operation: parameters.operation, operationID: "test", warnings: [],
        result: { options: parameters.operation === "list_workspaces"
          ? [{ value: "workspace-id", label: "Workspace" }]
          : parameters.operation === "list_projects"
            ? [{ value: "project-id", label: "Project" }]
            : [{ value: "published-id", label: "[Published] Project — Development" }, { value: "draft-id", label: "[Draft] Project — Staging" }] },
      }) },
      config: { events: { listWorkspaces: "workspaces", listProjects: "projects", listVersions: "versions" } },
    } as never;
    await expect(selectSourceSelection(context)).resolves.toMatchObject({ sourceVersionID: "draft-id" });
    expect(calls).toEqual(["Select number: ", "Select number: ", "Select number: "]);
  });

  test("uses an explicitly configured source version instead of the default", async () => {
    const calls: string[] = [];
    const context = {
      reader: { ask: async () => { calls.push("prompt"); return ""; }, close: () => undefined },
      client: { readEvent: async (_event: unknown, parameters: { operation: string }) => ({
        ok: true, operation: parameters.operation, operationID: "test", warnings: [],
        result: { options: parameters.operation === "list_workspaces"
          ? [{ value: "workspace-id", label: "Workspace" }]
          : parameters.operation === "list_projects"
            ? [{ value: "project-id", label: "Project" }]
            : [{ value: "configured-id", label: "Configured" }, { value: "draft-id", label: "[Draft] Project — Development" }] },
      }) },
      config: { events: { listWorkspaces: "workspaces", listProjects: "projects", listVersions: "versions" } },
      migrationConfig: {
        sourceWorkspaceID: "workspace-id",
        sourceProjectID: "project-id",
        sourceVersionID: "configured-id",
      },
    } as never;
    await expect(selectSourceSelection(context)).resolves.toMatchObject({ sourceVersionID: "configured-id" });
    expect(calls).toEqual([]);
  });

  test("resolves configured migration values without prompting", async () => {
    const calls: string[] = [];
    const context = {
      reader: { ask: async () => { calls.push("prompt"); return ""; }, close: () => undefined },
      client: { readEvent: async (_event: unknown, parameters: { operation: string }) => ({
        ok: true, operation: "list_workspaces", operationID: "test", warnings: [],
        result: { options: parameters.operation === "list_workspaces"
          ? [{ value: "workspace-id", label: "Workspace" }, { value: "destination-workspace", label: "Destination Workspace" }]
          : parameters.operation === "list_projects"
            ? [{ value: "project-id", label: "Project" }]
            : parameters.operation === "list_versions"
              ? [{ value: "version-id", label: "Version" }]
              : [{ value: "42", label: "Destination Folder" }] },
      }) },
      config: { events: { listWorkspaces: "workspaces", listProjects: "projects", listVersions: "versions", listFolders: "folders" } },
      migrationConfig: {
        sourceWorkspaceID: "Workspace", sourceProjectID: "Project", sourceVersionID: "Version",
        destinationWorkspaceID: "Destination Workspace", destinationFolderID: "Destination Folder", targetSchemaVersion: "13.1",
      },
    } as never;
    await expect(selectSourceSelection(context)).resolves.toEqual({ sourceWorkspaceID: "workspace-id", sourceProjectID: "project-id", sourceVersionID: "version-id" });
    await expect(selectDestinationSelection(context)).resolves.toEqual({ destinationWorkspaceID: "destination-workspace", destinationFolderID: "42", targetSchemaVersion: "13.1" });
    expect(calls).toEqual([]);
  });
});
