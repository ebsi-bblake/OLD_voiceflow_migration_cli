@quality @refactor @human-readable
Feature: Keep source files human-readable and consistently formatted
  Source files should present their public entry points at the bottom, with
  definitions ordered logically above them and meaningful spacing between
  declarations. Formatting and linting should enforce the repository style
  without changing runtime behavior.

  Background:
    Given the Voiceflow, plugin, and CLI source trees are available
    And the repository formatting and linting commands are available

  @organization
  Scenario: Place exported entry points at the bottom of a module
    Given a module contains private definitions and exported functions
    When the module organization is reviewed
    Then the private definitions appear before the exported entry points
    And exported entry points appear at the bottom in logical usage order
    And no public behavior changes

  @organization
  Scenario: Separate logical declarations with readable spacing
    Given a module contains multiple types, policies, adapters, and exports
    When the module organization is reviewed
    Then related declarations are grouped together
    And unrelated declarations have a logical blank-line separation
    And comments explain only non-obvious intent or constraints

  @verification
  Scenario: Formatting and linting pass for the refactored source
    When the repository formatting and linting checks run
    Then formatting passes without rewriting unrelated files
    And linting passes without disabled rules or suppressed diagnostics
    And the focused test suite passes

  @regression
  Scenario: Organization changes preserve observable behavior
    Given representative valid and invalid inputs for each changed boundary
    When the focused and full test suites run
    Then the existing behavior remains unchanged
    And validation, error redaction, null handling, and public exports remain intact
