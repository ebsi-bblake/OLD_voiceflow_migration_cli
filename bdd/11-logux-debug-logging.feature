@migration @logux @debugging @observability
Feature: Opt-in Voiceflow Logux debugging
  Logux diagnostics are disabled by default. The execute-event parameter is
  DEBUG_LOGUX and is always sent as an explicit boolean. When enabled, the
  plugin emits bounded, structured, allowlisted diagnostics without changing
  migration ordering, acknowledgement, retryability, or unknown-outcome rules.
  Lifecycle names and transition semantics come from bdd/12-logux-state-machine.feature;
  this feature defines their observable diagnostic projection.

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

  @configuration-contract
  Scenario: Resolve all debug configuration sources
    Given the configuration key is debugLogux
    And the environment key is DEBUG_LOGUX
    And the default is false
    When CLI flags, configuration, and environment provide conflicting values
    Then the precedence is CLI flag, configuration, environment, default
    And the execute-event field is named DEBUG_LOGUX
    And the execute-event field is always an explicit boolean
    When the remote DEBUG_LOGUX value is absent or non-boolean
    Then the plugin fails closed with DEBUG_LOGUX=false
    And CLI malformed values remain configuration errors

  @diagnostic-transport
  Scenario: Route diagnostics through the XYOps job diagnostic channel
    Given DEBUG_LOGUX=true
    When the plugin emits a debug record
    Then the record is written to plugin stderr
    And XYOps captures plugin stderr as the job diagnostic channel
    And the CLI may display the channel without parsing it for migration success
    And raw debug records are not placed in the migration result envelope

  @context
  Scenario: Include operation context in every debug record
    Given DEBUG_LOGUX=true
    When any rename, catalog-barrier, or secret Logux record is emitted
    Then operationID and stage are present
    And workspaceID and projectID are present when known
    And the helper receives the context explicitly rather than reading ambient state
    And missing context fields are omitted rather than replaced with empty strings

  @state-observability
  Scenario: Emit state transitions and a terminal state summary
    Given DEBUG_LOGUX=true
    When a Logux operation changes lifecycle state
    Then one record is emitted for the transition
    And the record contains previousState and nextState
    When the operation reaches a terminal state
    Then one terminal summary is emitted
    And catalogDurable is unknown before catalog reconciliation starts
    And patchObserved is scoped to project broadcasts observed on the current rename session

  @redaction
  Scenario: Apply the approved correlation redaction policy
    Given DEBUG_LOGUX=true
    When a debug record contains an origin or action ID
    Then the raw value is never emitted
    And its correlation value is an HMAC-SHA-256 digest using a process-local key truncated to 12 hexadecimal characters
    And the same input correlates within the operation
    And the digest is not reusable across operations after the process key changes
    And workspaceID and projectID are emitted as plaintext approved identifiers

  @output-budget
  Scenario: Enforce deterministic debug output limits
    Given DEBUG_LOGUX=true
    And the debug output limits are 1 MiB and 2000 records per operation
    When either limit is reached
    Then one logging_suppressed record is emitted when possible
    And the record contains the suppressed record count
    And subsequent debug records are dropped
    And migration execution does not wait for dropped records

  @schema-version
  Scenario: Emit a versioned event schema
    Given DEBUG_LOGUX=true
    When a debug record is emitted
    Then schemaVersion is 1
    And timestamp is an ISO-8601 UTC timestamp
    And sequence is a monotonically increasing integer per operation
    And frameType describes the wire frame kind
    And event describes the diagnostic lifecycle event
    And actionType describes the allowlisted action type when present

  @processed-classification
  Scenario: Classify logux processed without confusing it with acknowledgement
    Given DEBUG_LOGUX=true
    When a logux/processed action is received
    Then frameType is sync
    And event is action-received
    And actionType is logux/processed
    And transportProcessing is true
    And mutationAck is not changed by that record

  @disabled-compatibility
  Scenario: Keep the migration contract unchanged when debugging is disabled
    Given DEBUG_LOGUX=false
    When a migration succeeds or fails
    Then the migration result has no debug schema fields
    And the migration result has no raw frames or debug payloads
    And ordinary failure diagnostics retain their existing behavior
    And debug logging cannot change the migration outcome

  @fixtures
  Scenario: Provide redacted records for protocol regression tests
    Given DEBUG_LOGUX=true
    When protocol diagnostics are tested
    Then fixtures cover connect
    And fixtures cover mutation sent
    And fixtures cover mutation acknowledgement
    And fixtures cover an absent project broadcast
    And fixtures cover timeout
    And fixtures cover secret completion
    And fixtures cover a wrong-format error
