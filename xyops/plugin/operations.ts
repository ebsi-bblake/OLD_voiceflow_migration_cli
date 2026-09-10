export const PluginOperation = {
  CheckSession: "check_session",
  ListWorkspaces: "list_workspaces",
  ListProjects: "list_projects",
  ListVersions: "list_versions",
  ListFolders: "list_folders",
  CreateFolder: "create_folder",
  PlanMigration: "plan_migration",
  ExecuteMigration: "execute_migration",
} as const;

export const supportedPluginOperations = Object.values(PluginOperation);
