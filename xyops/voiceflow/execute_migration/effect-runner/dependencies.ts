import { exportVersion } from "../../export";
import { importVersion } from "../../import";
import { resolveVoiceflowAuth } from "../../auth";
import { loadFolders, loadProjects } from "../../catalog";
import { resolveConfiguredSecretValues as resolveSecrets } from "../../secrets";
import { reconcileProjectSecrets as reconcileSecrets } from "../../logux";
import { renameProject } from "../../logux/rename-project";
import { confirmProjectRename as confirmRename } from "../../catalog/rename-barrier";
import { buildMigrationPlan as buildPlan } from "../../planning";
import type { MigrationSelection } from "../../types";
import type { MigrationWorkflowState } from "../../execute-migration-state-machine";

type EffectDependencies = Readonly<{
  readonly authenticate: typeof resolveVoiceflowAuth;
  readonly exportVersion: typeof exportVersion;
  readonly buildPlan: typeof buildPlan;
  readonly loadProjects: typeof loadProjects;
  readonly loadFolders: typeof loadFolders;
  readonly renameProject: typeof renameProject;
  readonly confirmRename: typeof confirmRename;
  readonly importVersion: typeof importVersion;
  readonly resolveSecrets: typeof resolveSecrets;
  readonly reconcileSecrets: typeof reconcileSecrets;
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
    buildPlan,
    loadProjects,
    loadFolders,
    renameProject,
    confirmRename,
    importVersion,
    resolveSecrets,
    reconcileSecrets,
  };
