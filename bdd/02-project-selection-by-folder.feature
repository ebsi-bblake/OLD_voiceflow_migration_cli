@cli @selection @projects
Feature: Show source projects with their folder context
  Interactive project selection must make duplicate or similarly named
  projects distinguishable by displaying each project's folder.

  Background:
    Given source workspace catalog loading has completed
    And the source project catalog includes projects from multiple folders

  @display
  Scenario: Display a project's folder beside its name
    Given a project named "Benefits Assistant" is in the "Participant Assistants" folder
    When the source project selection is displayed
    Then the project label includes "Benefits Assistant"
    And the project label includes "Participant Assistants"
    And the canonical project ID remains available as the option value

  @display
  Scenario: Distinguish same-named projects in different folders
    Given a project named "Customer Assistant" exists in two different folders
    When the source project selection is displayed
    Then both projects are shown as separate options
    And each option identifies its folder
    And selecting either option passes its own project ID to version loading

  @regression
  Scenario: Preserve project selection when a project has no folder
    Given a project has no folder
    When the source project selection is displayed
    Then the project remains selectable
    And its display label omits the folder portion
