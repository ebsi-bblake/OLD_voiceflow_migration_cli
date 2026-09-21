#!/usr/bin/env bun
import {
  DEFAULT_XYOPS_BASE_URL,
  readMigrationFileConfig,
  readXYOpsConfig,
} from "../config";
import { createXYOpsClient } from "../client";
import { CheckSessionResultSchema } from "../schemas/session";
import { createVoiceflowEnvelopeSchema } from "../schemas/voiceflow-envelope";
import { requireEnvelopeResult } from "../validation";
import { asCliError, cliErrorOutput, fail } from "../diagnostics";
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
    "XYOPS_MIGRATION_MODE=workflow starts and observes the migration workflow; events is the compatibility default.",
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type ReadWorkflowDataCandidate = (job: { workflowData?: Record<string, unknown>; data?: unknown }) => unknown;
const readWorkflowDataCandidate: ReadWorkflowDataCandidate = (job) => {
  if (job.workflowData !== undefined) return job.workflowData;
  if (!isRecord(job.data)) return undefined;
  const { voiceflow: _voiceflow, ...workflowData } = job.data;
  return workflowData;
};

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
    if (migrationConfig?.secrets !== undefined &&
      (typeof migrationConfig.secrets === "string" || migrationConfig.secrets.length > 0))
      throw fail("configuration", {
        nextAction:
          "Workflow execution cannot receive secret values until secure secret transport is configured.",
      });
    const execution = await progress.run("execution_workflow", () =>
      runExecutionWorkflow(
        client,
        config.executionWorkflow ?? { title: "Voiceflow Migration Execution Workflow" },
        planned.plan,
      ),
    );
    const executionWorkflowID = execution.jobID;
    const executionJob = execution.job;
    if (executionJob.code !== undefined && executionJob.code !== 0 && executionJob.code !== "0")
      throw fail("job", { nextAction: "The execution workflow failed." });
    console.log(JSON.stringify({
      migrationWorkflow: {
        jobID: workflowJobID,
        stage: planned.stage,
        workflowData: planned,
      },
      executionWorkflow: {
        jobID: executionWorkflowID,
        job: executionJob,
      },
    }));
    return;
  }
  console.log(JSON.stringify({
    migrationWorkflow: {
      jobID: workflowJobID,
      stage: parsedWorkflowData?.success ? parsedWorkflowData.data.stage : undefined,
      workflowData: parsedWorkflowData?.success ? parsedWorkflowData.data : undefined,
    },
  }));
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

  const execute = await progress.run("execute_migration", () =>
    executeConfirmedMigration(
      context,
      selection,
      plan.planID,
      secretFileContents,
    ),
  );
  console.log(
    "\n" +
      JSON.stringify({
        migrationCompleted: true,
        planID: plan.planID,
        exportStatus: execute.exportStatus,
        exportBytes: execute.exportBytes,
        importStatus: execute.importStatus,
        importBytes: execute.importBytes,
        apiKeyRetrieved: execute.apiKeyRetrieved,
      }),
  );
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
  console.error(
    JSON.stringify({ migrationFailed: cliErrorOutput(asCliError(error)) }),
  );
};

if (import.meta.main) {
  run()
    .then(() => undefined)
    .catch(handleFailure);
}
