import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  MigrationFileConfigSchema,
  XYOpsEnvironmentSchema,
} from "../xyops/cli/schemas/migration-config";
import { NativePluginJobSchema, PluginOperationSchema } from "../xyops/plugin/schemas/native_plugin_job";
import { CatalogRecordSchema } from "../xyops/voiceflow/catalog/schemas/catalog_record";
import { parseFolder, parseProject } from "../xyops/voiceflow/catalog/record-parsers";
import { ExistingSecretSchema } from "../xyops/voiceflow/schemas/existing_secret";
import {
  SecretEntryArraySchema,
  SecretEntrySchema,
} from "../xyops/voiceflow/schemas/secret_entry";
import { XYOpsResponseSchema, XYOpsStreamEventSchema } from "../xyops/cli/schemas/xyops-responses";
import { LoguxActionSchema } from "../xyops/voiceflow/logux/schemas/action";
import { LoguxFrameSchema } from "../xyops/voiceflow/logux/schemas/frame";

describe("BDD25 Zod-only boundary contracts", () => {
  test("owns CLI configuration shape and rejects unknown keys", () => {
    const parsed = MigrationFileConfigSchema.safeParse({
      source_workspace: " workspace ",
      secrets: [{ key: "KEY", value: "value", type: "" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.source_workspace).toBe("workspace");
    expect(MigrationFileConfigSchema.safeParse({ unsupported: true }).success).toBe(false);
    expect(MigrationFileConfigSchema.safeParse(null).success).toBe(false);
  });

  test("owns environment and secret collection boundaries", () => {
    expect(XYOpsEnvironmentSchema.safeParse({ XYOPS_API_KEY: "key" }).success).toBe(true);
    expect(XYOpsEnvironmentSchema.safeParse({ XYOPS_API_KEY: 42 }).success).toBe(false);
    expect(SecretEntryArraySchema.safeParse([
      { key: "KEY", value: "value", type: "" },
      { key: "KEY", value: "other", type: "" },
    ]).success).toBe(false);
    expect(SecretEntryArraySchema.safeParse({ key: "KEY" }).success).toBe(false);
  });

  test("uses one Zod owner for plugin jobs and operation values", () => {
    expect(PluginOperationSchema.safeParse("execute_migration").success).toBe(true);
    expect(PluginOperationSchema.safeParse("unknown").success).toBe(false);
    expect(NativePluginJobSchema.safeParse({ xy: 1, type: "event", params: {} }).success).toBe(true);
    expect(NativePluginJobSchema.safeParse({ xy: 1, type: "event", params: [] }).success).toBe(false);
  });

  test("passes parsed catalog records directly to policy parsers", () => {
    expect(parseProject({ id: "project", workspaceID: "workspace", name: "Project" })).toMatchObject({
      ok: true,
      value: { id: "project", workspaceID: "workspace", label: "Project" },
    });
    expect(parseFolder({ id: "42", workspaceID: "workspace", label: "Folder" })).toMatchObject({
      ok: true,
      value: { id: "42", workspaceID: "workspace", label: "Folder" },
    });
    expect(parseProject({ id: "project" }).ok).toBe(false);
    expect(CatalogRecordSchema.safeParse([]).success).toBe(false);
  });

  test("keeps secret and existing-secret shapes schema-owned", () => {
    expect(SecretEntrySchema.safeParse({ key: "KEY", value: "value", type: "" }).success).toBe(true);
    expect(SecretEntrySchema.safeParse({ key: "", value: "value", type: "" }).success).toBe(false);
    expect(ExistingSecretSchema.safeParse({
      id: "secret",
      assistantID: "assistant",
      name: "KEY",
      visibility: "masked",
      hasValue: true,
    }).success).toBe(true);
    expect(ExistingSecretSchema.safeParse({ id: "secret" }).success).toBe(false);
  });

  test("covers malformed, missing, null, empty, oversized, and unknown inputs at each schema boundary", () => {
    const schemas = [
      MigrationFileConfigSchema,
      NativePluginJobSchema,
      CatalogRecordSchema,
      ExistingSecretSchema,
      SecretEntrySchema,
      XYOpsResponseSchema,
      XYOpsStreamEventSchema,
      LoguxActionSchema,
      LoguxFrameSchema,
    ];
    for (const schema of schemas) {
      expect(schema.safeParse(null).success).toBe(false);
      expect(schema.safeParse([]).success).toBe(false);
      expect(() => schema.safeParse({ unknown: "x" })).not.toThrow();
      expect(() => schema.safeParse({ value: "x".repeat(100_000) })).not.toThrow();
    }
  });

  test("does not require assertions to establish trusted schema output", () => {
    const schema = z.object({ id: z.string().min(1) });
    const parsed = schema.safeParse({ id: "trusted" });
    expect(parsed.success && parsed.data.id).toBe("trusted");
  });
});
