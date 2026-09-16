import { OperationFault } from "./contracts";
import { VoiceflowRegex } from "./regex";

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 256;
const MAX_SCHEMA_LENGTH = 40;
const MAX_OPERATION_LENGTH = 64;

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159);
  });

const hasPathSeparator = (value: string): boolean =>
  VoiceflowRegex.pathSeparator.test(value);

const rejectInvalidString = (value: unknown, maximum: number): string => {
  if (typeof value !== "string") throw new OperationFault("INVALID_ARGUMENT");
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    Array.from(normalized).length > maximum ||
    hasControlCharacter(normalized)
  ) {
    throw new OperationFault("INVALID_ARGUMENT");
  }
  return normalized;
};

const parsePathSafeString = (value: unknown, maximum: number): string => {
  const normalized = rejectInvalidString(value, maximum);
  if (hasPathSeparator(normalized))
    throw new OperationFault("INVALID_ARGUMENT");
  return normalized;
};

type ParseWorkspaceID = (value: unknown) => string;
export const parseWorkspaceID: ParseWorkspaceID = (value) =>
  parsePathSafeString(value, MAX_ID_LENGTH);

type ParseProjectID = (value: unknown) => string;
export const parseProjectID: ParseProjectID = (value) =>
  parsePathSafeString(value, MAX_ID_LENGTH);

type ParseVersionID = (value: unknown) => string;
export const parseVersionID: ParseVersionID = (value) =>
  parsePathSafeString(value, MAX_ID_LENGTH);

type ParseFolderID = (value: unknown) => string;
export const parseFolderID: ParseFolderID = (value) => {
  const normalized = parsePathSafeString(value, MAX_ID_LENGTH);
  if (!VoiceflowRegex.numericID.test(normalized))
    throw new OperationFault("INVALID_ARGUMENT");
  return normalized;
};

type ParseFolderName = (value: unknown) => string;
export const parseFolderName: ParseFolderName = (value) =>
  parsePathSafeString(value, MAX_NAME_LENGTH);

type ParseResourceSelection = (value: unknown) => string;
export const parseResourceSelection: ParseResourceSelection = (value) =>
  parsePathSafeString(value, MAX_NAME_LENGTH);

type ParseCreatorID = (value: unknown) => string;
export const parseCreatorID: ParseCreatorID = (value) =>
  parsePathSafeString(value, MAX_ID_LENGTH);

type ParseSchemaVersion = (value: unknown) => string;
export const parseSchemaVersion: ParseSchemaVersion = (value) =>
  rejectInvalidString(value, MAX_SCHEMA_LENGTH);

const operations = new Set([
  "check_session",
  "list_workspaces",
  "list_projects",
  "list_versions",
  "list_folders",
  "create_folder",
  "plan_migration",
  "execute_migration",
]);

type ParseEventOperation = (value: unknown) => string;
export const parseEventOperation: ParseEventOperation = (value) => {
  const normalized = rejectInvalidString(value, MAX_OPERATION_LENGTH);
  if (!operations.has(normalized)) throw new OperationFault("INVALID_ARGUMENT");
  return normalized;
};

type RequireVoiceflowString = (value: unknown) => string;
export const requireVoiceflowString: RequireVoiceflowString = (value) =>
  rejectInvalidString(value, MAX_ID_LENGTH);
