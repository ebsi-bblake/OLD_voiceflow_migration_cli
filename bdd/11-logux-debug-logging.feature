@migration @logux @debugging @observability
Feature: Opt-in Voiceflow Logux debugging
  Logux diagnostics are disabled by default. The execute-event parameter is
  DEBUG_LOGUX and is always sent as an explicit boolean. When enabled, the
  plugin emits bounded, structured, allowlisted diagnostics without changing
  migration ordering, acknowledgement, retryability, or unknown-outcome rules.

  Background:
    Given the migration CLI is invoked through the XYOps execute path
    And CLI flag values are resolved before the execute request is built
    And the resolved DEBUG_LOGUX value is sent explicitly as true or false
    And the plugin treats any absent, malformed, or non-boolean DEBUG_LOGUX value as false
    And normal migration errors remain visible independently of debug logging

  @precedence @default-off
  Scenario: Resolve the debug setting deterministically
    Given the default debug value is false
    And an environment setting may provide DEBUG_LOGUX
    And configuration may provide debugLogux
    And the CLI may provide --debug-logux or --no-debug-logux
    When more than one source provides a value
    Then CLI flags take precedence over configuration
    And configuration takes precedence over the environment setting
    And the environment setting takes precedence over the default
    When no source provides a value
    Then the resolved value is false

  @default-off
  Scenario: Keep Logux debugging disabled by default
    Given the CLI is invoked without a debug flag, configuration value, or environment setting
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=false
    And no Logux debug trace lines are emitted
    And normal migration behavior is unchanged

  @enabled
  Scenario: Enable Logux debugging with the CLI flag
    Given the CLI is invoked with --debug-logux
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=true
    And the remote operation enables Logux debug diagnostics
    And diagnostics are emitted through the configured job diagnostic channel

  @disabled-explicitly
  Scenario: Explicitly disable debugging
    Given the CLI is invoked with --no-debug-logux
    When an execute migration is dispatched
    Then the execute request contains DEBUG_LOGUX=false
    And no Logux debug trace lines are emitted

  @scope
  Scenario: Scope debugging to the confirmed execute operation
    Given DEBUG_LOGUX=true is sent with execute_migration
    When the confirmed migration runs
    Then rename, catalog durability, and secret Logux operations inside that execution may be traced
    And interactive preflight catalog operations are not traced by this execute flag
    And ordinary CLI progress output is unchanged
    And protocol diagnostics do not alter mutation ordering or completion barriers

  @transport
  Scenario: Keep diagnostics separate from the migration result contract
    Given DEBUG_LOGUX=true
    When the plugin emits a diagnostic line
    Then the line is written to the configured XYOps job diagnostic channel
    And the migration result envelope contains no raw debug frames
    And the CLI does not depend on debug output to determine migration success
    And failure diagnostics remain available when DEBUG_LOGUX=false

  @schema
  Scenario: Emit one bounded structured diagnostic schema
    Given DEBUG_LOGUX=true
    When a Logux event is logged
    Then the line is valid JSON with these required fields:
      | field | requirement |
      | component | logux |
      | operationID | current operation identifier |
      | stage | current migration stage |
      | direction | in or out |
      | frameType | connect, connected, sync, synced, or error |
      | event | lifecycle event name |
    And syncID is included when present
    And actionType is included only when present and allowlisted
    And workspaceID and projectID are included only when known and allowlisted
    And each line is independently parseable

  @safe-redaction
  Scenario: Log only allowlisted protocol fields
    Given DEBUG_LOGUX=true
    When a Logux frame is logged
    Then the diagnostic may include direction, frame type, safe sync ID, action type, workspace ID, project ID, and operation correlation
    And the complete frame payload is never logged
    And JWTs, cookies, secret values, defaultValue fields, and exported project data are never logged
    And raw origin values are never logged
    And origin correlation uses a non-reversible redacted identifier or presence flag
    And unknown fields are omitted rather than recursively logged

  @rename @state-machine
  Scenario: Trace the rename state-machine lifecycle
    Given DEBUG_LOGUX=true
    When a project rename runs
    Then diagnostics identify the states CONNECTING, CONNECTED, SUBSCRIBING, SUBSCRIBED, MUTATION_SENT, MUTATION_ACKNOWLEDGED, and CATALOG_RECONCILING when reached
    And diagnostics identify the subscription sync ID
    And diagnostics identify the distinct mutation sync ID
    And diagnostics identify mutationSent=true or false
    And diagnostics identify mutationAck=true or false
    And diagnostics identify patchObserved=true or false
    And diagnostics identify catalogDurable=true or false
    And a missing project.CRUD:PATCH is represented as patchObserved=false
    And a matching mutation synced frame is identified separately from a project broadcast

  @secret @state-machine
  Scenario: Trace the secret state-machine lifecycle safely
    Given DEBUG_LOGUX=true
    When a secret creation runs
    Then diagnostics identify CONNECTING, SUBSCRIBED, MUTATION_SENT, and COMPLETED when reached
    And diagnostics identify the secret lifecycle action types
    And diagnostics identify the mutation sync ID
    And diagnostics identify the matching completion action ID in redacted form
    And secret names are omitted unless explicitly allowlisted
    And secret values and defaultValue fields are never logged

  @errors
  Scenario: Preserve actionable failure diagnostics
    Given DEBUG_LOGUX=true
    When Logux sends an error frame, closes, or times out
    Then the diagnostic identifies the safe lifecycle stage
    And the diagnostic identifies observed action types
    And the diagnostic identifies mutationAck, patchObserved, and catalogDurable when relevant
    And an error frame may include a bounded safe server error code
    And the operation retains its existing retryability and unknown-outcome semantics
    And the diagnostic excludes credentials and sensitive payloads

  @protocol-error
  Scenario: Diagnose a rejected frame without exposing it
    Given DEBUG_LOGUX=true
    When Logux returns an error frame with server code wrong-format
    Then the diagnostic contains serverCode=wrong-format
    And the diagnostic identifies the outbound frame kind and lifecycle stage
    And the complete rejected frame is not logged

  @validation
  Scenario Outline: Reject unsupported debug flag forms
    Given the CLI receives <invalid_flag>
    When CLI arguments are validated
    Then the CLI fails with a configuration error
    And no migration or WebSocket operation starts
    And the CLI exits with code 2

    Examples:
      | invalid_flag |
      | --debug-logux=true |
      | --debug-logux maybe |

  @limits
  Scenario: Bound diagnostic output
    Given DEBUG_LOGUX=true
    When diagnostic output reaches the configured byte or line limit
    Then further debug lines are suppressed or summarized
    And migration execution continues without waiting indefinitely for logging
    And the migration result is not changed by diagnostic backpressure

  @logging-failure
  Scenario: Continue safely when diagnostic emission fails
    Given DEBUG_LOGUX=true
    When the diagnostic channel rejects a log write
    Then the logging failure is not treated as a Voiceflow mutation failure
    And mutation ordering and completion barriers remain unchanged
    And the migration result follows the underlying operation outcome

