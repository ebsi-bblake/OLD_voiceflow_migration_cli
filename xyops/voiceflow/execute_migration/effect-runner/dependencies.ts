import { exportVersion } from "../../export";
import { importVersion } from "../../import";
import { resolveVoiceflowAuth } from "../../auth";
import { loadProjects } from "../../catalog";
import { resolveConfiguredSecretValues } from "../../secrets";
import { reconcileProjectSecrets } from "../../logux";
import { renameProject } from "../../logux/rename-project";
import { confirmProjectRename } from "../../catalog/rename-barrier";
import { buildMigrationPlan } from "../../planning";
import type { MigrationSelection } from "../../types";
import type { MigrationWorkflowState } from "../../execute-migration-state-machine";

type EffectDependencies = Readonly<{
  readonly authenticate: typeof resolveVoiceflowAuth;
  readonly exportVersion: typeof exportVersion;
  readonly buildPlan: typeof buildMigrationPlan;
  readonly loadProjects: typeof loadProjects;
  readonly renameProject: typeof renameProject;
  readonly confirmRename: typeof confirmProjectRename;
  readonly importVersion: typeof importVersion;
  readonly resolveSecrets: typeof resolveConfiguredSecretValues;
  readonly reconcileSecrets: typeof reconcileProjectSecrets;
  readonly abortActiveOperation?: () => void | Promise<void>;
  readonly observeState?: (state: MigrationWorkflowState) => void;
}>;

export type MigrationRuntimeDependencies = EffectDependencies;

export type ExecuteMigrationInput = Readonly<{
  readonly token: string;
  readonly planID: string;
  readonly selection: MigrationSelection;
  readonly operationID: string;
  readonly secretFileContents?: unknown;
}>;

export const defaultMigrationRuntimeDependencies: MigrationRuntimeDependencies =
  {
    authenticate: resolveVoiceflowAuth,
    exportVersion,
    buildPlan: buildMigrationPlan,
    loadProjects,
    renameProject,
    confirmRename: confirmProjectRename,
    importVersion,
    resolveSecrets: resolveConfiguredSecretValues,
    reconcileSecrets: reconcileProjectSecrets,
  };
