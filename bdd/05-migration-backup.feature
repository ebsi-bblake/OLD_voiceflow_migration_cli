@migration @backup @future
Feature: Back up destination state before migration
  Future backup support must preserve the destination state before destructive
  migration changes, including project archiving and import.

  Background:
    Given the migration has passed validation
    And the destination workspace and folder have been resolved

  @planned
  Scenario: Create a recoverable backup before migration changes
    When backup support is enabled
    Then the destination state is captured before archiving or import
    And the backup has a traceable migration identifier
    And the backup does not contain credentials in logs or diagnostics

  @planned
  Scenario: Stop safely when backup creation fails
    Given backup support is enabled
    And backup creation fails
    When the migration preflight runs
    Then no destination project is archived
    And no migration import is started
    And the failure identifies that backup creation failed

  @planned
  Scenario: Allow migration to proceed only when backup policy permits it
    Given backup support is disabled by explicit configuration
    When the migration preflight runs
    Then the command follows the documented no-backup policy
    And the operator receives a clear warning before destructive changes
