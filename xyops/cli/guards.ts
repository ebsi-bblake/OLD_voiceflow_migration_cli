import {
  NativePluginDataSchema,
  NativePluginResponseSchema,
} from "./schemas/xyops-responses";
import { SecretEntryArraySchema } from "../voiceflow/schemas/secret_entry";
import type { EventParameterValue } from "./types";

type NormalizeVoiceflowResponse = (value: unknown) => unknown;
const nativeNormalizers: readonly ((value: unknown) => unknown | undefined)[] =
  [
    (value) => {
      const parsed = NativePluginResponseSchema.safeParse(value);
      return parsed.success ? parsed.data.data.voiceflow : undefined;
    },
    (value) => {
      const parsed = NativePluginDataSchema.safeParse(value);
      return parsed.success ? parsed.data.voiceflow : undefined;
    },
  ];

export const normalizeVoiceflowResponse: NormalizeVoiceflowResponse = (value) =>
  nativeNormalizers
    .map((normalize) => normalize(value))
    .find((result) => result !== undefined) ?? value;

type IsSecretEntries = (value: unknown) => boolean;
const isSecretEntries: IsSecretEntries = (value) =>
  SecretEntryArraySchema.safeParse(value).success;

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
