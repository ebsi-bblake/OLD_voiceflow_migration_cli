import type { AuthContext } from "./types";
import { isRetryableHttpStatus } from "./guards";
import { requestBytes } from "./http";
import { OperationFault } from "./contracts";
import { parseSchemaVersion, parseVersionID } from "./validation";
import { VoiceflowRegex } from "./regex";
import { VOICEFLOW_REALTIME_HTTP_ORIGIN, encodePathSegment } from "./urls";
import type { ExportArtifact } from "./types";
export type { ExportArtifact } from "./types";
const EXPORT_URL = `${VOICEFLOW_REALTIME_HTTP_ORIGIN}/v1alpha1/assistant/export-json`;
type RecordValue = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exportedSchemaMetadata = (value: RecordValue): unknown => {
  if (value._version !== undefined) return value._version;
  if (isRecord(value.version) && value.version._version !== undefined)
    return value.version._version;
  if (isRecord(value.project) && value.project._version !== undefined)
    return value.project._version;
  return undefined;
};

type ReadExportedSchemaVersion = (artifact: ExportArtifact) => string;
/** Reads only version metadata; export content is never included in diagnostics. */
export const readExportedSchemaVersion: ReadExportedSchemaVersion = (
  artifact,
) => {
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(artifact.bytes));
  } catch {
    throw new OperationFault(
      "CONFIGURATION",
      false,
      "exported artifact must contain JSON version metadata with _version in the form major.minor",
    );
  }
  const rawVersion = isRecord(payload)
    ? exportedSchemaMetadata(payload)
    : undefined;
  if (
    typeof rawVersion !== "string" ||
    !VoiceflowRegex.schemaVersion.test(rawVersion.trim())
  )
    throw new OperationFault(
      "CONFIGURATION",
      false,
      "exported artifact must contain JSON version metadata with _version in the form major.minor",
    );
  return parseSchemaVersion(rawVersion);
};

type ResolveTargetSchemaVersion = (
  artifact: ExportArtifact,
  configuredVersion?: string,
) => string;
export const resolveTargetSchemaVersion: ResolveTargetSchemaVersion = (
  artifact,
  configuredVersion,
) => configuredVersion ?? readExportedSchemaVersion(artifact);

type ExportVersion = (
  auth: AuthContext,
  sourceVersionID: string,
) => Promise<ExportArtifact>;
export const exportVersion: ExportVersion = async (auth, sourceVersionID) => {
  const id = parseVersionID(sourceVersionID);
  const response = await requestBytes({
    url: `${EXPORT_URL}/${encodePathSegment(id)}`,
    init: { headers: { Authorization: `Bearer ${auth.token}` } },
    maxBytes: 50_000_000,
    timeoutMs: 30_000,
  });
  validateExportStatus(response.status);
  return {
    status: response.status,
    bytes: response.bytes,
    filename: `voiceflow-${id}.vf`,
    contentType: "application/octet-stream",
  };
};
const validateExportStatus = (status: number): void => {
  if (!isSuccessfulExportStatus(status))
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      isRetryableHttpStatus(status),
    );
};
const isSuccessfulExportStatus = (status: number): boolean =>
  status >= 200 && status < 300;
