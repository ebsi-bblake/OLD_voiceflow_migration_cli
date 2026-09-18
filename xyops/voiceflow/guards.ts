/** Pure Voiceflow boundary guards shared by the active runtime modules. */
import { VoiceflowRegex } from "./regex";

export type RecordValue = Readonly<Record<string, unknown>>;

const isNonNullObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;
/**
 * Generic traversal guard for unowned JSON fragments. Domain records must be
 * parsed by their owning Zod schema before they reach domain policy code.
 */
export const isRecord = (value: unknown): value is RecordValue =>
  isNonNullObject(value) && !Array.isArray(value);
export const isNumericFolderID = (id: string): boolean =>
  VoiceflowRegex.numericID.test(id);
const isServerErrorStatus = (status: number): boolean =>
  status >= 500 && status < 600;
const isRetryableStatusCode = (status: number): boolean =>
  status === 408 || status === 429;
export const isRetryableHttpStatus = (status: number): boolean =>
  isRetryableStatusCode(status) || isServerErrorStatus(status);
const isUnrecognizedStatus = (status: number): boolean => status >= 600;
export const isImportOutcomeUnknownStatus = (status: number): boolean =>
  [isRetryableHttpStatus(status), isUnrecognizedStatus(status)].some(Boolean);
export const isConfirmationGranted = (confirmed: unknown): confirmed is true =>
  confirmed === true;

const isControlCode = (code: number): boolean =>
  code <= 31 || isC1ControlCode(code);
const isC1ControlCode = (code: number): boolean => code >= 127 && code <= 159;
const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => isControlCode(character.charCodeAt(0)));
const hasPathSeparator = (value: string): boolean =>
  VoiceflowRegex.pathSeparator.test(value);
export const isValidCreatorID = (value: string): boolean => {
  const creatorID = value.trim();
  return [
    creatorID.length > 0,
    Array.from(creatorID).length <= 128,
    !hasControlCharacter(value),
    !hasPathSeparator(value),
  ].every(Boolean);
};
