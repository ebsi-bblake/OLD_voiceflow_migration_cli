@migration @folder @destination
Feature: Select or create the destination folder
  A migration may target an existing destination folder or create a new folder
  when the configured destination_folder does not exist.

  Background:
    Given the destination workspace has been resolved to a canonical ID
    And folder catalog responses are available for that workspace
    And the migration has not started

  @existing
  Scenario: Use an existing destination folder
    Given destination_folder identifies an existing folder by name or ID
    When the destination folder is selected
    Then the existing folder is selected
    And its canonical folder ID is passed to planning and execution
    And no folder is created

  @create
  Scenario: Offer creation when the destination folder does not exist
    Given destination_folder identifies no folder in the destination workspace
    When the destination folder is selected
    Then the CLI reports that the folder does not exist
    And the CLI offers to create the folder
    And no migration plan is created before the selection is resolved

  @create-confirmed
  Scenario: Create and select a confirmed destination folder
    Given destination_folder identifies no folder in the destination workspace
    And the user confirms folder creation
    When the destination folder selection is completed
    Then exactly one folder is created in the destination workspace
    And the newly created folder is selected
    And its canonical folder ID is passed to planning and execution

  @create-declined
  Scenario: Stop when folder creation is declined
    Given destination_folder identifies no folder in the destination workspace
    And the user declines folder creation
    When the destination folder selection is completed
    Then the command exits without creating a folder
    And no migration plan is created

  @safety
  Scenario: Do not create a folder after a failed lookup
    Given the destination folder catalog request fails
    When the destination folder is selected
    Then the command reports a dependency failure
    And no folder is created
    And no migration plan is created
