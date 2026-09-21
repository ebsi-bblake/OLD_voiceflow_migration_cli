export const PluginOperation = {
  CheckSession: "check_session",
  CheckSessionWorkflow: "check_session_workflow",
  ListWorkspaces: "list_workspaces",
  LoadWorkspaces: "load_workspaces",
  LoadSourceCatalog: "load_source_catalog",
  ListProjects: "list_projects",
  ListVersions: "list_versions",
  ListFolders: "list_folders",
  CreateFolder: "create_folder",
  PlanMigration: "plan_migration",
  ExecuteMigration: "execute_migration",
  InitializeMigrationWorkflow: "initialize_migration_workflow",
} as const;

export const supportedPluginOperations = Object.values(PluginOperation);
