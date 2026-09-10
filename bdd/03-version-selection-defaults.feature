@cli @selection @versions
Feature: Use draft and development as the default source version
  Source version selection should prefer the draft development version unless
  the migration configuration explicitly supplies a source version.

  Background:
    Given the source project has draft and development versions

  @default
  Scenario: Select draft development by default
    Given source_version is absent from the migration configuration
    When source version selection starts
    Then the draft development version is selected by default
    And no source version prompt is required

  @override
  Scenario: Respect an explicitly configured source version
    Given source_version is present in the migration configuration
    When source version selection starts
    Then the configured source version is selected
    And the draft development default is not applied

  @fallback
  Scenario: Handle a project without a draft development version
    Given the source project has no draft development version
    And another valid version is available
    When source version selection starts
    Then the available version selection behavior is used
    And the migration does not select a missing version

  @regression
  Scenario: Pass the resolved version to planning
    Given source version selection has completed
    When migration planning starts
    Then planning receives the resolved source version ID
    And no migration execution starts before planning completes
