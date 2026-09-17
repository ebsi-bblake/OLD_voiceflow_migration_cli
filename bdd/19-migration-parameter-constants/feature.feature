@plugin @parameters @contracts
Feature: Centralize migration parameter names without changing the wire contract
  Migration parameters are external protocol keys. They must have one typed
  source of truth while retaining their exact serialized values.

  Background:
    Given the migration parameter contract is loaded
    And parameter names are defined by the MigrationParameterName constant object
    And operation names continue to use the VoiceflowOperation constant object

  @contract
  Scenario: Preserve the exact external parameter keys
    Then MigrationParameterName contains:
      | member | value |
      | planID | PLAN_ID |
      | sourceWorkspaceID | SOURCE_WORKSPACE_ID |
      | sourceProjectID | SOURCE_PROJECT_ID |
      | sourceVersionID | SOURCE_VERSION_ID |
      | destinationWorkspaceID | DESTINATION_WORKSPACE_ID |
      | destinationFolderID | DESTINATION_FOLDER_ID |
      | targetSchemaVersion | TARGET_SCHEMA_VERSION |
      | secretFileContents | SECRET_FILE_CONTENTS |
      | confirmed | CONFIRMED |
    And no serialized job parameter key is renamed or normalized
    And the constants are runtime values suitable for indexing serialized parameters

  @type-safety
  Scenario: Use typed constants at parameter boundaries
    When an operation parameter payload is built with a required parameter
    Then it uses a MigrationParameterName member
    When an operation parameter payload is built with an optional parameter
    Then an absent optional parameter is omitted
    And a misspelled parameter cannot be introduced through the typed contract

  @behavior
  Scenario: Preserve required and optional parameter behavior
    Given SOURCE_WORKSPACE_ID is present as a non-empty string
    When list_projects parameters are built using VoiceflowOperation.ListProjects
    Then the serialized workspace value is preserved without additional normalization
    Given TARGET_SCHEMA_VERSION is absent
    When plan_migration parameters are built using VoiceflowOperation.PlanMigration
    Then TARGET_SCHEMA_VERSION is omitted
    When execute_migration parameters are built using VoiceflowOperation.ExecuteMigration
    Then CONFIRMED is the literal boolean true

  @design
  Scenario: Prefer const objects over TypeScript enums for protocol strings
    When the parameter contract is compiled
    Then it exposes the exact string values without enum reverse mappings
    And it does not add a protocol translation layer
    And the external XYOps payload remains byte-for-byte compatible
