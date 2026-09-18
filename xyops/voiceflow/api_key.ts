import type { AuthContext } from "./types";
import { requestBytes } from "./http";
import { VoiceflowRegex } from "./regex";
import { isRecord } from "./guards";
import type { ApiKeyDiagnostic, ApiKeyStatus } from "./types";
import { VOICEFLOW_IDENTITY_ORIGIN, encodePathSegment } from "./urls";
import { OperationFault } from "./contracts";

export type { ApiKeyDiagnostic, ApiKeyStatus } from "./types";

const API_KEY_RETRIEVAL_FAILED: ApiKeyDiagnostic = {
  code: "API_KEY_RETRIEVAL_FAILED",
  message: "Project API key could not be retrieved.",
};
const PROJECT_ID_UNAVAILABLE: ApiKeyDiagnostic = {
  code: "PROJECT_ID_UNAVAILABLE",
  message: "Imported project ID was unavailable.",
};

type SuccessfulApiKeyOutcome = () => ApiKeyStatus;
const successfulApiKeyOutcome: SuccessfulApiKeyOutcome = () => {
  return { apiKeyRetrieved: true };
};

type FailedApiKeyOutcome = (diagnostic: ApiKeyDiagnostic) => ApiKeyStatus;
const failedApiKeyOutcome: FailedApiKeyOutcome = (diagnostic) => {
  return {
    apiKeyRetrieved: false,
    postImport: {
      apiKeyRetrieved: false,
      diagnostic,
    },
  };
};

type MissingProjectApiKeyOutcome = () => ApiKeyStatus;
const missingProjectApiKeyOutcome: MissingProjectApiKeyOutcome = () => {
  return failedApiKeyOutcome(PROJECT_ID_UNAVAILABLE);
};

type FailedApiKeyRetrievalOutcome = () => ApiKeyStatus;
const failedApiKeyRetrievalOutcome: FailedApiKeyRetrievalOutcome = () => {
  return failedApiKeyOutcome(API_KEY_RETRIEVAL_FAILED);
};

type KeyCandidates = (value: unknown) => string[];
const keyCandidates: KeyCandidates = (value) => {
  if (typeof value === "string") return [value.trim()];
  if (Array.isArray(value))
    return value.flatMap((entry) => keyCandidates(entry));
  return recordKeyCandidates(value);
};
const recordKeyCandidates = (value: unknown): string[] => {
  if (!isRecord(value)) return [];
  return keyFields.flatMap((field) => stringValue(value[field]));
};
const keyFields = ["apiKey", "api_key", "key", "token"] as const;
const stringValue = (value: unknown): string[] =>
  typeof value === "string" ? [value.trim()] : [];

type ParseKeys = (bytes: ArrayBuffer) => string[];
const parseKeys: ParseKeys = (bytes) => {
  const text = new TextDecoder().decode(bytes).trim();
  try {
    const value: unknown = JSON.parse(text);
    return keyCandidates(value);
  } catch {
    return keyCandidates(text);
  }
};

type SelectVoiceflowApiKeys = (keys: readonly string[]) => string[];
const selectVoiceflowApiKeys: SelectVoiceflowApiKeys = (keys) =>
  keys.filter((key) => VoiceflowRegex.projectAPIKey.test(key));

type DeduplicateStrings = (values: readonly string[]) => string[];
const deduplicateStrings: DeduplicateStrings = (values) => [...new Set(values)];

type RetrieveProjectApiKey = (
  auth: AuthContext,
  projectID: string,
) => Promise<string>;
export const retrieveProjectApiKey: RetrieveProjectApiKey = async (
  auth,
  projectID,
) => {
  const id = normalizeProjectID(projectID);
  if (!id) throw new OperationFault("DEPENDENCY_FAILURE", true);
  return retrieveValidatedApiKey(auth, id).catch((error: unknown) => {
    if (error instanceof OperationFault) throw error;
    throw new OperationFault("DEPENDENCY_FAILURE", true);
  });
};

type RetrieveApiKeyStatus = (
  auth: AuthContext,
  projectID?: string,
) => Promise<ApiKeyStatus>;
export const retrieveApiKeyStatus: RetrieveApiKeyStatus = async (
  auth,
  projectID,
) => {
  const id = normalizeProjectID(projectID);
  if (!id) return missingProjectApiKeyOutcome();
  return retrieveApiKeyStatusForProject(auth, id);
};
const retrieveApiKeyStatusForProject = async (
  auth: AuthContext,
  id: string,
): Promise<ApiKeyStatus> =>
  retrieveValidatedApiKey(auth, id)
    .then(() => successfulApiKeyOutcome())
    .catch(() => failedApiKeyRetrievalOutcome());
const retrieveValidatedApiKey = async (
  auth: AuthContext,
  id: string,
): Promise<string> => {
  const response = await requestBytes({
    url: `${VOICEFLOW_IDENTITY_ORIGIN}/v1alpha1/api-key/legacy/project/${encodePathSegment(id)}`,
    init: {
      method: "GET",
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${auth.token}`,
      },
      body: null,
    },
    maxBytes: 1_048_576,
    timeoutMs: 30_000,
  });
  const keys = deduplicateStrings(
    selectVoiceflowApiKeys(parseKeys(response.bytes)),
  );
  if (!isSuccessfulStatus(response.status))
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      true,
      `api-key-http-${response.status}-project-${id}`,
    );
  if (!hasApiKey(keys))
    throw new OperationFault(
      "DEPENDENCY_FAILURE",
      true,
      `api-key-response-project-${id}`,
    );
  return keys[0];
};
const normalizeProjectID = (
  projectID: string | undefined,
): string | undefined =>
  projectID === undefined ? undefined : projectID.trim();

const isSuccessfulStatus = (status: number): boolean =>
  status >= 200 && status < 300;
const hasApiKey = (keys: readonly string[]): boolean => keys.length > 0;
