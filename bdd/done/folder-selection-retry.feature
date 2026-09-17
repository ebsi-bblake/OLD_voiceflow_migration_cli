@cli @selection @folders
Feature: Retry destination folder selection after declining creation
  Declining creation of a missing folder should return the user to folder
  selection so a typo can be corrected without restarting the CLI. This feature
  covers selection only; after migration confirmation, the user cannot return
  to the selection flow.

  Background:
    Given destination folder catalog loading has completed
    And the requested folder name is not in the catalog

  @retry
  Scenario: Return to folder selection after declining creation
    When the user declines creation of the requested folder
    Then the folder creation prompt ends
    And the destination folder selection is displayed again
    And migration planning has not started

  @retry
  Scenario: Show folder choices again after an illegal number
    When the user enters a folder number that is not displayed
    Then the folder choices are displayed again
    And no new folder is created
    And migration planning has not started

  @retry
  Scenario: Correct a folder-name typo without restarting
    Given the user first enters "Paricipant Assistants"
    And the user declines creation of that name
    When the user enters the existing folder "Participant Assistants"
    Then the existing folder ID is selected
    And no new folder is created
    And migration planning can proceed

  @creation
  Scenario: Continue after confirming creation
    Given the user enters a new folder name
    And the user confirms creation
    When folder creation completes
    Then the new folder ID is selected
    And migration planning receives that folder ID

  @regression
  Scenario: Do not start migration after a declined creation
    Given the user declines creation and leaves folder selection unresolved
    When the selection flow ends
    Then no planning or execution request is made
