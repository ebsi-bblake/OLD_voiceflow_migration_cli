import { OperationFault } from "../contracts";
import { VoiceflowRegex } from "../regex";
import { parseFolderID } from "../validation";
import { ImportedReceiptSchema } from "./schemas/receipt";
import type { ImportedReceipt } from "../types";

type RecordValue = Readonly<Record<string, unknown>>;

type RequiredFolderID = (value: unknown) => string;
export const requiredFolderID: RequiredFolderID = (value) => {
  return parseFolderID(value);
};

type ValidFilename = (value: string) => string;
export const validFilename: ValidFilename = (value) => {
  const name = value.trim();
  if (!isSafeFilename(name)) throw new OperationFault("INVALID_ARGUMENT");
  return name;
};

const isSafeFilename = (value: string): boolean => {
  if (!VoiceflowRegex.filename.test(value)) return false;
  return !value.includes("..");
};

type PrimitiveID = (value: unknown) => string | undefined;
const primitiveID: PrimitiveID = (value) => {
  if (!isPrimitiveID(value)) return undefined;
  const id = String(value).trim();
  return nonEmptyID(id);
};
const nonEmptyID = (id: string): string | undefined =>
  id === "" ? undefined : id;
const isPrimitiveID = (value: unknown): value is string | number => {
  if (typeof value === "string") return true;
  return typeof value === "number";
};

type NestedProjectID = (row: RecordValue) => string | undefined;
const nestedProjectID: NestedProjectID = (row) => {
  const project = row.project;
  if (project === null || typeof project !== "object") return undefined;
  return primitiveID(Reflect.get(project, "_id"));
};

type Receipt = (
  value: unknown,
  status: number,
  bytes: number,
) => ImportedReceipt;
export const receipt: Receipt = (value, status, bytes) => {
  const parsed = ImportedReceiptSchema.safeParse(value);
  if (!parsed.success) throw new OperationFault("IMPORT_OUTCOME_UNKNOWN");
  return receiptFromRecord(parsed.data, status, bytes);
};

const receiptFromRecord = (
  value: RecordValue,
  status: number,
  bytes: number,
): ImportedReceipt => {
  const projectID = projectIDFromRecord(value);
  if (projectID === undefined)
    throw new OperationFault("IMPORT_OUTCOME_UNKNOWN");
  return {
    importStatus: status,
    importBytes: bytes,
    projectID,
    ...optionalReceiptField("assistantID", primitiveID(value.assistantID)),
    ...optionalReceiptField("versionID", versionIDFromRecord(value)),
    ...optionalReceiptField("workspaceID", primitiveID(value.workspaceID)),
    ...optionalReceiptField("folderID", primitiveID(value.folderID)),
  };
};

const versionIDFromRecord = (value: RecordValue): string | undefined => {
  const version = value.version;
  const nestedVersionID =
    version !== null && typeof version === "object"
      ? primitiveID(Reflect.get(version, "_id"))
      : undefined;
  return primitiveID(value.versionID) ?? primitiveID(value.environmentID) ?? nestedVersionID;
};
const optionalReceiptField = <K extends "assistantID" | "versionID" | "workspaceID" | "folderID">(
  key: K,
  value: string | undefined,
): Partial<Record<K, string>> => (value === undefined ? {} : { [key]: value } as Partial<Record<K, string>>);

const projectIDFromRecord = (value: RecordValue): string | undefined =>
  firstProjectID(value) ?? nestedProjectID(value);

export const firstProjectID = (value: RecordValue): string | undefined =>
  [value.projectID, value.projectId, value.id]
    .map(primitiveID)
    .find((id) => id !== undefined);
