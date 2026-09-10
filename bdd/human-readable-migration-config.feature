@migration @configuration @human-readable
Feature: Use resource fields that accept Voiceflow names or IDs
  Migration configuration should use resource names rather than fields that
  imply IDs. Each configured resource value may be an exact catalog name or a
  canonical ID, and planning and execution receive canonical IDs.

  Background:
    Given the migration config is loaded from a JSON file
    And Voiceflow catalog responses are available to the authenticated session
    And resolved selections are passed to planning and execution as canonical IDs

  @schema
  Scenario: Accept resource fields without an ID suffix
    Given the config contains source_workspace, source_project, source_version, destination_workspace, and destination_folder
    When the CLI validates the migration config
    Then each resource field accepts a non-empty ID or name
    And fields named source_workspace_id, source_project_id, source_version_id, destination_workspace_id, or destination_folder_id are rejected as unsupported

  @name
  Scenario: Resolve configured names to canonical IDs
    Given the config identifies each migration resource by its exact catalog name
    And each name resolves to one catalog item in the applicable scope
    When the CLI resolves the migration configuration
    Then planning and execution receive only canonical resource IDs
    And the configured names are not passed downstream

  @compatibility
  Scenario: Preserve configured IDs
    Given the config identifies each migration resource by its canonical ID
    When the CLI resolves the migration configuration
    Then each configured ID is preserved
    And no name translation changes the selected resources

  @validation
  Scenario: Reject unknown or ambiguous resource names
    Given a configured resource name is absent from its applicable catalog or matches multiple items
    When the CLI resolves the migration configuration
    Then the command exits with status 1
    And the diagnostic code is configuration
    And the diagnostic identifies the configuration field
    And no plan is created
    And no credential or raw catalog payload is exposed

  @prompting
  Scenario: Prompt for omitted resource fields
    Given the config omits one or more migration resource fields
    When the CLI selects the migration resources
    Then each omitted field is selected interactively
    And configured fields are not prompted again
