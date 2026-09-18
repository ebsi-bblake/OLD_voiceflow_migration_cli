import { z } from "zod";
import type {
  AuthContext,
  ConfigSecret,
  ExistingSecret,
  FolderRecord,
  ProjectRecord,
  SecretEntry,
} from "./types";
import { retrieveProjectApiKey } from "./api_key";
import { loadFolders, loadProjects, loadWorkspaces } from "./catalog";
import { requestBytes } from "./http";
import { VOICEFLOW_REALTIME_HTTP_ORIGIN, encodePathSegment } from "./urls";
import { OperationFault } from "./contracts";
import { SecretEntryArraySchema } from "./schemas/secret_entry";
import { ExistingSecretSchema } from "./schemas/existing_secret";

const ExistingSecretsResponseSchema = z
  .object({
    secrets: z.array(ExistingSecretSchema),
  })
  .loose();

export type { ExistingSecret } from "./types";

export type { ConfigSecret, SecretEntry } from "./types";

type LoadExistingSecrets = (
  auth: AuthContext,
  versionID: string,
) => Promise<readonly ExistingSecret[]>;
export const loadExistingSecrets: LoadExistingSecrets = async (
  auth,
  versionID,
) => {
  const response = await requestBytes({
    url: `${VOICEFLOW_REALTIME_HTTP_ORIGIN}/v1alpha1/assistant/load-creator/${encodePathSegment(versionID)}`,
    init: { headers: { Authorization: `Bearer ${auth.token}` } },
    maxBytes: 8_388_608,
    timeoutMs: 15_000,
  });
  if (response.status < 200 || response.status >= 300)
    throw new OperationFault("DEPENDENCY_FAILURE", true);
  return parseExistingSecrets(response.bytes);
};

const parseExistingSecrets = (
  bytes: ArrayBuffer,
): readonly ExistingSecret[] => {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new OperationFault("DEPENDENCY_FAILURE", true, "secret-list-invalid");
  }
  const parsed = ExistingSecretsResponseSchema.safeParse(value);
  if (!parsed.success)
    throw new OperationFault("DEPENDENCY_FAILURE", true, "secret-list-invalid");
  return parsed.data.secrets;
};

type ParseSecretsFile = (contents: string) => readonly ConfigSecret[];
export const parseSecretsFile: ParseSecretsFile = (contents) =>
  parseSecretEntriesJSON(contents);

type ParseSecretEntries = (value: unknown) => readonly ConfigSecret[];
export const parseSecretEntries: ParseSecretEntries = (value) =>
  typeof value === "string"
    ? parseSecretEntriesJSON(value)
    : parseSecretEntryArray(value);

const parseSecretEntryArray = (value: unknown): readonly ConfigSecret[] => {
  const parsed = SecretEntryArraySchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const hasDuplicate = parsed.error.issues.some(
    (issue) => issue.message === "secret names must be unique",
  );
  if (hasDuplicate) throw new Error("duplicate secret entry key");
  const isNotArray = parsed.error.issues.some(
    (issue) => issue.code === "invalid_type" && issue.expected === "array",
  );
  throw new Error(
    isNotArray
      ? "Secrets must be a JSON array of key/value entries."
      : "Secret entry failed structural validation.",
  );
};
type ParseSecretEntriesJSON = (contents: string) => readonly ConfigSecret[];
export const parseSecretEntriesJSON: ParseSecretEntriesJSON = (contents) =>
  parseSecretEntries(JSON.parse(contents));
type CollectConfiguredSecretTypes = (
  entries: readonly ConfigSecret[],
) => ReadonlySet<ConfigSecret["type"]>;
export const collectConfiguredSecretTypes: CollectConfiguredSecretTypes = (
  entries,
) => new Set(entries.map((entry) => entry.type));

