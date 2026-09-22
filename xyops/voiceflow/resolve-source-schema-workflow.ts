import { z } from "zod";
import { MigrationWorkflowDataSchema } from "../migration-workflow-data";
import { exportVersion, readExportedSchemaVersion } from "./export";
import { resolveVoiceflowAuth } from "./auth";
import { failure, OperationFault, success } from "./contracts";
import type { Envelope } from "./types";
import { createUUID } from "./uuid";

type SourceSchemaResolvedResult = Extract<
  Awaited<ReturnType<typeof MigrationWorkflowDataSchema.parse>>,
  { stage: "SOURCE_SCHEMA_RESOLVED" }
>;
type Main = (
  token: string,
  workflowData: unknown,
) => Promise<Envelope<SourceSchemaResolvedResult>>;
const WorkflowEnvelopeSchema = z.looseObject({
  voiceflow: z.looseObject({ result: z.unknown() }),
});
const readWorkflowData = (value: unknown): unknown => {
  const parsed = WorkflowEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.voiceflow.result : value;
};

export const main: Main = async (token, input) => {
  const operationID = createUUID();
  try {
    const parsed = MigrationWorkflowDataSchema.safeParse(readWorkflowData(input));
    if (!parsed.success || parsed.data.stage !== "SOURCE_RESOLVED")
      throw new OperationFault("INVALID_ARGUMENT");
    const auth = await resolveVoiceflowAuth(token);
    const artifact = await exportVersion(auth, parsed.data.selection.sourceVersionID);
    const sourceSchemaVersion = readExportedSchemaVersion(artifact);
    return success("resolve_source_schema_workflow", operationID, {
      schemaVersion: 1,
      stage: "SOURCE_SCHEMA_RESOLVED",
      config: parsed.data.config,
      catalog: parsed.data.catalog,
      sourceSchemaVersion,
      selection: {
        ...parsed.data.selection,
        targetSchemaVersion:
          parsed.data.selection.targetSchemaVersion ?? sourceSchemaVersion,
      },
    });
  } catch (error) {
    return failure("resolve_source_schema_workflow", operationID, error);
  }
};
