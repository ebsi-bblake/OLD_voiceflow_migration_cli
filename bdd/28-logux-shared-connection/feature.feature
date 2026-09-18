@logux @transport @websocket @refactor
Feature: Share Logux connection lifecycle while preserving operation policies
  Frame validation is governed by BDD18 and BDD20. This feature covers the
  remaining cleanup candidate: createFolder, createSecret, renameProject, and
  syncCatalog should use one shared LoguxConnection runner for connection and
  socket lifecycle without erasing operation-specific behavior.

  Background:
    Given the Logux operations createFolder, createSecret, renameProject, and syncCatalog are under test
    And BDD18 remains authoritative for exact frame positions and payloads
    And external frames and socket signals are untrusted and may arrive late or out of order

  @shared-runner
  Scenario: Use one shared LoguxConnection runner for all supported operations
    When any supported Logux operation starts
    Then it uses the shared LoguxConnection runner for handshake, socket creation, message delivery, close, timeout, and cleanup
    And operation modules do not maintain independent duplicate connection lifecycles
    And the shared runner does not change the public operation result contract

  @operation-policy
  Scenario: Preserve operation-specific connection policies
    Given a Logux operation is configured
    When the shared connection runner is started
    Then the operation supplies its channel policy
    And it supplies its cursor policy
    And it supplies its mutation payload only when required
    And it supplies its action or sync correlation policy
    And it supplies its completion parser and durability policy
    And the runner does not infer policy from operation names or frame proximity

  @protocol
  Scenario: Preserve the BDD18 wire-frame contract through the shared runner
    Given an operation sends a Logux handshake, subscription, mutation, or acknowledgement
    When the shared runner serializes and sends the frame
    Then frame positions and payloads remain exactly compatible with BDD18
    And connect frame[1] remains protocol version where the fixture defines it
    And operation-specific cursor omission or inclusion is preserved
    And credentials and secret values are absent from frames and diagnostics

  @events
  Scenario: Translate shared transport signals into operation-owned events
    Given the shared socket receives a frame, close, timeout, or transport error
    When the runner delivers the signal
    Then the operation-specific parser validates and classifies the signal
    And correlation is checked against the operation's action or sync identity
    And stale, duplicate, malformed, and out-of-scope signals are ignored or become typed failures
    And reducers remain the only authority for operation state transitions

  @cleanup
  Scenario: Settle and clean up a shared connection exactly once
    Given a Logux operation has an active socket and timeout
    When success, failure, close, timeout, or cancellation signals race
    Then the operation settles at most once
    And the timeout is cleared
    And the socket is closed safely
    And later frames and callbacks cannot change the settled result
    And cleanup is safe to invoke repeatedly

  @failure
  Scenario: Preserve failure identity through shared transport cleanup
    Given a shared connection fails during handshake, subscription, mutation, or durability observation
    When the operation reports the failure
    Then the canonical diagnostic retains its domain, stage, code, retryability, nextAction, and causes
    And cleanup does not replace the failure with a generic socket error
    And uncertain non-idempotent outcomes remain unknown outcomes
    And no operation is automatically redispatched by the runner

  @isolation
  Scenario: Keep concurrent Logux operations isolated
    Given two supported Logux operations run at the same time
    When either operation receives frames, close signals, or timeouts
    Then each operation uses its own correlation and completion state
    And one operation cannot settle, clean up, or mutate the state of the other
    And each operation preserves its own channel, cursor, mutation, and durability policies

  @acceptance
  Scenario: Complete Logux connection lifecycle consolidation
    When shared connection integration tests pass
    Then all four operations use the shared connection lifecycle
    And BDD18 wire compatibility remains unchanged
    And operation-specific protocol policies remain explicit
    And cleanup and terminal settlement are deterministic and idempotent
    And no duplicated socket lifecycle remains authoritative
