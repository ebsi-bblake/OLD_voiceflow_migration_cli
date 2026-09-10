import { XYOpsStreamEventType } from "./types";
import { ErrorCode, VoiceflowOperation, WarningCode } from "../voiceflow/types";
import type {
  EventParameterValue,
  ExecuteResult,
  MigrationPlan,
  MigrationSelection,
  NativePluginResponse,
  Option,
  ResponseGuard,
  VoiceflowEnvelope,
  VoiceflowFailure,
  VoiceflowWarning,
  XYOpsJob,
  XYOpsJobResponse,
  XYOpsLaunchResponse,
  XYOpsResponse,
  XYOpsWaitJob,
  XYOpsWaitResponse,
  XYOpsStreamEvent,
} from "./types";

type IsObject = (value: unknown) => value is object;
const isObject: IsObject = (value): value is object =>
  typeof value === "object" && value !== null;

type IsRecord = (value: unknown) => value is Readonly<Record<string, unknown>>;
export const isRecord: IsRecord = (
  value,
): value is Readonly<Record<string, unknown>> =>
  isObject(value) && !Array.isArray(value);

type IsNonEmptyString = (value: unknown) => value is string;
export const isNonEmptyString: IsNonEmptyString = (value): value is string =>
  typeof value === "string" && value.trim().length > 0;

type All = (values: readonly boolean[]) => boolean;
const all: All = (values) => values.every(Boolean);

type RecordCheck = (value: Readonly<Record<string, unknown>>) => boolean;
type SatisfiesRecord = <T>(value: unknown, check: RecordCheck) => value is T;
const satisfiesRecord: SatisfiesRecord = (value, check): value is never =>
  isRecord(value) ? check(value) : false;

type IsOption = (value: unknown) => value is Option;
export const isOption: IsOption = (value) =>
  satisfiesRecord<Option>(value, (record) =>
    all([isNonEmptyString(record.value), isNonEmptyString(record.label)]),
  );

type IsCreatedFolderResult = (
  value: unknown,
) => value is Readonly<{ folder: Option }>;
export const isCreatedFolderResult: IsCreatedFolderResult = (value) =>
  satisfiesRecord<Readonly<{ folder: Option }>>(value, (record) =>
    isOption(record.folder),
  );

type IsOptionResult = (
  value: unknown,
) => value is Readonly<{ options: readonly Option[] }>;
export const isOptionResult: IsOptionResult = (value) =>
  satisfiesRecord<Readonly<{ options: readonly Option[] }>>(
    value,
    (record) => Array.isArray(record.options) && record.options.every(isOption),
  );

type IsXYOpsResponse = (value: unknown) => value is XYOpsResponse;
const hasCode = (value: Readonly<Record<string, unknown>>): boolean =>
  [typeof value.code === "number", typeof value.code === "string"].some(
    Boolean,
  );

const hasJobCodeOrState = (value: Readonly<Record<string, unknown>>): boolean =>
  [hasCode(value), isNonEmptyString(value.state)].some(Boolean);

const hasDescription = (value: Readonly<Record<string, unknown>>): boolean =>
  [!("description" in value), typeof value.description === "string"].some(
    Boolean,
  );

const hasID = (value: Readonly<Record<string, unknown>>): boolean =>
  [!("id" in value), typeof value.id === "string"].some(Boolean);

export const isXYOpsResponse: IsXYOpsResponse = (value) =>
  satisfiesRecord<XYOpsResponse>(value, (record) =>
    all([hasCode(record), hasDescription(record), hasID(record)]),
  );

type IsNativePluginResponse = (value: unknown) => value is NativePluginResponse;
export const isNativePluginResponse: IsNativePluginResponse = (value) =>
  satisfiesRecord<NativePluginResponse>(value, (record) =>
    all([
      record.xy === 1,
      record.complete === true,
      satisfiesRecord<Readonly<{ voiceflow: unknown }>>(
        record.data,
        (data) => "voiceflow" in data,
      ),
    ]),
  );

type IsNativePluginData = (
  value: unknown,
) => value is Readonly<{ voiceflow: unknown }>;
const isNativePluginData: IsNativePluginData = (value) =>
  satisfiesRecord<Readonly<{ voiceflow: unknown }>>(
    value,
    (record) => "voiceflow" in record,
  );

type NormalizeVoiceflowResponse = (value: unknown) => unknown;
const nativeNormalizers: readonly ((value: unknown) => unknown | undefined)[] =
  [
    (value) =>
      isNativePluginResponse(value) ? value.data.voiceflow : undefined,
    (value) => (isNativePluginData(value) ? value.voiceflow : undefined),
  ];

export const normalizeVoiceflowResponse: NormalizeVoiceflowResponse = (value) =>
  nativeNormalizers
    .map((normalize) => normalize(value))
    .find((result) => result !== undefined) ?? value;

