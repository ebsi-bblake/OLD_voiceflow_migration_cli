import { isNumericFolderID, isRawRow } from "../guards";
import type {
  EnvironmentRecord,
  FolderRecord,
  ProjectRecord,
  WorkspaceRecord,
} from "../types";

export type RawCatalogRow = Readonly<Record<string, unknown>>;
export type CatalogParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: "invalid-row" };

type VersionField = "draftVersionID" | "publishedVersionID";
type ProjectRows = <T>(
  parser: (value: unknown) => CatalogParseResult<T>,
) => (rows: readonly unknown[]) => readonly T[];

const invalidRow: CatalogParseResult<never> = {
  ok: false,
  reason: "invalid-row",
};

const validRow = <T>(value: T): CatalogParseResult<T> => ({ ok: true, value });

// Runtime validation intentionally handles multiple external representations.
const isIDValue = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";
const normalizeOptionalID = (value: unknown): string | undefined =>
  isIDValue(value) ? nonEmptyID(String(value).trim()) : undefined;
const nonEmptyID = (value: string): string | undefined =>
  value === "" ? undefined : value;

const readID = (row: RawCatalogRow): string | undefined =>
  normalizeOptionalID(row.id ?? row._id);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

// Voiceflow has historically emitted several label aliases.
const readLabel = (row: RawCatalogRow, fallback: string): string => {
  const candidate = [row.name, row.title, row.label].find(isNonEmptyString);
  return candidate === undefined ? fallback : candidate.trim();
};

// Catalog environments arrive as either arrays or keyed objects.
const readEnvironmentRows = (value: unknown): readonly RawCatalogRow[] =>
  Array.isArray(value) ? value.filter(isRawRow) : readObjectEnvironmentRows(value);
const readObjectEnvironmentRows = (value: unknown): readonly RawCatalogRow[] =>
  isRawRow(value) ? Object.values(value).filter(isRawRow) : [];

const isVersionValue = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";

const readOptionalVersion = (
  key: VersionField,
  value: unknown,
): Partial<EnvironmentRecord> =>
  isVersionValue(value) ? { [key]: String(value) } : {};

const readEnvironment = (row: RawCatalogRow): EnvironmentRecord => ({
  label: readLabel(row, "Environment"),
  ...readOptionalVersion("draftVersionID", row.draftVersionID),
  ...readOptionalVersion("publishedVersionID", row.publishedVersionID),
});

const readEnvironments = (value: unknown): readonly EnvironmentRecord[] =>
  readEnvironmentRows(value).map(readEnvironment);

type ParseWorkspace = (value: unknown) => CatalogParseResult<WorkspaceRecord>;
// Runtime validation establishes the WorkspaceRecord contract before catalog options are built.
export const parseWorkspace: ParseWorkspace = (value) =>
  isRawRow(value) ? parseWorkspaceRow(value) : invalidRow;
const parseWorkspaceRow = (value: RawCatalogRow): CatalogParseResult<WorkspaceRecord> => {
  const id = readID(value);
  return id === undefined ? invalidRow : validRow({ id, label: readLabel(value, id) });
};

const parseProject: (value: unknown) => CatalogParseResult<ProjectRecord> = (
  value,
) => {
  return isRawRow(value) ? parseProjectRow(value) : invalidRow;
};
const parseProjectRow = (value: RawCatalogRow): CatalogParseResult<ProjectRecord> => {
  const identity = projectIdentity(readID(value), normalizeOptionalID(value.workspaceID));
  if (identity === undefined) return invalidRow;
  return validRow({
    id: identity.id,
    label: readLabel(value, identity.id),
    workspaceID: identity.workspaceID,
    environments: readEnvironments(value.environments),
  });
};
type ProjectIdentity = Readonly<{ id: string; workspaceID: string }>;
const projectIdentity = (
  id: string | undefined,
  workspaceID: string | undefined,
): ProjectIdentity | undefined =>
  id === undefined ? undefined : withProjectWorkspace(id, workspaceID);
const withProjectWorkspace = (
  id: string,
  workspaceID: string | undefined,
): ProjectIdentity | undefined =>
  workspaceID === undefined ? undefined : { id, workspaceID };

const parseFolder: (value: unknown) => CatalogParseResult<FolderRecord> = (
  value,
) => {
  return isRawRow(value) ? parseFolderRow(value) : invalidRow;
};
const parseFolderRow = (value: RawCatalogRow): CatalogParseResult<FolderRecord> => {
  const id = readID(value);
  const workspaceID = normalizeOptionalID(value.workspaceID);
  const identity = folderIdentity(id, workspaceID);
  if (identity === undefined) return invalidRow;
  return validRow({
    id: identity.id,
    label: readLabel(value, identity.id),
    workspaceID: identity.workspaceID,
  });
};
type FolderIdentity = Readonly<{ id: string; workspaceID: string }>;
const folderIdentity = (
  id: string | undefined,
  workspaceID: string | undefined,
): FolderIdentity | undefined =>
  id === undefined ? undefined : numericFolderIdentity(id, workspaceID);
const numericFolderIdentity = (
  id: string,
  workspaceID: string | undefined,
): FolderIdentity | undefined =>
  isNumericFolderID(id) ? withFolderWorkspace(id, workspaceID) : undefined;
const withFolderWorkspace = (
  id: string,
  workspaceID: string | undefined,
): FolderIdentity | undefined =>
  workspaceID === undefined ? undefined : { id, workspaceID };

export const projectRows: ProjectRows = (parser) => (rows) =>
  rows.flatMap((row) => {
    const result = parser(row);
    return result.ok ? [result.value] : [];
  });

export { parseFolder, parseProject };
