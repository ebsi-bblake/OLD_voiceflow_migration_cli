@migration @archive @folder
Feature: Move an existing destination project to an archive folder
  When a same-named destination project must be archived, use the Archive folder
  in the same destination workspace. Create the folder automatically when it does
  not exist, then move the timestamp-renamed project into it.

  Background:
    Given the destination workspace has been resolved
    And a same-named destination project has been identified
    And the archive project name uses the format <project_name>_YYYYMMDD_HHmm
    And archive-folder creation requires no user confirmation

  @existing-folder
  Scenario: Move the archived project to an existing archive folder
    Given an archive folder exists in the destination workspace
    When the project archive step runs
    Then the existing project is renamed with the archive timestamp suffix
    And the renamed project is moved to the archive folder
    And the original destination folder is unchanged except for removing the archived project

  @new-folder
  Scenario: Create the archive folder when it does not exist
    Given no Archive folder exists in the destination workspace
    When the project archive step runs
    Then an Archive folder is created automatically in the destination workspace
    And the renamed project is moved to the newly created Archive folder
    And the migrated project remains eligible for the original destination folder

  @scope
  Scenario: Keep the archive folder in the destination workspace
    Given an Archive folder with the same name exists in another workspace
    When the project archive step runs
    Then that folder is not selected
    And an Archive folder in the destination workspace is selected or created

  @failure
  Scenario: Stop before migration when archive relocation fails
    Given the project has been renamed for archiving
    And moving the renamed project to the Archive folder fails
    When the project archive step completes
    Then the command exits with status 1
    And the renamed project remains in the original destination folder
    And no migration import is started
    And the diagnostic identifies the archive relocation failure without exposing credentials

  @retry
  Scenario: Retry relocation without renaming again
    Given the project has already been renamed with the archive timestamp suffix
    And the project remains in the original destination folder
    When the project archive step is retried
    Then the existing renamed project is moved to the Archive folder
    And no second timestamp suffix is added