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

  Scenario: Create a canonical diagnostic without flattening identity
    When a core dependency fault is converted at the import stage
    Then the diagnostic preserves code, domain, stage, retryability, and nextAction
    And the diagnostic contains a structured cause

  Scenario: Append translation causes without changing the root code
    When a diagnostic crosses a plugin boundary
    Then the root diagnostic code is preserved
    And the translation cause is appended in order

  Scenario: Normalize unexpected failures as safe structured causes
    When an unexpected failure crosses the transport boundary
    Then the diagnostic uses INTERNAL_ERROR without raw exception text

  Scenario: Keep dispatch uncertainty distinct from confirmed rejection
    When a request fails before dispatch
    Then its outcome state is "before-dispatch-failure"
    When a dispatched request has a confirmed rejection
    Then its outcome state is "confirmed-rejection"
    When a dispatched request has no confirmed result
    Then its outcome state is "unknown-outcome"

  Scenario: Keep plugin diagnostics structured before compatibility formatting
    When a plugin validation failure is converted at the response stage
    Then its diagnostic domain is "plugin"
    And its diagnostic stage is "response"
    And its diagnostic code is "INVALID_INPUT"
