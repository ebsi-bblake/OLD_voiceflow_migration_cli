import type {
  AuthContext,
  ConfigSecret,
  FolderRecord,
  ProjectRecord,
  SecretEntry,
} from "./types";
import { retrieveProjectApiKey } from "./api_key";
import { loadFolders, loadProjects, loadWorkspaces } from "./catalog";

export type { ConfigSecret, SecretEntry } from "./types";

type ParseSecretsFile = (contents: string) => readonly ConfigSecret[];
export const parseSecretsFile: ParseSecretsFile = (contents) =>
  parseSecretEntriesJSON(contents);

type ParseSecretEntries = (value: unknown) => readonly ConfigSecret[];
export const parseSecretEntries: ParseSecretEntries = (value) =>
  typeof value === "string"
    ? parseSecretEntriesJSON(value)
    : parseSecretEntryArray(value);

const parseSecretEntryArray = (value: unknown): readonly ConfigSecret[] => {
  if (!Array.isArray(value))
    throw new Error("Secrets must be a JSON array of key/value entries.");
  const names = new Set<string>();
  return value.map((entry, index) => {
    const secret = parseSecretEntry(entry);
    if (names.has(secret.key))
      throw new Error(
        `Secret entries contain duplicate key at index ${index}.`,
      );
    names.add(secret.key);
    return secret;
  });
};

const isSecretType = (value: unknown): value is ConfigSecret["type"] =>
  value === "projectId" || value === "" || value === "url";

const parseSecretEntry = (value: unknown): ConfigSecret => {
  if (!isRecord(value) || Object.keys(value).length !== 3)
    throw new Error(
      "ConfigSecret entries must contain only key, value, and type fields.",
    );
  if (typeof value.key !== "string" || !value.key.trim())
    throw new Error("Secret entries must contain a non-empty string key.");
  if (typeof value.value !== "string")
    throw new Error("Secret entries must contain a string value.");
  if (!isSecretType(value.type))
    throw new Error(
      "Secret entries must contain type projectId, empty string, or url.",
    );
  return { key: value.key, value: value.value, type: value.type };
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
  const folders = segments.slice(1, -1).reduce<FolderRecord[]>(
    (resolved, label) => {
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
    },
    [],
  );
  const project = projectRows.find(
    (row) =>
      row.workspaceID === workspace.id &&
      matchesName(row, segments.at(-1) ?? "") &&
      (folders.length === 0 ||
        projectFolderID(row) === undefined ||
        projectFolderID(row) === folders.at(-1)?.id),
  );
  if (project === undefined)
    throw new Error("Configured project path could not be resolved.");
  return project.id;
};

const matchesName = (row: { id: string; label: string }, value: string): boolean =>
  row.id === value || row.label === value;
const projectFolderID = (project: ProjectRecord): string | undefined =>
  project.folderID;

const resolveProjectID = (auth: AuthContext, value: string): Promise<string> =>
  value.includes("/")
    ? loadWorkspaces(auth).then((workspaces) => {
        const workspace = workspaces.find((row) => matchesName(row, value.split("/")[0]?.trim() ?? ""));
        if (workspace === undefined)
          throw new Error("Configured project path could not be resolved.");
        const catalogProjects = loadProjects(auth, workspace.id);
        const catalogFolders = value.split("/").length > 2
          ? loadFolders(auth, workspace.id)
          : Promise.resolve([] as readonly FolderRecord[]);
        return Promise.all([catalogFolders, catalogProjects])
          .then(([folders, projects]) => resolveProjectPath(workspaces, folders, projects, value));
      })
    : Promise.resolve(value);

type ResolveConfiguredSecretValues = (
  auth: AuthContext,
  entries: readonly ConfigSecret[],
) => Promise<readonly SecretEntry[]>;
export const resolveConfiguredSecretValues: ResolveConfiguredSecretValues =
  (auth, entries) => {
    const configuredTypes = collectConfiguredSecretTypes(entries);
    if (!configuredTypes.has("projectId"))
      return Promise.resolve(
        mapConfigSecretsToSecretEntries(entries, entries.map((entry) => entry.value)),
      );
    const projectValues = entries
      .filter((entry) => entry.type === "projectId")
      .map((entry) => entry.value);
    return Promise.all(projectValues.map((value) => resolveProjectID(auth, value)))
      .then((projectIDs) => Promise.all(projectIDs.map((id) => retrieveProjectApiKey(auth, id))))
      .then((apiKeys) => {
        let keyIndex = 0;
        return mapConfigSecretsToSecretEntries(
          entries,
          entries.map((entry) =>
            entry.type === "projectId" ? apiKeys[keyIndex++] ?? entry.value : entry.value,
          ),
        );
      });
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  [value !== null, typeof value === "object", !Array.isArray(value)].every(
    Boolean,
  );
