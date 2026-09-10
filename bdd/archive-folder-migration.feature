@migration @archive @folder
Feature: Move an existing destination project to an archive folder
  When a same-named destination project must be archived, use an archive folder
  in the same workspace. Create the archive folder when it does not exist, then
  move the timestamp-renamed project into it.

  Background:
    Given the destination workspace has been resolved
    And a same-named destination project has been identified
    And the archive project name uses the format <project_name>_YYYYMMDD_24HR

  @existing-folder
  Scenario: Move the archived project to an existing archive folder
    Given an archive folder exists in the destination workspace
    When the project archive step runs
    Then the existing project is renamed with the archive timestamp suffix
    And the renamed project is moved to the archive folder
    And the original destination folder is unchanged except for removing the archived project

  @new-folder
  Scenario: Create the archive folder when it does not exist
    Given no archive folder exists in the destination workspace
    And the user confirms archive folder creation
    When the project archive step runs
    Then exactly one archive folder is created in the destination workspace
    And the renamed project is moved to the newly created archive folder
    And the migrated project remains eligible for the original destination folder

  @declined
  Scenario: Stop when archive folder creation is declined
    Given no archive folder exists in the destination workspace
    And the user declines archive folder creation
    When the project archive step runs
    Then the command exits without moving the project
    And no migration import is started

  @scope
  Scenario: Keep the archive folder in the destination workspace
    Given an archive folder with the same name exists in another workspace
    When the project archive step runs
    Then that folder is not selected
    And a folder in the destination workspace is selected or created

  @failure
  Scenario: Stop before migration when archive relocation fails
    Given the project has been renamed for archiving
    And moving the renamed project to the archive folder fails
    When the project archive step completes
    Then the command exits with status 1
    And no migration import is started
    And the diagnostic identifies the archive relocation failure without exposing credentials
