@refactor @errors @diagnostics @bdd21
Feature: Execute BDD21 diagnostic contract slices

  Scenario: Redact structured diagnostic context without mutation
    When a diagnostic context contains nested secrets and safe fields
    Then the redacted context omits secret values
    And the original diagnostic context is unchanged

  Scenario: Bound nested diagnostic redaction
    When a diagnostic context contains deep and oversized collections
    Then redaction returns bounded structured data
    And safe collection order is preserved

  Scenario: Select safe next actions by diagnostic class
    When the diagnostic class is "unknown execute outcome"
    Then the next action is "Reconcile the execute job before retrying"
    When the diagnostic class is "authentication failure"
    Then the next action is "Check authentication and sign in again"

  Scenario: Protect sensitive key aliases
    When a diagnostic context contains token, api_key, defaultValue, and exported-data fields
    Then every sensitive alias is redacted

  Scenario: Represent expected boundary failures as Result data
    When a boundary returns a successful Result
    Then the Result contains a value and no error
    When a boundary returns a failed Result
    Then the Result contains an error and no value
