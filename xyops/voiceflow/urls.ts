import { OperationFault } from "./contracts";
import { VoiceflowRegex } from "./regex";

export const VOICEFLOW_CREATOR_ORIGIN =
  "https://creator.empyrean.voiceflow.com";
export const VOICEFLOW_IDENTITY_ORIGIN =
  "https://identity-api.empyrean.voiceflow.com";
export const VOICEFLOW_REALTIME_HTTP_ORIGIN =
  "https://realtime-http-api.empyrean.voiceflow.com";
export const VOICEFLOW_REALTIME_WEBSOCKET_URL =
  "wss://realtime.empyrean.voiceflow.com/";

type EncodePathSegment = (value: string) => string;
export const encodePathSegment: EncodePathSegment = (value) =>
  encodeURIComponent(value);

type VoiceflowURL = (origin: string, path: string) => string;
export const voiceflowURL: VoiceflowURL = (origin, path) => `${origin}${path}`;

type ParseXYOpsURL = (value: string) => string;
export const parseXYOpsURL: ParseXYOpsURL = (value) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OperationFault("INVALID_ARGUMENT");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new OperationFault("INVALID_ARGUMENT");
  }
  return url.toString().replace(VoiceflowRegex.trailingSlashes, "");
};