# IMPLEMENTATION GATES: these decisions are required before this feature is
# implementation-ready. They are intentionally recorded here so the contract
# cannot silently acquire incompatible defaults during implementation.
#
# 1. Configuration contract:
#    Decide whether debugLogux is the config key, define the environment key,
#    define CLI > config > environment > default precedence, and distinguish
#    malformed CLI values (validation failure) from malformed remote event
#    values (reject or fail closed).
#
# 2. Diagnostic transport:
#    Verify whether plugin stderr is captured as the XYOps job diagnostic
#    channel. If not, define the transport and ownership for plugin and CLI
#    diagnostics without putting raw traces in the migration result envelope.
#
# 3. Context propagation:
#    Define how operationID, stage, workspaceID, projectID, and correlation
#    context reach rename, catalog-barrier, and secret Logux helpers.
#
# 4. State observability:
#    Decide whether logs contain every state transition, only terminal state,
#    or both. Define the semantics of unknown/not-started values for
#    catalogDurable and patchObserved, including whether patchObserved is
#    WebSocket-session scoped.
#
# 5. Redaction policy:
#    Approve whether workspace/project IDs are plaintext in opt-in logs and
#    specify a stable non-reversible redaction algorithm for origin and action
#    correlation identifiers.
#
# 6. Output budget and backpressure:
#    Define exact byte and line limits, the logging_suppressed behavior, and
#    whether logging failures are counted, reported once, or silently ignored.
#
# 7. Event schema:
#    Define schema version, timestamp/monotonic sequence requirements, and the
#    distinction between frameType, event, actionType, and derived state.
#    In particular, decide how logux/processed is classified.
#
# 8. Disabled-mode compatibility:
#    Verify that DEBUG_LOGUX=false emits no debug schema fields, raw frames, or
#    debug payloads in the migration result while preserving normal failures.
#
# 9. Evidence fixtures:
#    Add expected redacted JSON fixtures for connect, mutation sent, mutation
#    acknowledgement, absent project broadcast, timeout, secret completion,
#    and wrong-format error handling.
