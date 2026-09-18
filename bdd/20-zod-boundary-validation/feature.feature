@refactor @validation @zod @boundaries @executable
Feature: Zod boundary validation core contracts
  BDD20 verifies the shared Zod boundary mechanism and representative schema
  ownership. Boundary-specific behavior is covered by plugin-boundary.feature
  and the focused unit suites. The complete roadmap remains documented in
  feature-specification.md and is intentionally split into follow-up BDDs.

  Background:
    Given the active XYOps plugin, CLI client, and Voiceflow core are under test
    And Zod is a direct runtime dependency recorded in the Bun lockfile
    And all external values enter the system as unknown
    And no validation boundary exposes raw input or raw Zod issue values

  Scenario: Validate plugin jobs before dispatch
    When a valid native plugin job is parsed
    Then the parsed operation is "check_session"
    When a native plugin job with malformed structure is parsed
    Then parsing fails with the safe plugin input diagnostic
    And the malformed input is absent from the diagnostic

  Scenario: Validate response envelopes with composable schemas
    When a successful plugin response is parsed
    Then the plugin response is accepted
    When a Voiceflow envelope is composed with a Zod result schema
    Then the composed envelope is accepted
    When the composed envelope has an invalid result
    Then the composed envelope is rejected

  Scenario: Validate representative configuration and domain records
    When a migration config with an inline secret entry is parsed
    Then the configuration shape is accepted
    When a migration config contains a non-string resource field
    Then the configuration shape is rejected
    When a catalog row with numeric identity fields is parsed
    Then the catalog row is accepted
    When a catalog row has an object identity field
    Then the catalog row is rejected

  Scenario: Validate protocol and secret boundaries
    When a valid Logux sync frame is parsed
    Then the Logux frame is accepted
    When an unknown Logux frame kind is parsed
    Then the Logux frame is rejected
    When a valid secret entry is parsed
    Then the secret entry is accepted
    When a secret entry contains an extra field
    Then the secret entry is rejected

  Scenario: Redact rejected boundary input
    When a Zod error contains a secret input value
    Then its plugin diagnostic omits the secret value
    And its plugin diagnostic contains only bounded issue metadata
