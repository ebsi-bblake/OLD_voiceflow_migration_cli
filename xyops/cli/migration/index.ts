#!/usr/bin/env bun
import {
  DEFAULT_XYOPS_BASE_URL,
  readMigrationFileConfig,
  readXYOpsConfig,
  validateMigrationFileConfig,
} from "../config";
import { createXYOpsClient } from "../client";
import { isCheckSessionResult, isVoiceflowEnvelope } from "../guards";
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

type PrintHelp = () => void;
const printHelp: PrintHelp = () => {
  [
    "Usage: voiceflow-cli [--config=<path>] [--debug[=<name[,name...]>]]",
    "Interactively plan and execute a Voiceflow migration through XYOps.",
    `Local configuration: XYOPS_API_KEY=<key> (required), XYOPS_BASE_URL=<url> (default: ${DEFAULT_XYOPS_BASE_URL}).`,
    "Optional --config=<JSON-file> supplies migration resource names or IDs, schema version, and project secrets.",
    'Config format: { "source_workspace": "...", "target_schema_version": "13.1", "secrets": "./secrets.json" }.',
    "Configured IDs or exact catalog names are resolved before planning; missing values are selected interactively.",
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

type PerformMigration = (context: MigrationContext) => Promise<void>;
const performMigration: PerformMigration = async (context) => {
  const { client, config } = context;
  const sessionResponse = await progress.run("check_session", () =>
    client.readEvent(
      config.events.checkSession,
      eventParametersFor("check_session"),
      isVoiceflowEnvelope(isCheckSessionResult),
    ),
  );

  requireActiveSession(
    requireEnvelopeResult(
      sessionResponse,
      "check_session",
      isCheckSessionResult,
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
  console.log("\n" + JSON.stringify({
    migrationCompleted: true,
    planID: plan.planID,
    exportStatus: execute.exportStatus,
    exportBytes: execute.exportBytes,
    importStatus: execute.importStatus,
    importBytes: execute.importBytes,
    apiKeyRetrieved: execute.apiKeyRetrieved,
  }));
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

  validateMigrationFileConfig(migrationConfig);

  const client = createXYOpsClient(config);
  const reader = CreatePromptReader({
    beforeAsk: progress.pause,
    afterAsk: progress.resume,
  });
  try {
    await performMigration({ reader, client, config, migrationConfig });
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
