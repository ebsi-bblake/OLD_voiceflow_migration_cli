import { resolveVoiceflowAuth } from "./auth";
import { failure, success, OperationFault } from "./contracts";
import { requestBytes } from "./http";
import { isRetryableHttpStatus } from "./guards";
import type { Envelope, HttpBytes } from "./types";
import { createUUID } from "./uuid";
import { VOICEFLOW_CREATOR_ORIGIN, VOICEFLOW_IDENTITY_ORIGIN } from "./urls";

type CheckSessionResult = {
  active: boolean;
  loginRequired?: boolean;
  loginUrl?: string;
};

type SessionResult = (response: HttpBytes) => CheckSessionResult;
const sessionResult: SessionResult = (response) => {
  if (loginRequiredStatus.has(response.status)) {
    return {
      active: false,
      loginRequired: true,
      loginUrl: `${VOICEFLOW_CREATOR_ORIGIN}/`,
    };
  }
  return successfulSessionResult(response.status);
};
const successfulSessionResult = (status: number): CheckSessionResult => {
  if (!isSuccessfulStatus(status)) throw dependencyFault(status);
  return { active: true };
};
const loginRequiredStatus = new Set([401, 403]);
const isSuccessfulStatus = (status: number): boolean =>
  status >= 200 && status < 300;
const dependencyFault = (status: number): OperationFault =>
  new OperationFault("DEPENDENCY_FAILURE", isRetryableHttpStatus(status));

type Main = (token: string) => Promise<Envelope<CheckSessionResult>>;
export const main: Main = async (token) => {
  const operation = "check_session";
  const id = createUUID();
  try {
    const auth = await resolveVoiceflowAuth(token);
    const response = await requestBytes({
      url: `${VOICEFLOW_IDENTITY_ORIGIN}/v1alpha1/user`,
      init: { headers: { Authorization: `Bearer ${auth.token}` } },
      maxBytes: 65536,
      timeoutMs: 15000,
    });
    return success(operation, id, sessionResult(response));
  } catch (error) {
    return failure(operation, id, error);
  }
};
