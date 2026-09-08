import type { AuthContext, ConfigSecret, SecretEntry } from "./types";
import { retrieveProjectApiKey } from "./api_key";

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
    const projectIDs = [
      ...new Set(
        entries
          .filter((entry) => entry.type === "projectId")
          .map((entry) => entry.value),
      ),
    ];
    return Promise.all(
      projectIDs.map((projectID) => retrieveProjectApiKey(auth, projectID)),
    ).then((apiKeys) => {
      const apiKeysByProjectID = new Map(
        projectIDs.map((id, index) => [id, apiKeys[index]]),
      );
      return mapConfigSecretsToSecretEntries(
        entries,
        entries.map((entry) =>
          entry.type === "projectId"
            ? (apiKeysByProjectID.get(entry.value) ?? entry.value)
            : entry.value,
        ),
      );
    });
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  [value !== null, typeof value === "object", !Array.isArray(value)].every(
    Boolean,
  );
