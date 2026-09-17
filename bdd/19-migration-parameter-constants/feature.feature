@plugin @parameters @contracts
Feature: Centralize migration parameter names without changing the wire contract
  Migration parameters are external protocol keys. They must have one typed
  source of truth while retaining their exact uppercase serialized values.

  Background:
    Given the plugin receives a validated NativePluginJob
    And parameter names are defined by the MigrationParameter constant object
    And operation names continue to use the VoiceflowOperation constant object

  @contract
  Scenario: Preserve the exact external parameter keys
    Then MigrationParameter contains:
      | member | value |
      | PlanID | PLAN_ID |
      | SourceWorkspaceID | SOURCE_WORKSPACE_ID |
      | SourceProjectID | SOURCE_PROJECT_ID |
      | SourceVersionID | SOURCE_VERSION_ID |
      | DestinationWorkspaceID | DESTINATION_WORKSPACE_ID |
      | DestinationFolderID | DESTINATION_FOLDER_ID |
      | TargetSchemaVersion | TARGET_SCHEMA_VERSION |
      | SecretFileContents | SECRET_FILE_CONTENTS |
      | Confirmed | CONFIRMED |
    And no serialized job parameter key is renamed or normalized
    And the constants are runtime values suitable for indexing job.params

  @type-safety
  Scenario: Use typed constants at parameter boundaries
    When an operation invocation requests a required parameter
    Then it passes a MigrationParameter member to requiredParameter
    When an operation invocation requests an optional parameter
    Then it passes a MigrationParameter member to optionalParameter
    And a misspelled parameter cannot be introduced through an untyped literal

  @behavior
  Scenario: Keep required and optional parameter behavior unchanged
    Given SOURCE_WORKSPACE_ID is present as a non-empty string
    When list_projects is dispatched using MigrationParameter.SourceWorkspaceID
    Then the handler receives the trimmed workspace ID
    Given TARGET_SCHEMA_VERSION is absent
    When plan_migration is dispatched using MigrationParameter.TargetSchemaVersion
    Then the handler receives undefined for the optional schema version
    Given CONFIRMED is not the literal boolean true
    When execute_migration is dispatched using MigrationParameter.Confirmed
    Then the operation fails with CONFIRMATION_REQUIRED

  @design
  Scenario: Prefer const objects over TypeScript enums for protocol strings
    When the parameter contract is compiled
    Then it exposes the exact string values without enum reverse mappings
    And it does not add a protocol translation layer
    And the external XYOps payload remains byte-for-byte compatible
