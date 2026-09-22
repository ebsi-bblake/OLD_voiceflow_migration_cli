import { z } from "zod";
import { MigrationFileConfigSchema } from "../../cli/schemas/migration-config";

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = nonEmptyString.optional();

/** Persisted workflow config intentionally excludes local secret input. */
export const MigrationWorkflowConfigSchema = MigrationFileConfigSchema.omit({
  secrets: true,
});

const WorkspaceRecordSchema = z
  .object({
    id: nonEmptyString,
    label: nonEmptyString,
  })
  .strict();

const EnvironmentRecordSchema = z
  .object({
    label: nonEmptyString,
    draftVersionID: optionalNonEmptyString,
    publishedVersionID: optionalNonEmptyString,
  })
  .strict();

const ProjectRecordSchema = z
  .object({
    id: nonEmptyString,
    label: nonEmptyString,
    workspaceID: nonEmptyString,
    folderID: optionalNonEmptyString,
    environments: z.array(EnvironmentRecordSchema).readonly(),
  })
  .strict();

const FolderRecordSchema = z
  .object({
    id: nonEmptyString,
    label: nonEmptyString,
    workspaceID: nonEmptyString,
    parentID: optionalNonEmptyString,
  })
  .strict();

const SelectionBaseSchema = z
  .object({
    sourceWorkspaceID: optionalNonEmptyString,
    sourceProjectID: optionalNonEmptyString,
    sourceVersionID: optionalNonEmptyString,
    destinationWorkspaceID: optionalNonEmptyString,
    destinationFolderID: optionalNonEmptyString,
    targetSchemaVersion: optionalNonEmptyString,
  })
  .strict();

const CompleteSelectionSchema = z
  .object({
    sourceWorkspaceID: nonEmptyString,
    sourceProjectID: nonEmptyString,
    sourceVersionID: nonEmptyString,
    destinationWorkspaceID: nonEmptyString,
    destinationFolderID: nonEmptyString,
    targetSchemaVersion: optionalNonEmptyString,
  })
  .strict();

const PendingFolderSelectionSchema = z
  .object({
    sourceWorkspaceID: nonEmptyString,
    sourceProjectID: nonEmptyString,
    sourceVersionID: nonEmptyString,
    destinationWorkspaceID: nonEmptyString,
    destinationFolderID: z.undefined().optional(),
    targetSchemaVersion: optionalNonEmptyString,
  })
  .strict();

const PlannedSelectionSchema = z.union([
  CompleteSelectionSchema,
  PendingFolderSelectionSchema,
]);

const EmptyCatalogSchema = z.object({}).strict();
const WorkspacesCatalogSchema = z
  .object({
    workspaces: z.array(WorkspaceRecordSchema).readonly(),
  })
  .strict();
const SourceCatalogSchema = z
  .object({
    workspaces: z.array(WorkspaceRecordSchema).readonly(),
    sourceProjects: z.array(ProjectRecordSchema).readonly(),
    sourceFolders: z.array(FolderRecordSchema).readonly(),
  })
  .strict();
const DestinationCatalogSchema = z
  .object({
    workspaces: z.array(WorkspaceRecordSchema).readonly(),
    sourceProjects: z.array(ProjectRecordSchema).readonly(),
    sourceFolders: z.array(FolderRecordSchema).readonly(),
    destinationFolders: z.array(FolderRecordSchema).readonly(),
  })
  .strict();
const CompleteCatalogSchema = DestinationCatalogSchema;

const DestinationFolderCreationSchema = z
  .object({
    workspaceID: nonEmptyString,
    requestedPath: nonEmptyString,
    action: z.literal("CREATE_DESTINATION_FOLDER"),
  })
  .strict();

const MigrationPlanSchema = z
  .object({
    planID: nonEmptyString,
    sourceSchemaVersion: optionalNonEmptyString,
    selection: PlannedSelectionSchema,
    labels: z
      .object({
        sourceWorkspace: nonEmptyString,
        sourceProject: nonEmptyString,
        sourceVersion: nonEmptyString,
        destinationWorkspace: nonEmptyString,
        destinationFolder: nonEmptyString,
      })
      .strict(),
    destinationFolderCreation: DestinationFolderCreationSchema.optional(),
  })
  .strict()
  .refine(
    ({ selection, destinationFolderCreation }) =>
      selection.destinationFolderID !== undefined || destinationFolderCreation !== undefined,
    { message: "A destination folder or creation action is required" },
  );

const ConfiguredWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("CONFIGURED"),
    config: MigrationWorkflowConfigSchema,
    catalog: EmptyCatalogSchema,
    selection: SelectionBaseSchema,
  })
  .strict();

const WorkspacesLoadedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("WORKSPACES_LOADED"),
    config: MigrationWorkflowConfigSchema,
    catalog: WorkspacesCatalogSchema,
    selection: SelectionBaseSchema,
  })
  .strict();

const SourceCatalogLoadedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("SOURCE_CATALOG_LOADED"),
    config: MigrationWorkflowConfigSchema,
    catalog: SourceCatalogSchema,
    selection: z
      .object({
        sourceWorkspaceID: nonEmptyString,
        sourceProjectID: optionalNonEmptyString,
        sourceVersionID: optionalNonEmptyString,
        destinationWorkspaceID: optionalNonEmptyString,
        destinationFolderID: optionalNonEmptyString,
        targetSchemaVersion: optionalNonEmptyString,
      })
      .strict(),
  })
  .strict();

const SourceResolvedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("SOURCE_RESOLVED"),
    config: MigrationWorkflowConfigSchema,
    catalog: SourceCatalogSchema,
    selection: z
      .object({
        sourceWorkspaceID: nonEmptyString,
        sourceProjectID: nonEmptyString,
        sourceVersionID: nonEmptyString,
        destinationWorkspaceID: optionalNonEmptyString,
        destinationFolderID: optionalNonEmptyString,
        targetSchemaVersion: optionalNonEmptyString,
      })
      .strict(),
  })
  .strict();

const SourceSchemaResolvedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("SOURCE_SCHEMA_RESOLVED"),
    config: MigrationWorkflowConfigSchema,
    catalog: SourceCatalogSchema,
    sourceSchemaVersion: nonEmptyString,
    selection: z
      .object({
        sourceWorkspaceID: nonEmptyString,
        sourceProjectID: nonEmptyString,
        sourceVersionID: nonEmptyString,
        destinationWorkspaceID: optionalNonEmptyString,
        destinationFolderID: optionalNonEmptyString,
        targetSchemaVersion: nonEmptyString,
      })
      .strict(),
  })
  .strict();

const DestinationCatalogLoadedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("DESTINATION_CATALOG_LOADED"),
    config: MigrationWorkflowConfigSchema,
    catalog: DestinationCatalogSchema,
    sourceSchemaVersion: optionalNonEmptyString,
    selection: z
      .object({
        sourceWorkspaceID: nonEmptyString,
        sourceProjectID: nonEmptyString,
        sourceVersionID: nonEmptyString,
        destinationWorkspaceID: nonEmptyString,
        destinationFolderID: optionalNonEmptyString,
        targetSchemaVersion: optionalNonEmptyString,
      })
      .strict(),
  })
  .strict();

const DestinationResolvedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("DESTINATION_RESOLVED"),
    config: MigrationWorkflowConfigSchema,
    catalog: CompleteCatalogSchema,
    sourceSchemaVersion: optionalNonEmptyString,
    selection: z
      .object({
        sourceWorkspaceID: nonEmptyString,
        sourceProjectID: nonEmptyString,
        sourceVersionID: nonEmptyString,
        destinationWorkspaceID: nonEmptyString,
        destinationFolderID: optionalNonEmptyString,
        targetSchemaVersion: optionalNonEmptyString,
      })
      .strict(),
    destinationFolderCreation: DestinationFolderCreationSchema.optional(),
  })
  .strict()
  .refine(
    ({ selection, destinationFolderCreation }) =>
      selection.destinationFolderID !== undefined || destinationFolderCreation !== undefined,
    { message: "A destination folder or creation action is required" },
  );

const PlannedWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("PLANNED"),
    config: MigrationWorkflowConfigSchema,
    catalog: CompleteCatalogSchema,
    sourceSchemaVersion: optionalNonEmptyString,
    selection: PlannedSelectionSchema,
    plan: MigrationPlanSchema,
  })
  .strict()
  .refine(
    ({ selection, plan }) =>
      selection.destinationFolderID !== undefined || plan.destinationFolderCreation !== undefined,
    { message: "A destination folder or creation action is required" },
  );

/** Confirmed, secret-free handoff from planning to the execution workflow. */
export const ConfirmedMigrationHandoffSchema = z
  .object({
    schemaVersion: z.literal(1),
    confirmed: z.literal(true),
    planID: nonEmptyString,
    plan: MigrationPlanSchema,
  })
  .strict()
  .refine(({ planID, plan }) => planID === plan.planID, {
    message: "planID must match plan.planID",
    path: ["planID"],
  });

const ExecutionReadyWorkflowDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    stage: z.literal("EXECUTION_READY"),
    planID: nonEmptyString,
    selection: PlannedSelectionSchema,
    plan: MigrationPlanSchema,
  })
  .strict()
  .refine(({ planID, plan, selection }) =>
    planID === plan.planID && JSON.stringify(selection) === JSON.stringify(plan.selection),
  );

type JSONValueSchemaType = z.ZodType<unknown>;
const JSONValueSchema: JSONValueSchemaType = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JSONValueSchema),
    z.record(z.string(), JSONValueSchema),
  ]),
);

const MigrationWorkflowDataStructureSchema = z.discriminatedUnion("stage", [
  ConfiguredWorkflowDataSchema,
  WorkspacesLoadedWorkflowDataSchema,
  SourceCatalogLoadedWorkflowDataSchema,
  SourceResolvedWorkflowDataSchema,
  SourceSchemaResolvedWorkflowDataSchema,
  DestinationCatalogLoadedWorkflowDataSchema,
  DestinationResolvedWorkflowDataSchema,
  PlannedWorkflowDataSchema,
  ExecutionReadyWorkflowDataSchema,
]);

/** Strict boundary schema for progressive, JSON-safe migration workflow data. */
export const MigrationWorkflowDataSchema = JSONValueSchema.pipe(
  MigrationWorkflowDataStructureSchema,
);

export type MigrationWorkflowData = z.infer<
  typeof MigrationWorkflowDataSchema
>;
export type MigrationWorkflowConfig = z.infer<
  typeof MigrationWorkflowConfigSchema
>;
export type ConfirmedMigrationHandoff = z.infer<
  typeof ConfirmedMigrationHandoffSchema
>;
export type ExecutionReadyWorkflowData = z.infer<
  typeof ExecutionReadyWorkflowDataSchema
>;
