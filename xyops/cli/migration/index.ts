#!/usr/bin/env bun
import { z } from "zod";
import {
  DEFAULT_XYOPS_BASE_URL,
  readMigrationFileConfig,
  readXYOpsConfig,
} from "../config";
import { createXYOpsClient } from "../client";
import { completeJob } from "../client/polling";
import { CheckSessionResultSchema } from "../schemas/session";
import { ExecuteResultSchema } from "../schemas/migration-results";
import { createVoiceflowEnvelopeSchema } from "../schemas/voiceflow-envelope";
import { requireEnvelopeResult } from "../validation";
import { asCliError, fail, formatCliError } from "../diagnostics";
import {
  eventParametersFor,
  initialMigrationState,
  stateSelection,
  type MigrationState,
} from "../state";
import { CreatePromptReader } from "../prompt";
import {
  selectSourceSelection,
  selectDestinationSelection,
  type MigrationContext,
} from "./selection";
import { readMigrationPlan } from "./planning";
import {
  executeConfirmedMigration,
  requestMigrationConfirmation,
  displayPlan,
} from "./execution";
import { readSecretsForMigration } from "./secret-input";
import { progress } from "../progress";
import { VoiceflowOperation } from "../../voiceflow/types";
import { MigrationWorkflowDataSchema } from "../../migration-workflow-data";
import { toWorkflowInput } from "./workflow-input";
import type { WorkflowMigrationPlan } from "../types";
import { runExecutionWorkflow } from "./execution-workflow";

type PrintHelp = () => void;
const printHelp: PrintHelp = () => {
  [
    "Usage: voiceflow-cli [--config=<path>] [--debug[=<name[,name...]>]]",
    "Interactively plan and execute a Voiceflow migration through XYOps.",
    `Local configuration: XYOPS_API_KEY=<key> (required), XYOPS_BASE_URL=<url> (default: ${DEFAULT_XYOPS_BASE_URL}).`,
    "Optional --config=<JSON-file> supplies migration resource names or IDs, schema version, and project secrets.",
    'Config format: { "source_workspace": "...", "target_schema_version": "13.1", "secrets": "./secrets.json" }.',
    "Configured IDs or exact catalog names are resolved before planning; missing values are selected interactively.",
    "XYOPS_MIGRATION_MODE=workflow starts and observes the migration workflow; events remains available as a compatibility mode.",
    "Optional XYOPS_EVENT_* overrides accept title:<event-title> or id:<event-id>.",
    "Default event titles must match the configured XYOps Event titles.",
    "Optional --debug enables stderr diagnostics; --debug=<name[,name...]> narrows them by logger name.",
  ].forEach((msg) => console.log(msg));
};

const helpRequested = (): boolean =>
  process.argv.includes("--help") || process.argv.includes("-h");
const requireActiveSession = (active: boolean): void => {
  if (!active)
    throw fail("envelope", {
      nextAction: "The configured Voiceflow session is not active.",
    });
};

const WorkflowDataEnvelopeSchema = z.looseObject({
  voiceflow: z.unknown(),
});
const WorkflowDataFieldSchema = z.looseObject({
  workflowData: z.unknown(),
});
const JobDataEnvelopeSchema = z.looseObject({
  data: z.unknown(),
});
type ReadWorkflowDataCandidate = (job: { workflowData?: unknown; data?: unknown }) => unknown;
const readWorkflowDataCandidate: ReadWorkflowDataCandidate = (job) => {
  const source = job.workflowData ?? job.data;
  const nested = JobDataEnvelopeSchema.safeParse(source);
  const candidate = nested.success ? nested.data.data : source;
  const field = WorkflowDataFieldSchema.safeParse(candidate);
  if (field.success) return field.data.workflowData;
  const wrapped = WorkflowDataEnvelopeSchema.safeParse(candidate);
  if (!wrapped.success) return source;
  const voiceflow = z
    .looseObject({ result: z.unknown() })
    .safeParse(wrapped.data.voiceflow);
  if (voiceflow.success) return voiceflow.data.result;
  const { voiceflow: _voiceflow, ...workflowData } = wrapped.data;
  return workflowData;
};

type FormatMigrationSuccess = (plan: WorkflowMigrationPlan) => string;
const formatMigrationSuccess: FormatMigrationSuccess = (plan) =>
  `Migration completed successfully: ${plan.labels.sourceProject} / ${plan.labels.sourceVersion} was imported into ${plan.labels.destinationWorkspace} / ${plan.labels.destinationFolder} (schema ${plan.selection.targetSchemaVersion}).`;