type IsXYOpsLaunchResponse = (value: unknown) => value is XYOpsLaunchResponse;
export const isXYOpsLaunchResponse: IsXYOpsLaunchResponse = (value) =>
  satisfiesRecord<XYOpsLaunchResponse>(value, (record) =>
    all([isXYOpsResponse(record), isNonEmptyString(record.id)]),
  );

type IsXYOpsStreamEvent = (value: unknown) => value is XYOpsStreamEvent;
export const isXYOpsStreamEvent: IsXYOpsStreamEvent = (value) =>
  satisfiesRecord<XYOpsStreamEvent>(value, (record) =>
    all([
      typeof record.type === "string" &&
        Object.values(XYOpsStreamEventType).some(
          (type) => type === record.type,
        ),
      isRecord(record.data),
    ]),
  );

type IsJobLaunch = (value: unknown) => value is Readonly<{ id: string }>;
export const isJobLaunch: IsJobLaunch = (value) =>
  satisfiesRecord<Readonly<{ id: string }>>(value, (record) =>
    isNonEmptyString(record.id),
  );

const validCompleted = (value: Readonly<Record<string, unknown>>): boolean =>
  [
    !("completed" in value),
    value.completed === null,
    typeof value.completed === "boolean",
    typeof value.completed === "number",
  ].some(Boolean);

const validOutput = (value: Readonly<Record<string, unknown>>): boolean =>
  [
    !("output" in value),
    value.output === null,
    typeof value.output === "string",
  ].some(Boolean);

type IsXYOpsJob = (value: unknown) => value is XYOpsJob;
export const isXYOpsJob: IsXYOpsJob = (value) =>
  satisfiesRecord<XYOpsJob>(value, (record) =>
    all([
      validCompleted(record),
      hasJobCodeOrState(record),
      hasDescription(record),
      validOutput(record),
    ]),
  );

type IsXYOpsJobResponse = (value: unknown) => value is XYOpsJobResponse;
export const isXYOpsJobResponse: IsXYOpsJobResponse = (value) =>
  satisfiesRecord<XYOpsJobResponse>(value, (record) =>
    all([
      isXYOpsResponse(record),
      satisfiesRecord<XYOpsJob>(record.job, (job) =>
        all([isNonEmptyString(job.id), isXYOpsJob(job)]),
      ),
    ]),
  );

type IsXYOpsWaitJob = (value: unknown) => value is XYOpsWaitJob;
export const isXYOpsWaitJob: IsXYOpsWaitJob = (value) =>
  satisfiesRecord<XYOpsWaitJob>(value, (record) =>
    all([
      isNonEmptyString(record.id),
      hasCode(record),
      hasDescription(record),
      validOutput(record),
      validCompleted(record),
    ]),
  );

type IsXYOpsWaitResponse = (value: unknown) => value is XYOpsWaitResponse;
export const isXYOpsWaitResponse: IsXYOpsWaitResponse = (value) =>
  satisfiesRecord<XYOpsWaitResponse>(value, (record) =>
    all([hasCode(record), hasDescription(record), isXYOpsWaitJob(record.job)]),
  );

const operations = Object.values(VoiceflowOperation);
const errorCodes = Object.values(ErrorCode);
const warningCodes = Object.values(WarningCode);

const isKnownCode = (
  value: unknown,
  codes: readonly string[],
): value is string =>
  typeof value === "string" && codes.some((code) => code === value);

const isWarning = (value: unknown): value is VoiceflowWarning =>
  satisfiesRecord<VoiceflowWarning>(value, (record) =>
    all([
      isKnownCode(record.code, warningCodes),
      isNonEmptyString(record.message),
    ]),
  );

const isFailure = (value: unknown): value is VoiceflowFailure["error"] =>
  satisfiesRecord<VoiceflowFailure["error"]>(value, (record) =>
    all([
      isKnownCode(record.code, errorCodes),
      typeof record.message === "string",
      typeof record.retryable === "boolean",
    ]),
  );

const isSuccessfulEnvelopeBody = <T>(
  record: Readonly<Record<string, unknown>>,
  guard: ResponseGuard<T>,
): boolean =>
  [
    Array.isArray(record.warnings),
    Array.isArray(record.warnings) && record.warnings.every(isWarning),
    guard(record.result),
  ].every(Boolean);

const isRejectedEnvelopeBody = (
  record: Readonly<Record<string, unknown>>,
): boolean => record.ok === false && isFailure(record.error);

const isEnvelopeBody = <T>(
  record: Readonly<Record<string, unknown>>,
  guard: ResponseGuard<T>,
): boolean =>
  record.ok === true
    ? isSuccessfulEnvelopeBody(record, guard)
    : isRejectedEnvelopeBody(record);
const isEnvelopeRecord = <T>(
  record: Readonly<Record<string, unknown>>,
  guard: ResponseGuard<T>,
): boolean =>
  all([
    typeof record.operation === "string" &&
      operations.some((operation) => operation === record.operation),
    isNonEmptyString(record.operationID),
    isEnvelopeBody(record, guard),
  ]);

