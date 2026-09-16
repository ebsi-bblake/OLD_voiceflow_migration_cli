import type { AuthContext } from "../types";
import type { ExportArtifact, HttpBytes, ImportedReceipt } from "../types";
import { resolveTargetSchemaVersion } from "../export";
import { OperationFault } from "../contracts";
import { requestBytes } from "../http";
import { parseSchemaVersion, parseWorkspaceID } from "../validation";
import { VOICEFLOW_REALTIME_HTTP_ORIGIN, encodePathSegment } from "../urls";
import { isImportOutcomeUnknownStatus } from "../guards";
export { isImportOutcomeUnknownStatus } from "../guards";

import { receipt, requiredFolderID, validFilename } from "./input";

type ImportVersion = (
  auth: AuthContext,
  artifact: ExportArtifact,
  destinationWorkspaceID: string,
  destinationFolderID: string,
  targetSchemaVersion?: string,
) => Promise<ImportedReceipt>;
export const importVersion: ImportVersion = async (
  auth,
  artifact,
  destinationWorkspaceID,
  destinationFolderID,
  targetSchemaVersion,
) => {
  const input = importInput(
    destinationWorkspaceID,
    destinationFolderID,
    targetSchemaVersion,
    artifact,
  );
  const form = new FormData();
  form.append(
    "file",
    new Blob([artifact.bytes], { type: "application/octet-stream" }),
    validFilename(artifact.filename),
  );
  form.append("targetSchemaVersion", input.schema);
  form.append("folderID", input.folder);
  const response = await requestImportResponse(auth, input.workspace, form);
  return parseImportResponse(response, artifact.bytes.byteLength);
};

type ImportInput = {
  readonly workspace: string;
  readonly folder: string;
  readonly schema: string;
};
type ImportInputFactory = (
  workspace: string,
  folder: string,
  schema: string | undefined,
  artifact: ExportArtifact,
) => ImportInput;
const importInput: ImportInputFactory = (
  workspace,
  folder,
  schema,
  artifact,
) => {
  const normalizedWorkspace = parseWorkspaceID(workspace);
  validateArtifactSize(artifact);
  return {
    workspace: normalizedWorkspace,
    folder: requiredFolderID(folder),
    schema: parseSchemaVersion(resolveTargetSchemaVersion(artifact, schema)),
  };
};

const validateArtifactSize = (artifact: ExportArtifact): void => {
  if (artifact.bytes.byteLength > 50_000_000)
    throw new OperationFault("INVALID_ARGUMENT");
};

type RequestImportResponse = (
  auth: AuthContext,
  workspace: string,
  form: FormData,
) => Promise<HttpBytes>;
const requestImportResponse: RequestImportResponse = async (
  auth,
  workspace,
  form,
) => {
  try {
    return await requestBytes({
      url: `${VOICEFLOW_REALTIME_HTTP_ORIGIN}/v1alpha1/assistant/import-file/${encodePathSegment(workspace)}`,
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: form,
      },
      maxBytes: 2_097_152,
      timeoutMs: 60_000,
    });
  } catch (error) {
    throw importRequestFault(error);
  }
};

type ImportRequestFault = (error: unknown) => OperationFault | unknown;
const importRequestFault: ImportRequestFault = (error) =>
  isUnknownImportDependency(error)
    ? new OperationFault("IMPORT_OUTCOME_UNKNOWN")
    : error;
const isUnknownImportDependency = (error: unknown): error is OperationFault => {
  if (!(error instanceof OperationFault)) return false;
  return ["DEPENDENCY_TIMEOUT", "DEPENDENCY_FAILURE"].includes(error.code);
};

type ParseImportResponse = (
  response: HttpBytes,
  bytes: number,
) => ImportedReceipt;
const parseImportResponse: ParseImportResponse = (response, bytes) => {
  validateImportStatus(response.status);
  return receipt(parseImportBody(response.bytes), response.status, bytes);
};

const validateImportStatus = (status: number): void => {
  if (isImportOutcomeUnknownStatus(status))
    throw new OperationFault("IMPORT_OUTCOME_UNKNOWN");
  ensureSuccessfulStatus(status);
};

const ensureSuccessfulStatus = (status: number): void => {
  if (!isSuccessfulStatus(status))
    throw new OperationFault("DEPENDENCY_FAILURE");
};

const isSuccessfulStatus = (status: number): boolean =>
  status >= 200 && status < 300;
const parseImportBody = (bytes: ArrayBuffer): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new OperationFault("IMPORT_OUTCOME_UNKNOWN");
  }
};