type MapConfigSecretsToSecretEntries = (
  entries: readonly ConfigSecret[],
  resolvedValues: readonly string[],
) => readonly SecretEntry[];
export const mapConfigSecretsToSecretEntries: MapConfigSecretsToSecretEntries =
  (entries, resolvedValues) =>
    entries.map((entry, index) => ({
      name: entry.key,
      value: resolvedValues[index] ?? entry.value,
    }));

type ResolveProjectPath = (
  workspaceRows: readonly { id: string; label: string }[],
  folderRows: readonly FolderRecord[],
  projectRows: readonly ProjectRecord[],
  path: string,
) => string;
export const resolveProjectPath: ResolveProjectPath = (
  workspaceRows,
  folderRows,
  projectRows,
  path,
) => {
  const segments = path.split("/").map((segment) => segment.trim());
  if (segments.some((segment) => segment === "") || segments.length < 2)
    throw new Error("Configured project path could not be resolved.");
  const workspace = workspaceRows.find((row) => matchesName(row, segments[0]));
  if (workspace === undefined)
    throw new Error("Configured project path could not be resolved.");
  const folders = segments
    .slice(1, -1)
    .reduce<FolderRecord[]>((resolved, label) => {
      const parentID = resolved.at(-1)?.id;
      const folder = folderRows.find(
        (row) =>
          row.workspaceID === workspace.id &&
          matchesName(row, label) &&
          row.parentID === parentID,
      );
      if (folder === undefined)
        throw new Error("Configured project path could not be resolved.");
      return [...resolved, folder];
    }, []);
  const project = projectRows.find(
    (row) =>
      row.workspaceID === workspace.id &&
      matchesName(row, segments?.at(-1)) &&
      (folders.length === 0 ||
        projectFolderID(row) === undefined ||
        projectFolderID(row) === folders.at(-1)?.id),
  );
  if (project === undefined)
    throw new Error("Configured project path could not be resolved.");
  return project.id;
};

const matchesName = (
  row: { id: string; label: string },
  value: string | undefined,
): boolean => value !== undefined && (row.id === value || row.label === value);
const projectFolderID = (project: ProjectRecord): string | undefined =>
  project.folderID;

const resolveProjectID = (auth: AuthContext, value: string): Promise<string> =>
  value.includes("/")
    ? loadWorkspaces(auth).then(async (workspaces) => {
        const workspace = workspaces.find((row) =>
          matchesName(row, value.split("/")[0]?.trim()),
        );
        if (workspace === undefined)
          throw new Error("Configured project path could not be resolved.");
        const catalogProjects = loadProjects(auth, workspace.id);
        const catalogFolders =
          value.split("/").length > 2
            ? loadFolders(auth, workspace.id)
            : Promise.resolve([] as readonly FolderRecord[]);
        return Promise.all([catalogFolders, catalogProjects]).then(
          ([folders, projects]) =>
            resolveProjectPath(workspaces, folders, projects, value),
        );
      })
    : Promise.resolve(value);

type ResolveConfiguredSecretValues = (
  auth: AuthContext,
  entries: readonly ConfigSecret[],
) => Promise<readonly SecretEntry[]>;
export const resolveConfiguredSecretValues: ResolveConfiguredSecretValues =
  async (auth, entries) => {
    const configuredTypes = collectConfiguredSecretTypes(entries);
    if (!configuredTypes.has("projectId"))
      return Promise.resolve(
        mapConfigSecretsToSecretEntries(
          entries,
          entries.map((entry) => entry.value),
        ),
      );
    const projectValues = entries
      .filter((entry) => entry.type === "projectId")
      .map((entry) => entry.value);
    return Promise.all(
      projectValues.map((value) => resolveProjectID(auth, value)),
    )
      .then((projectIDs) =>
        Promise.all(projectIDs.map((id) => retrieveProjectApiKey(auth, id))),
      )
      .then((apiKeys) => {
        let keyIndex = 0;
        return mapConfigSecretsToSecretEntries(
          entries,
          entries.map((entry) =>
            entry.type === "projectId"
              ? (apiKeys[keyIndex++] ?? entry.value)
              : entry.value,
          ),
        );
      });
  };