type IsVoiceflowEnvelope = <T>(
  resultGuard: ResponseGuard<T>,
) => ResponseGuard<VoiceflowEnvelope<T>>;
export const isVoiceflowEnvelope: IsVoiceflowEnvelope =
  <T>(resultGuard: ResponseGuard<T>) =>
  (value): value is VoiceflowEnvelope<T> =>
    satisfiesRecord<VoiceflowEnvelope<T>>(value, (record) =>
      isEnvelopeRecord(record, resultGuard),
    );

type IsCheckSessionResult = (
  value: unknown,
) => value is Readonly<{ active: boolean }>;
export const isCheckSessionResult: IsCheckSessionResult = (value) =>
  satisfiesRecord<Readonly<{ active: boolean }>>(
    value,
    (record) => typeof record.active === "boolean",
  );

const selectionKeys = [
  "sourceWorkspaceID",
  "sourceProjectID",
  "sourceVersionID",
  "destinationWorkspaceID",
  "destinationFolderID",
  "targetSchemaVersion",
] as const;

const isMigrationSelection = (value: unknown): value is MigrationSelection =>
  satisfiesRecord<MigrationSelection>(value, (record) =>
    selectionKeys.every((key) => isNonEmptyString(record[key])),
  );

const labelKeys = [
  "sourceWorkspace",
  "sourceProject",
  "sourceVersion",
  "destinationWorkspace",
  "destinationFolder",
] as const;

type IsMigrationPlan = (value: unknown) => value is MigrationPlan;
export const isMigrationPlan: IsMigrationPlan = (value) =>
  satisfiesRecord<MigrationPlan>(value, (record) =>
    all([
      isNonEmptyString(record.planID),
      isMigrationSelection(record.selection),
      satisfiesRecord<Readonly<Record<string, unknown>>>(
        record.labels,
        (labels) => labelKeys.every((key) => isNonEmptyString(labels[key])),
      ),
    ]),
  );

const numericResultKeys = [
  "exportStatus",
  "exportBytes",
  "importStatus",
  "importBytes",
] as const;

type IsExecuteResult = (value: unknown) => value is ExecuteResult;
export const isExecuteResult: IsExecuteResult = (value) =>
  satisfiesRecord<ExecuteResult>(value, (record) =>
    all([
      isNonEmptyString(record.planID),
      isMigrationSelection(record.selected),
      numericResultKeys.every((key) => typeof record[key] === "number"),
      record.apiKeyRetrieved === undefined ||
        typeof record.apiKeyRetrieved === "boolean",
      satisfiesRecord<Readonly<{ projectID: string }>>(
        record.imported,
        (imported) => isNonEmptyString(imported.projectID),
      ),
    ]),
  );

type IsSecretEntries = (value: unknown) => boolean;
const isSecretEntries: IsSecretEntries = (value) => {
  if (!Array.isArray(value)) return false;
  const names = new Set<string>();
  return value.every((entry) => {
    if (
      !isRecord(entry) ||
      Object.keys(entry).length !== 3 ||
      typeof entry.key !== "string" ||
      typeof entry.value !== "string" ||
      !["projectId", "", "url"].includes(entry.type as string) ||
      names.has(entry.key)
    )
      return false;
    names.add(entry.key);
    return true;
  });
};

const isPrimitiveEventParameter = (value: unknown): value is string | boolean =>
  typeof value === "string" || typeof value === "boolean";

type IsEventParameterEntry = (
  entry: readonly [string, EventParameterValue | undefined],
) => entry is [string, EventParameterValue];
export const isEventParameterEntry: IsEventParameterEntry = (
  entry,
): entry is [string, EventParameterValue] =>
  isPrimitiveEventParameter(entry[1]) || isSecretEntries(entry[1]);

type IsRetryableStatus = (status: number) => boolean;
export const isRetryableStatus: IsRetryableStatus = (status) =>
  [status === 408, status === 429, status >= 500].some(Boolean);

type IsSuccessfulCode = (code: number | string) => boolean;
export const isSuccessfulCode: IsSuccessfulCode = (code) =>
  [0, 200, "0", "200", "OK", "ok"].includes(code);

type IsCompletedJob = (
  completed: boolean | number | null | undefined,
) => boolean;
export const isCompletedJob: IsCompletedJob = (completed) =>
  [completed === true, typeof completed === "number" && completed > 0].some(
    Boolean,
  );

type IsInvalidDuration = (value: number) => boolean;
export const isInvalidDuration: IsInvalidDuration = (value) =>
  [!Number.isFinite(value), value <= 0, value > 3_600_000].some(Boolean);

type IsHTTPURL = (url: URL) => boolean;
export const isHTTPURL: IsHTTPURL = (url) =>
  [url.protocol === "http:", url.protocol === "https:"].some(Boolean);
