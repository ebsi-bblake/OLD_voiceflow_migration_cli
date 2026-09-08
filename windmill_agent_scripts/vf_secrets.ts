/** Parses validated JSON secret entries at the Windmill input boundary. */
import { isRecord } from "./vf_guards";
import type { AuthContext, ConfigSecret, SecretEntry } from "./vf_contracts";
import { retrieveProjectAPIKeyValue } from "./vf_api_key";

export function parseSecretEntries(value: unknown): ConfigSecret[] {
  return typeof value === "string"
    ? parseSecretEntriesJSON(value)
    : parseSecretEntryArray(value);
}
function parseSecretEntryArray(value: unknown): ConfigSecret[] {
  if (!Array.isArray(value))
    throw new Error("Secrets must be a JSON array of key/value entries.");
  const names = new Set<string>();
  return value.map((entryValue, index) => {
    if (!isRecord(entryValue) || Object.keys(entryValue).length !== 3)
      throw new Error(
        "ConfigSecret entries must contain only key, value, and type fields.",
      );
    if (typeof entryValue.key !== "string" || !entryValue.key.trim())
      throw new Error("Secret entries must contain a non-empty string key.");
    if (typeof entryValue.value !== "string")
      throw new Error("Secret entries must contain a string value.");
    if (
      entryValue.type !== "projectId" &&
      entryValue.type !== "" &&
      entryValue.type !== "url"
    )
      throw new Error(
        "Secret entries must contain type projectId, empty string, or url.",
      );
    if (names.has(entryValue.key))
      throw new Error(
        `Secret entries contain duplicate key at index ${index}.`,
      );
    names.add(entryValue.key);
    return {
      key: entryValue.key,
      value: entryValue.value,
      type: entryValue.type,
    };
  });
}

export function collectConfiguredSecretTypes(
  entries: readonly ConfigSecret[],
): ReadonlySet<ConfigSecret["type"]> {
  return new Set(entries.map((entry) => entry.type));
}

export function mapConfigSecretsToSecretEntries(
  entries: readonly ConfigSecret[],
  resolvedValues: readonly string[],
): SecretEntry[] {
  return entries.map((entry, index) => ({
    name: entry.key,
    value: resolvedValues[index] ?? entry.value,
  }));
}

export async function resolveConfiguredSecretValues(
  auth: AuthContext,
  entries: readonly ConfigSecret[],
): Promise<readonly SecretEntry[]> {
  const configuredTypes = collectConfiguredSecretTypes(entries);
  if (!configuredTypes.has("projectId"))
    return mapConfigSecretsToSecretEntries(entries, entries.map((entry) => entry.value));
  const projectIDs = [...new Set(
    entries.filter((entry) => entry.type === "projectId").map((entry) => entry.value),
  )];
  return Promise.all(projectIDs.map((projectID) => retrieveProjectAPIKeyValue(auth, projectID)))
    .then((apiKeys) => {
      const apiKeysByProjectID = new Map(projectIDs.map((id, index) => [id, apiKeys[index]]));
      return mapConfigSecretsToSecretEntries(
        entries,
        entries.map((entry) =>
          entry.type === "projectId"
            ? apiKeysByProjectID.get(entry.value) ?? entry.value
            : entry.value,
        ),
      );
    });
}

function parseSecretEntriesJSON(contents: string): ConfigSecret[] {
  return parseSecretEntries(JSON.parse(contents));
}