type PerformWorkflowMigration = (context: MigrationContext) => Promise<void>;
// eslint-disable-next-line complexity
const performWorkflowMigration: PerformWorkflowMigration = async ({ client, config, migrationConfig, reader }) => {
  const workflowJobID = await progress.run("start_migration_workflow", () =>
    client.startWorkflow(config.migrationWorkflow ?? { title: "Voiceflow Migration Workflow" }, toWorkflowInput(migrationConfig)),
  );
  const workflowJob = await progress.run("observe_migration_workflow", () =>
    client.observeWorkflow(workflowJobID),
  );
  if (workflowJob.code !== undefined && workflowJob.code !== 0 && workflowJob.code !== "0")
    throw fail("job", {
      nextAction: "The migration workflow failed.",
    });
  const workflowData = readWorkflowDataCandidate(workflowJob);
  const parsedWorkflowData =
    workflowData === undefined
      ? undefined
      : MigrationWorkflowDataSchema.safeParse(workflowData);
  if (parsedWorkflowData !== undefined && !parsedWorkflowData.success)
    throw fail("envelope", {
      nextAction: "The migration workflow returned invalid workflowData.",
    });
  const planned = parsedWorkflowData?.success && parsedWorkflowData.data.stage === "PLANNED"
    ? parsedWorkflowData.data
    : undefined;
  if (planned !== undefined) {
    displayPlan(planned.plan);
    const confirmed = await requestMigrationConfirmation(reader);
    if (!confirmed) return;
    const secretFileContents = migrationConfig?.secrets === undefined
      ? undefined
      : await progress.run("load_secrets", () =>
          readSecretsForMigration(reader, migrationConfig),
        );
    const execution = await progress.run("execution_workflow", () =>
      runExecutionWorkflow(
        client,
        config.executionWorkflow ?? { title: "Voiceflow Migration Execution Workflow" },
        planned.plan,
        secretFileContents,
      ),
    );
    const executionJob = execution.job;
    if (executionJob.code !== undefined && executionJob.code !== 0 && executionJob.code !== "0") {
      completeJob(
        executionJob,
        createVoiceflowEnvelopeSchema(ExecuteResultSchema),
      );
      throw fail("job", { nextAction: "The execution workflow failed." });
    }
    console.log(formatMigrationSuccess(planned.plan));
    return;
  }
  console.log("Migration planning completed.");
};

type PerformMigration = (context: MigrationContext) => Promise<void>;
const performMigration: PerformMigration = async (context) => {
  const { client, config } = context;
  const sessionResponse = await progress.run("check_session", () =>
    client.readEvent(
      config.events.checkSession,
      eventParametersFor(VoiceflowOperation.CheckSession),
      createVoiceflowEnvelopeSchema(CheckSessionResultSchema),
    ),
  );

  requireActiveSession(
    requireEnvelopeResult(
      sessionResponse,
      "check_session",
      createVoiceflowEnvelopeSchema(CheckSessionResultSchema),
    ).active,
  );

  const state: MigrationState = {
    ...initialMigrationState(),
    ...(await progress.run("select_source", () =>
      selectSourceSelection(context),
    )),
    ...(await progress.run("select_destination", () =>
      selectDestinationSelection(context),
    )),
  };

  const selection = stateSelection(state);

  const secretFileContents = await progress.run("load_secrets", () =>
    readSecretsForMigration(context.reader, context.migrationConfig),
  );

  const plan = await progress.run("plan_migration", () =>
    readMigrationPlan(context, selection),
  );

  displayPlan(plan);

  const confirmed = await requestMigrationConfirmation(context.reader);

  if (!confirmed) return;

  await progress.run("execute_migration", () =>
    executeConfirmedMigration(
      context,
      selection,
      plan.planID,
      secretFileContents,
    ),
  );
  console.log(formatMigrationSuccess(plan));
};

type Run = () => Promise<void>;
export const run: Run = async () => {
  if (helpRequested()) {
    printHelp();
    return;
  }
  console.warn(
    "WARNING: this performs a REAL Voiceflow export and import through XYOps.",
  );
  console.warn(
    "Use only the intended source version and destination workspace.",
  );

  const config = readXYOpsConfig();

  const migrationConfig = await readMigrationFileConfig();

  const client = createXYOpsClient(config);
  const reader = CreatePromptReader({
    beforeAsk: progress.pause,
    afterAsk: progress.resume,
  });
  try {
    const context = { reader, client, config, migrationConfig };
    if (config.migrationMode === "workflow")
      await performWorkflowMigration(context);
    else await performMigration(context);
  } finally {
    reader.close();
  }
};

type HandleFailure = (error: unknown) => void;
const handleFailure: HandleFailure = (error) => {
  process.exitCode = 1;
  console.error(formatCliError(asCliError(error)));
};

if (import.meta.main) {
  run()
    .then(() => undefined)
    .catch(handleFailure);
}
