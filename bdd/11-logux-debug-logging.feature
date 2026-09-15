@migration @logux @debugging @observability
Feature: Opt-in Voiceflow Logux debugging
  Logux protocol diagnostics are useful while investigating Voiceflow traffic but
  must be silent by default. A debug flag enables safe, structured summaries
  without exposing credentials, secrets, or exported project data.

  Background:
    Given the migration CLI is invoked through the XYOps execute path
    And the Logux debug flag is disabled unless explicitly requested

  @default-off
  Scenario: Keep Logux debugging disabled by default
    Given the CLI is invoked without --debug-logux
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=false
    And no Logux debug lines are emitted
    And migration behavior is unchanged

  @enabled
  Scenario: Enable Logux debugging with the CLI flag
    Given the CLI is invoked with --debug-logux
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=true
    And the remote operation enables Logux debug diagnostics
    And diagnostics are written to stderr

  @disabled-explicitly
  Scenario: Allow debugging to be explicitly disabled
    Given the CLI is invoked with --no-debug-logux
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=false
    And no Logux debug lines are emitted

  @scope
  Scenario: Keep the debug flag scoped to Logux diagnostics
    Given --debug-logux is enabled
    When the migration runs
    Then Logux connection, subscription, mutation, acknowledgement, and close events may be logged
    And ordinary CLI progress output is unchanged
    And protocol diagnostics do not alter mutation ordering or completion barriers

  @safe-redaction
  Scenario: Redact sensitive Logux data
    Given --debug-logux is enabled
    When a Logux frame is logged
    Then the diagnostic may include direction, frame type, sync ID, action type, project ID, workspace ID, and safe correlation IDs
    And the JWT is represented only as [redacted]
    And cookies are never logged
    And secret values and defaultValue fields are never logged
    And exported project payloads and raw frame payloads are never logged

  @rename
  Scenario: Make rename protocol debugging sufficient for diagnosis
    Given --debug-logux is enabled
    When a project rename runs
    Then diagnostics identify the subscription sync ID
    And diagnostics identify the mutation sync ID
    And diagnostics identify the matching mutation synced acknowledgement
    And diagnostics identify the project.CRUD:PATCH state broadcast
    And diagnostics identify whether the rename completion barrier is satisfied

  @secret
  Scenario: Make secret protocol debugging sufficient for diagnosis
    Given --debug-logux is enabled
    When a secret creation runs
    Then diagnostics identify the secret lifecycle action types
    And diagnostics identify the mutation sync ID
    And diagnostics identify the matching completion action ID
    And diagnostics never include the secret name together with its value

  @errors
  Scenario: Preserve actionable failure diagnostics
    Given --debug-logux is enabled
    When Logux sends an error frame, closes, or times out
    Then the diagnostic identifies the safe lifecycle stage
    And the diagnostic identifies observed action types
    And the operation retains its existing retryability and unknown-outcome semantics
    And the diagnostic excludes credentials and sensitive payloads

  @flag-validation
  Scenario: Reject unsupported debug flag values
    Given the CLI receives a malformed debug flag value
    When CLI arguments are validated
    Then the CLI fails with a configuration error
    And no migration or WebSocket operation starts
