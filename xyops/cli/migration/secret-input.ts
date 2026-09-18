import { readSecretFile } from "../secrets";
import { fail } from "../diagnostics";
import type { MigrationFileConfig } from "../config";
import type { SecretEntries } from "../types";
import type { PromptReader } from "../prompt";
import { resolveConfiguredFilePath } from "../file-path";

export const resolveSecretsPath = resolveConfiguredFilePath;

type ReadSecretFileContents = (path: string) => Promise<SecretEntries>;
const readSecretFileContents: ReadSecretFileContents = (path) =>
  path === ""
    ? Promise.resolve([])
    : readSecretFile(resolveConfiguredFilePath(path, process.platform)).catch(
        () => {
          throw fail("configuration", {
            nextAction: "The configured secrets file is invalid or unreadable.",
          });
        },
      );

type ReadSecretsForMigration = (
  reader: PromptReader,
  migrationConfig?: MigrationFileConfig,
) => Promise<SecretEntries>;
export const readSecretsForMigration: ReadSecretsForMigration = async (
  reader,
  migrationConfig,
) => {
  if (migrationConfig?.secrets !== undefined)
    return typeof migrationConfig.secrets === "string"
      ? readSecretFileContents(migrationConfig.secrets)
      : migrationConfig.secrets;
  const path = (
    await reader.ask(
      "Path to secrets file (local or network; press Enter for no secrets): ",
    )
  ).trim();
  return readSecretFileContents(path);
};
