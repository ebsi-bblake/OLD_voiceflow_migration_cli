@logux @websocket @transport @domain @refactor
Feature: Translate Logux transport signals before domain state machines run
  WebSocket lifecycle concerns belong to a transport boundary. Logux domain
  state machines should receive validated, domain-meaningful events rather than
  raw socket-open, socket-close, ping, or socket-error signals.

  Background:
    Given createFolder, createSecret, renameProject, and syncCatalog use Logux transport
    And BDD18 remains authoritative for exact Logux wire frames
    And raw socket frames and lifecycle signals are untrusted

  @translation
  Scenario: Translate raw WebSocket lifecycle signals into domain events
    Given the shared Logux connection receives open, close, error, timeout, or heartbeat signals
    When the transport boundary handles the signal
    Then it emits a typed domain event such as connected, connection-interrupted, or service-unavailable
    And domain state machines do not consume raw socket lifecycle objects
    And transport-specific details remain at the adapter boundary

  @validation
  Scenario: Validate frames before translating them into domain events
    Given a Logux message arrives as text or an unknown payload
    When the transport boundary parses and validates it
    Then valid frames become operation-specific typed events
    And malformed, stale, duplicate, or out-of-scope frames do not reach domain transition logic
    And correlation and completion policy remains operation-specific
    And invalid raw payloads are not copied into diagnostics

  @heartbeat
  Scenario: Keep heartbeat and ping handling outside domain state machines
    Given the connection requires ping, pong, or heartbeat behavior
    When heartbeat traffic is processed
    Then the shared transport runner handles it
    And no domain reducer transition is created for transport-only heartbeat traffic
    And heartbeat failure becomes a typed connection interruption event when domain action is required

  @isolation
  Scenario: Keep transport failures separate from domain failures
    Given a socket closes before or during a Logux operation
    When the transport boundary reports the interruption
    Then the domain state machine receives the appropriate typed interruption event
    And it applies its own retry, unknown-outcome, or terminal policy
    And the transport layer does not decide domain completion or retryability
    And confirmed operation failures remain distinct from uncertain transport outcomes

  @cleanup
  Scenario: Make translated transport cleanup idempotent
    Given an active shared Logux connection and timeout
    When completion, close, timeout, error, or cancellation signals race
    Then only one domain terminal event is emitted
    And the socket and timer are cleaned up exactly once
    And later transport callbacks cannot change domain state
    And cleanup does not redispatch a non-idempotent operation

  @compatibility
  Scenario: Preserve Logux operation and wire compatibility through translation
    Given folder, secret, rename, or catalog operations use the transport boundary
    When frames and domain events are translated
    Then channel, cursor, action ID, sync ID, completion, and durability policies remain unchanged
    And exact frame positions and payloads remain governed by BDD18
    And public operation results and diagnostics remain compatible

  @acceptance
  Scenario: Complete the Logux transport-domain boundary
    When transport translation tests pass
    Then domain state machines are independent of raw WebSocket lifecycle details
    And shared transport owns connection and heartbeat mechanics
    And operation reducers remain authoritative for domain state
    And transport and domain failures remain distinguishable and safely recoverable
