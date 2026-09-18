export type LoguxFrame = readonly unknown[];
export type TraceFields = Readonly<Record<string, unknown>>;

import { LoguxFrameSchema } from "./schemas/frame";
import { LoguxActionSchema } from "./schemas/action";
import { isRecord } from "../guards";

export type SecretFailureCause = Readonly<{
  kind: "dependency-failure";
  code: "dependency-failed";
}>;

// This boundary validates the BDD18 tuple shape and the shared action envelope.
// Operation-specific action payload semantics remain owned by each consumer.
type ParseLoguxFrame = (text: string) => LoguxFrame | undefined;
export const parseLoguxFrame: ParseLoguxFrame = (text) => {
  try {
    const value: unknown = JSON.parse(text);
    const parsed = LoguxFrameSchema.safeParse(value);
    if (!parsed.success) return undefined;
    if (
      parsed.data[0] === "sync" &&
      !LoguxActionSchema.safeParse(parsed.data[2]).success
    )
      return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
};

type SummarizeLoguxAction = (frame: LoguxFrame) => TraceFields;
export const summarizeLoguxAction: SummarizeLoguxAction = (frame) => {
  const action = readAction(frame);
  if (action === undefined) return {};
  const meta = isRecord(action.meta) ? action.meta : {};
  return {
    actionType: typeof action.type === "string" ? action.type : undefined,
    actionID: typeof meta.actionID === "string" ? meta.actionID : undefined,
    processedID: typeof action.id === "string" ? action.id : undefined,
  };
};

type SummarizeSecretFailureFrame = (frame: LoguxFrame) => TraceFields;
export const summarizeSecretFailureFrame: SummarizeSecretFailureFrame = (
  frame,
) => {
  if (!isSecretFailureAction(frame)) return {};
  const failureCause: SecretFailureCause = {
    kind: "dependency-failure",
    code: "dependency-failed",
  };
  return { failureCause };
};

type IsSubscriptionComplete = (frame: LoguxFrame, syncID: number) => boolean;
export const isSubscriptionComplete: IsSubscriptionComplete = (frame, syncID) =>
  frame[0] === "synced" && frame[1] === syncID;

type IsSecretFailure = (frame: LoguxFrame, actionID: string) => boolean;
export const isSecretFailure: IsSecretFailure = (frame, actionID) => {
  if (!isSecretFailureAction(frame)) return false;
  const action = frame[2];
  if (!isRecord(action)) return false;
  const meta = action.meta;
  return isRecord(meta) && meta.actionID === actionID;
};

type IsSecretCompletion = (
  frame: LoguxFrame,
  actionID: string,
  assistantID: string,
) => boolean;
export const isSecretCompletion: IsSecretCompletion = (
  frame,
  actionID,
  assistantID,
) => {
  if (frame[0] !== "sync") return false;
  const action = readAction(frame);
  if (action?.type !== "secret.CREATE_ONE_DONE") return false;
  return hasActionID(action, actionID) && hasAssistantID(action, assistantID);
};

const isSecretFailureAction = (frame: LoguxFrame): boolean => {
  if (frame[0] !== "sync") return false;
  return readAction(frame)?.type === "secret.CREATE_ONE_FAILED";
};

const readAction = (frame: LoguxFrame): Record<string, unknown> | undefined => {
  const parsed = LoguxActionSchema.safeParse(frame[2]);
  return parsed.success ? parsed.data : undefined;
};

const hasActionID = (
  action: Record<string, unknown>,
  actionID: string,
): boolean => {
  const meta = action.meta;
  return isRecord(meta) && meta.actionID === actionID;
};

const hasAssistantID = (
  action: Record<string, unknown>,
  assistantID: string,
): boolean => {
  const payload = action.payload;
  if (!isRecord(payload) || !isRecord(payload.result)) return false;
  const context = payload.result.context;
  return isRecord(context) && context.assistantID === assistantID;
};
