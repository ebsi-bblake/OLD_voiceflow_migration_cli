@migration @archive @project
Feature: Archive an existing project before migration
  If a project with the same name already exists in the destination folder,
  archive that project before migrating the new project.

  Background:
    Given the destination workspace and folder have been resolved
    And the source project name is known
    And the destination project catalog is available

  @collision
  Scenario: Migrate when no same-named project exists
    Given no project in the destination folder has the source project name
    When the migration preflight runs
    Then no project is archived
    And the migration proceeds with the original project name

  @collision
  Scenario: Archive a same-named project
    Given a project named "Customer Assistant" exists in the destination folder
    When the migration preflight runs
    Then the existing project is archived before migration
    And its new name is "Customer Assistant_YYYYMMDD_HHmm"
    And the timestamp uses the current date, hour, and minute in 24-hour time
    And the migrated project keeps the original name "Customer Assistant"

  @repeatability
  Scenario: Produce a unique archive name for repeated collisions
    Given an archive project with the generated timestamped name already exists
    When the migration preflight archives another same-named project
    Then the generated archive name does not overwrite an existing project
    And the command reports a clear conflict if a unique archive name cannot be obtained

  @failure
  Scenario: Stop before migration when archiving fails
    Given a same-named project exists in the destination folder
    And the archive rename operation fails
    When the migration preflight runs
    Then the command exits with status 1
    And no migration import is started
    And the diagnostic does not expose credentials or raw API payloads

  @scope
  Scenario: Ignore same-named projects outside the destination folder
    Given a same-named project exists in another folder or workspace
    When the migration preflight runs
    Then that project is not archived
    And the migration proceeds without changing it
