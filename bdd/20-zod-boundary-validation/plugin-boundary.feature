@refactor @validation @zod @plugin
Feature: Execute the implemented BDD20 boundary slices
  The first BDD20 slices use Zod for structural validation while preserving
  existing domain policies and safe failure behavior.

  Scenario: Validate a NativePluginJob without exposing malformed input
    When a valid native plugin job is parsed
    Then the parsed operation is "check_session"
    When a native plugin job with malformed structure is parsed
    Then parsing fails with the safe plugin input diagnostic
    And the malformed input is absent from the diagnostic

  Scenario: Validate plugin response envelopes
    When a successful plugin response is parsed
    Then the plugin response is accepted
    When a plugin response has an invalid completion value
    Then the plugin response is rejected

  Scenario: Validate CLI configuration shape without replacing policies
    When a migration config with an inline secret entry is parsed
    Then the configuration shape is accepted
    When a migration config contains a non-string resource field
    Then the configuration shape is rejected

  Scenario: Validate Voiceflow authentication claim shape
    When valid creator claims are parsed
    Then the claims are accepted
    When a creator claim has an object value
    Then the claims are rejected

  Scenario: Validate catalog record structure before projection
    When a catalog row with numeric identity fields is parsed
    Then the catalog row is accepted
    When a catalog row has an object identity field
    Then the catalog row is rejected

  Scenario: Validate Logux frames without changing BDD18 fixtures
    When a valid Logux sync frame is parsed
    Then the Logux frame is accepted
    When an unknown Logux frame kind is parsed
    Then the Logux frame is rejected

  Scenario: Validate composable Voiceflow envelopes
    When a valid Voiceflow success envelope is parsed
    Then the Voiceflow envelope is accepted
    When a Voiceflow envelope has an unknown operation
    Then the Voiceflow envelope is rejected

  Scenario: Validate secret entry structure without accepting extra fields
    When a valid secret entry is parsed
    Then the secret entry is accepted
    When a secret entry contains an extra field
    Then the secret entry is rejected

  Scenario: Validate migration result records with optional schema versions
    When a migration plan without a target schema version is parsed
    Then the migration plan is accepted
    When a migration execute result has a non-numeric byte count
    Then the migration execute result is rejected

  Scenario: Validate import receipt structure before alias projection
    When an import receipt with a numeric project ID is parsed
    Then the import receipt is accepted
    When an import receipt has an object project ID
    Then the import receipt is rejected

  Scenario: Validate existing secret records before reconciliation
    When a valid existing secret record is parsed
    Then the existing secret record is accepted
    When an existing secret record has an invalid visibility
    Then the existing secret record is rejected

  Scenario: Validate session result records
    When a session result with a boolean active value is parsed
    Then the session result is accepted
    When a session result has a non-boolean active value
    Then the session result is rejected

  Scenario: Validate Logux frames before secret updates
    When a connected Logux frame is parsed
    Then the secret-update Logux frame is accepted
    When a Logux frame has an unknown frame type
    Then the secret-update Logux frame is rejected

  Scenario: Validate Logux action envelopes before reducers
    When a Logux action with a typed payload is parsed
    Then the Logux action is accepted
    When a Logux action has no type
    Then the Logux action is rejected

  Scenario: Validate exported payload shape before metadata policy
    When an exported object payload is parsed
    Then the exported payload is accepted
    When an exported payload is an array
    Then the exported payload is rejected

  Scenario: Compose Voiceflow envelopes from Zod result schemas
    When a Voiceflow envelope is composed with a Zod result schema
    Then the composed envelope is accepted
    When the composed envelope has an invalid result
    Then the composed envelope is rejected

  Scenario: Redact Zod boundary diagnostics
    When a Zod error contains a secret input value
    Then its plugin diagnostic omits the secret value
    And its plugin diagnostic contains only bounded issue metadata

  Scenario: Validate HTTP and SSE response shapes before observation
    When a valid XYOps stream event is parsed
    Then the HTTP or SSE event is accepted
    When an XYOps stream event has malformed data
    Then the HTTP or SSE event is rejected

  Scenario: Prove guard and schema parity for migrated records
    When a valid catalog option is checked by its guard and schema
    Then both catalog validators accept it
    When an invalid catalog option is checked by its guard and schema
    Then both catalog validators reject it

  Scenario: Reject malformed plugin jobs before dispatch effects
    When a malformed plugin job enters the validation boundary
    Then validation rejects it without invoking a dispatch effect

  Scenario: Enforce bounded HTTP response bodies
    When an HTTP body exceeds its configured byte limit
    Then body validation rejects it without exposing body contents

  Scenario: Preserve omitted and nullable meanings at result boundaries
    When a migration plan omits its target schema version
    Then the omitted target remains absent
    When a migration plan contains a null target schema version
    Then the nullable target is rejected

  Scenario: Verify schema ownership inventory for migrated boundaries
    When the BDD20 schema inventory is inspected
    Then each migrated boundary has an owning schema module
    And migrated consumers do not contain the removed secret-entry guard

  Scenario: Verify rollout uses schemas before boundary consumers
    When the BDD20 rollout sources are inspected
    Then migrated consumers import Zod-owned schemas
    And the executable boundary suite is available
