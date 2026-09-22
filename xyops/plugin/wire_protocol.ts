import { PLUGIN_VERSION } from "./version";
import { PluginValidationFault } from "./validation_fault";
import type { XYOpsPluginResponse, VoiceflowEnvelope } from "./types";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { XYOpsPluginResponseSchema } from "./schemas/plugin_response";

type ValidatePluginResponse = (
  value: XYOpsPluginResponse,
) => XYOpsPluginResponse;
const validatePluginResponse: ValidatePluginResponse = (value) => {
  const parsed = XYOpsPluginResponseSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("The plugin produced an invalid response.");
  return value;
};

type MapVoiceflowEnvelope = (
  envelope: VoiceflowEnvelope,
) => XYOpsPluginResponse;
// eslint-disable-next-line complexity
export const mapVoiceflowEnvelope: MapVoiceflowEnvelope = (envelope) => {
  if (envelope.ok) {
    const workflowData =
      envelope.operation === "initialize_migration_workflow" ||
      envelope.operation === "initialize_execution_workflow" ||
      envelope.operation === "execute_migration_workflow" ||
      envelope.operation === "check_session_workflow" ||
      envelope.operation === "load_workspaces" ||
      envelope.operation === "load_source_catalog" ||
      envelope.operation === "resolve_source_selection" ||
      envelope.operation === "resolve_source_schema_workflow" ||
      envelope.operation === "load_destination_catalog" ||
      envelope.operation === "resolve_destination_selection" ||
      envelope.operation === "plan_migration_workflow" ||
      envelope.operation === "create_folder_workflow"
        ? MigrationWorkflowDataSchema.safeParse(envelope.result)
        : undefined;
    return validatePluginResponse({
      xy: 1,
      data: { voiceflow: envelope },
      ...(workflowData?.success ? { workflowData: workflowData.data } : {}),
      complete: true,
      code: 0,
    });
  }
  return validatePluginResponse({
    xy: 1,
    data: { voiceflow: envelope },
    complete: true,
    code: envelope.error.code,
    description: `[pluginVersion=${PLUGIN_VERSION}] ${envelope.error.message} (code=${envelope.error.code})`,
  });
};

type CreateProtocolFailure = (
  code: string,
  description: string,
  envelope?: VoiceflowEnvelope,
) => XYOpsPluginResponse;
export const createProtocolFailure: CreateProtocolFailure = (
  code,
  description,
  envelope,
) =>
  validatePluginResponse({
    xy: 1,
    ...(envelope === undefined ? {} : { data: { voiceflow: envelope } }),
    complete: true,
    code,
    description,
  });

type AppendPluginDiagnostic = (
  description: string,
  diagnostic?: string,
) => string;
const appendPluginDiagnostic: AppendPluginDiagnostic = (
  description,
  diagnostic,
) =>
  diagnostic === undefined ? description : `${description} [${diagnostic}]`;

type MapPluginError = (
  error: unknown,
  diagnostic?: string,
) => XYOpsPluginResponse;
export const mapPluginError: MapPluginError = (error, diagnostic) => {
  if (error instanceof PluginValidationFault) {
    return createProtocolFailure(
      error.code,
      appendPluginDiagnostic(error.message, diagnostic),
    );
  }
  return createProtocolFailure(
    "PLUGIN_FAILURE",
    appendPluginDiagnostic(
      "The Voiceflow plugin could not complete the request.",
      diagnostic,
    ),
  );
};
