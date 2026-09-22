export const PluginOperation = {
  CheckSession: "check_session",
  CheckSessionWorkflow: "check_session_workflow",
  ListWorkspaces: "list_workspaces",
  LoadWorkspaces: "load_workspaces",
  LoadSourceCatalog: "load_source_catalog",
  ResolveSourceSelection: "resolve_source_selection",
  ResolveSourceSchemaWorkflow: "resolve_source_schema_workflow",
  LoadDestinationCatalog: "load_destination_catalog",
  ResolveDestinationSelection: "resolve_destination_selection",
  PlanMigrationWorkflow: "plan_migration_workflow",
  ListProjects: "list_projects",
  ListVersions: "list_versions",
  ListFolders: "list_folders",
  CreateFolder: "create_folder",
  PlanMigration: "plan_migration",
  ExecuteMigration: "execute_migration",
  InitializeMigrationWorkflow: "initialize_migration_workflow",
  InitializeExecutionWorkflow: "initialize_execution_workflow",
  ExecuteMigrationWorkflow: "execute_migration_workflow",
  CreateFolderWorkflow: "create_folder_workflow",
} as const;

export const supportedPluginOperations = Object.values(PluginOperation);
