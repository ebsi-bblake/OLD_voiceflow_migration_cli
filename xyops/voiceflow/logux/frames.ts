import { OperationFault } from "../contracts";
import { isObject, isRowArray } from "../guards";

type Row = Readonly<Record<string, unknown>>;
const MAX_INCOMING_ROWS = 100_000;

type IncomingContext = {
  incomingBytes: number;
  maxFrameBytes: number;
  maxBytes: number;
  onBytes: (bytes: number) => void;
  settle: (error?: OperationFault) => void;
  handleFrame: (frame: readonly unknown[]) => void;
};
type TextMessageEvent = MessageEvent & { readonly data: string };
const isTextMessage = (event: MessageEvent): event is TextMessageEvent =>
  typeof event.data === "string";
export const handleIncomingMessage = (
  event: MessageEvent,
  context: IncomingContext,
): void => {
  if (!isTextMessage(event)) return;
  handleTextMessage(event.data, context);
};
const handleTextMessage = (data: string, context: IncomingContext): void => {
  const frameBytes = new TextEncoder().encode(data).byteLength;
  const incomingBytes = context.incomingBytes + frameBytes;
  context.onBytes(incomingBytes);
  if (frameTooLarge(frameBytes, incomingBytes, context))
    return void settleOversizedFrame(context);
  handleParsedFrame(parseFrame(data), context);
};
const settleOversizedFrame = (context: IncomingContext): void =>
  context.settle(new OperationFault("DEPENDENCY_FAILURE"));
const handleParsedFrame = (
  frame: readonly unknown[] | undefined,
  context: IncomingContext,
): void => {
  if (frame) context.handleFrame(frame);
};
const frameTooLarge = (
  frameBytes: number,
  incomingBytes: number,
  context: IncomingContext,
): boolean =>
  frameBytes > context.maxFrameBytes || incomingBytes > context.maxBytes;
const parseFrame = (data: string): readonly unknown[] | undefined => {
  const frame = parseJSON(data);
  return Array.isArray(frame) ? frame : undefined;
};
const parseJSON = (data: string): unknown => {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};
type FrameHandler = (frame: readonly unknown[], context: FrameContext) => void;
type FrameContext = {
  channel: string;
  requestID: number;
  nextActionID: () => number;
  nextActionTime: () => number;
  safeSend: (frame: readonly unknown[]) => void;
  settle: (error?: OperationFault) => void;
};
const frameHandlers: Readonly<Record<string, FrameHandler>> = {
  error: (frame, context) => handleErrorFrame(frame, context.settle),
  connected: (_frame, context) =>
    context.safeSend([
      "sync",
      context.requestID,
      {
        channel: context.channel,
        type: "logux/subscribe",
        since: { id: "0", time: 0 },
      },
      { id: context.nextActionID(), time: context.nextActionTime() },
    ]),
};
export const handleFrame = (
  frame: readonly unknown[],
  channel: string,
  requestID: number,
  wantedSet: Set<string>,
  seen: Set<string>,
  rows: Row[],
  nextActionID: () => number,
  nextActionTime: () => number,
  safeSend: (frame: readonly unknown[]) => void,
  settle: (error?: OperationFault) => void,
): void => {
  const frameType = frame[0];
  const special =
    typeof frameType === "string" ? frameHandlers[frameType] : undefined;
  return dispatchFrame(
    special,
    frame,
    { channel, requestID, nextActionID, nextActionTime, safeSend, settle },
    () => handleActionFrame(frame, wantedSet, seen, rows, settle),
  );
};
const dispatchFrame = (
  special: FrameHandler | undefined,
  frame: readonly unknown[],
  context: FrameContext,
  fallback: () => void,
): void => {
  if (special) return special(frame, context);
  fallback();
};
const handleErrorFrame = (
  frame: readonly unknown[],
  settle: (error?: OperationFault) => void,
): void => settle(new OperationFault(errorCodeForFrame(frame)));
const errorCodeForFrame = (
  frame: readonly unknown[],
): "AUTHENTICATION_FAILED" | "DEPENDENCY_FAILURE" =>
  frame[1] === "wrong-credentials"
    ? "AUTHENTICATION_FAILED"
    : "DEPENDENCY_FAILURE";
const handleActionFrame = (
  frame: readonly unknown[],
  wantedSet: Set<string>,
  seen: Set<string>,
  rows: Row[],
  settle: (error?: OperationFault) => void,
): void => {
  const action = parseActionFrame(frame, wantedSet);
  return dispatchAction(action, rows, wantedSet, seen, settle);
};
type ParsedAction = { type: string; values: readonly Row[] };
const parseActionFrame = (
  frame: readonly unknown[],
  wantedSet: Set<string>,
): ParsedAction | undefined => {
  const action = readFrameAction(frame);
  const payload = readActionPayload(action);
  const type = readWantedActionType(action, wantedSet);
  if (!type) return undefined;
  const values = readActionValues(payload);
  return parsedAction(type, values);
};
const readFrameAction = (
  frame: readonly unknown[],
): Readonly<Record<string, unknown>> | undefined =>
  isObject(frame[2]) ? frame[2] : undefined;
const readActionPayload = (
  action: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> | undefined => {
  if (action === undefined) return undefined;
  return objectPayload(action.payload);
};
const objectPayload = (
  payload: unknown,
): Readonly<Record<string, unknown>> | undefined =>
  [payload].filter(isObject)[0];
const readWantedActionType = (
  action: Readonly<Record<string, unknown>> | undefined,
  wantedSet: Set<string>,
): string | undefined =>
  [action?.type].filter(isString).find((value) => wantedSet.has(value));
const readActionValues = (
  payload: Readonly<Record<string, unknown>> | undefined,
): unknown =>
  [payload]
    .filter(isObject)
    .flatMap((value) => [value.values, value.data])
    .find(isDefined);
const isDefined = (value: unknown): boolean => value !== undefined;
const parsedAction = (
  type: string,
  values: unknown,
): ParsedAction | undefined => {
  if (!isRowArray(values)) return undefined;
  return { type, values };
};
const dispatchAction = (
  action: ParsedAction | undefined,
  rows: Row[],
  wantedSet: Set<string>,
  seen: Set<string>,
  settle: (error?: OperationFault) => void,
): void => {
  if (!action) return;
  return appendAction(action, rows, wantedSet, seen, settle);
};
const appendAction = (
  action: ParsedAction,
  rows: Row[],
  wantedSet: Set<string>,
  seen: Set<string>,
  settle: (error?: OperationFault) => void,
): void => {
  if (rowsExceedLimit(rows, action.values))
    return void settle(new OperationFault("DEPENDENCY_FAILURE"));
  seen.add(action.type);
  rows.push(...action.values);
  completeIfAllTypesSeen(wantedSet, seen, settle);
};
const completeIfAllTypesSeen = (
  wantedSet: Set<string>,
  seen: Set<string>,
  settle: (error?: OperationFault) => void,
): void => {
  if (hasSeenAllWantedTypes(wantedSet, seen)) settle();
};
const isString = (value: unknown): value is string => typeof value === "string";
const rowsExceedLimit = (
  rows: readonly Row[],
  values: readonly Row[],
): boolean => rows.length + values.length > MAX_INCOMING_ROWS;
const hasSeenAllWantedTypes = (
  wantedSet: Set<string>,
  seen: Set<string>,
): boolean => [...wantedSet].every((wantedType) => seen.has(wantedType));
