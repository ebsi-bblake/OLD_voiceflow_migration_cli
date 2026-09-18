import { z } from "zod";
import {
  XYOpsJobResponseSchema,
  XYOpsJobSchema,
  XYOpsLaunchResponseSchema,
  XYOpsResponseSchema,
  XYOpsStreamEventSchema,
  XYOpsWaitJobSchema,
  XYOpsWaitResponseSchema,
  JobLaunchSchema,
  NativePluginDataSchema,
  NativePluginResponseSchema,
} from "./schemas/xyops-responses";
import { createVoiceflowEnvelopeSchemaFromGuard } from "./schemas/voiceflow-envelope";
import {
  CatalogOptionResultSchema,
  CatalogOptionSchema,
  CreatedFolderResultSchema,
} from "./schemas/catalog-results";
import { CheckSessionResultSchema } from "./schemas/session";
import {
  ExecuteResultSchema,
  MigrationPlanSchema,
} from "./schemas/migration-results";
import { SecretEntrySchema } from "../voiceflow/schemas/secret_entry";
import type {
  EventParameterValue,
  ExecuteResult,
  MigrationPlan,
  NativePluginResponse,
  Option,
  ResponseGuard,
  VoiceflowEnvelope,
  XYOpsJob,
  XYOpsJobResponse,
  XYOpsLaunchResponse,
  XYOpsResponse,
  XYOpsWaitJob,
  XYOpsWaitResponse,
  XYOpsStreamEvent,
} from "./types";

type IsNonEmptyString = (value: unknown) => value is string;
const nonEmptyStringSchema = z.string().trim().min(1);
export const isNonEmptyString: IsNonEmptyString = (value): value is string =>
  nonEmptyStringSchema.safeParse(value).success;

type IsOption = (value: unknown) => value is Option;
export const isOption: IsOption = (value): value is Option =>
  CatalogOptionSchema.safeParse(value).success;

type IsCreatedFolderResult = (
  value: unknown,
) => value is Readonly<{ folder: Option }>;
export const isCreatedFolderResult: IsCreatedFolderResult = (
  value,
): value is Readonly<{ folder: Option }> =>
  CreatedFolderResultSchema.safeParse(value).success;

type IsOptionResult = (
  value: unknown,
) => value is Readonly<{ options: readonly Option[] }>;
export const isOptionResult: IsOptionResult = (
  value,
): value is Readonly<{ options: readonly Option[] }> =>
  CatalogOptionResultSchema.safeParse(value).success;

type IsXYOpsResponse = (value: unknown) => value is XYOpsResponse;
export const isXYOpsResponse: IsXYOpsResponse = (
  value,
): value is XYOpsResponse => XYOpsResponseSchema.safeParse(value).success;

type IsNativePluginResponse = (value: unknown) => value is NativePluginResponse;
export const isNativePluginResponse: IsNativePluginResponse = (
  value,
): value is NativePluginResponse =>
  NativePluginResponseSchema.safeParse(value).success;

type IsNativePluginData = (
  value: unknown,
) => value is Readonly<{ voiceflow: unknown }>;
const isNativePluginData: IsNativePluginData = (
  value,
): value is Readonly<{ voiceflow: unknown }> =>
  NativePluginDataSchema.safeParse(value).success;

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
export const isXYOpsLaunchResponse: IsXYOpsLaunchResponse = (
  value,
): value is XYOpsLaunchResponse =>
  XYOpsLaunchResponseSchema.safeParse(value).success;

type IsXYOpsStreamEvent = (value: unknown) => value is XYOpsStreamEvent;
export const isXYOpsStreamEvent: IsXYOpsStreamEvent = (
  value,
): value is XYOpsStreamEvent => XYOpsStreamEventSchema.safeParse(value).success;

type IsJobLaunch = (value: unknown) => value is Readonly<{ id: string }>;
export const isJobLaunch: IsJobLaunch = (
  value,
): value is Readonly<{ id: string }> => JobLaunchSchema.safeParse(value).success;

type IsXYOpsJob = (value: unknown) => value is XYOpsJob;
export const isXYOpsJob: IsXYOpsJob = (value): value is XYOpsJob =>
  XYOpsJobSchema.safeParse(value).success;

type IsXYOpsJobResponse = (value: unknown) => value is XYOpsJobResponse;
export const isXYOpsJobResponse: IsXYOpsJobResponse = (
  value,
): value is XYOpsJobResponse => XYOpsJobResponseSchema.safeParse(value).success;

type IsXYOpsWaitJob = (value: unknown) => value is XYOpsWaitJob;
export const isXYOpsWaitJob: IsXYOpsWaitJob = (
  value,
): value is XYOpsWaitJob => XYOpsWaitJobSchema.safeParse(value).success;

type IsXYOpsWaitResponse = (value: unknown) => value is XYOpsWaitResponse;
export const isXYOpsWaitResponse: IsXYOpsWaitResponse = (
  value,
): value is XYOpsWaitResponse =>
  XYOpsWaitResponseSchema.safeParse(value).success;

type IsVoiceflowEnvelope = <T>(
  resultGuard: ResponseGuard<T>,
) => ResponseGuard<VoiceflowEnvelope<T>>;
export const isVoiceflowEnvelope: IsVoiceflowEnvelope =
  <T>(resultGuard: ResponseGuard<T>) =>
  (value): value is VoiceflowEnvelope<T> =>
    createVoiceflowEnvelopeSchemaFromGuard(resultGuard).safeParse(value).success;

type IsCheckSessionResult = (
  value: unknown,
) => value is Readonly<{ active: boolean }>;
export const isCheckSessionResult: IsCheckSessionResult = (
  value,
): value is Readonly<{ active: boolean }> =>
  CheckSessionResultSchema.safeParse(value).success;

type IsMigrationPlan = (value: unknown) => value is MigrationPlan;
export const isMigrationPlan: IsMigrationPlan = (value): value is MigrationPlan =>
  MigrationPlanSchema.safeParse(value).success;

type IsExecuteResult = (value: unknown) => value is ExecuteResult;
export const isExecuteResult: IsExecuteResult = (value): value is ExecuteResult =>
  ExecuteResultSchema.safeParse(value).success;

type IsSecretEntries = (value: unknown) => boolean;
const isSecretEntries: IsSecretEntries = (value) => {
  if (!Array.isArray(value)) return false;
  const names = new Set<string>();
  return value.every((entry) => {
    const parsed = SecretEntrySchema.safeParse(entry);
    if (!parsed.success || names.has(parsed.data.key)) return false;
    names.add(parsed.data.key);
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
