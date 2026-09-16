@migration @logux @state-machine
Feature: Model Voiceflow Logux operations as explicit state machines
  Logux remains the transport protocol. The plugin models each operation as a
  typed lifecycle state machine so that frame handling, ordering, acknowledgement,
  timeout, and unknown-outcome behavior are explicit.

  Background:
    Given the plugin receives Logux frames as lifecycle events
    And state transitions are evaluated independently from WebSocket side effects
    And WebSocket sends, timers, close, and Promise settlement are performed by the effect shell

  @rename @lifecycle
  Scenario: Advance a project rename through its valid lifecycle
    Given a rename operation starts in CONNECTING
    When the WebSocket opens
    Then the state becomes CONNECTED
    When the connected frame is received
    Then the state becomes SUBSCRIBING
    When the destination workspace subscription is sent
    And the matching synced subscription frame is received
    Then the state becomes SUBSCRIBED
    When the assistant.PATCH_ONE mutation is sent
    Then the state becomes MUTATION_SENT
    When the matching mutation synced frame is received
    Then the state becomes MUTATION_ACKNOWLEDGED
    When the scoped catalog confirmation starts
    Then the state becomes CATALOG_RECONCILING
    When the catalog confirms project ID, workspace ID, folder ID, and timestamped name
    Then the state becomes COMPLETED
    And import may start

  @rename @ordering
  Scenario: Reject rename events that arrive out of order
    Given the rename operation is in SUBSCRIBING
    When a mutation synced frame arrives before the subscription synced frame
    Then the state does not become MUTATION_ACKNOWLEDGED
    And no import request is permitted
    When a project patch for an unrelated project arrives
    Then the state remains unchanged

  @rename @acknowledgement
  Scenario: Treat only the matching mutation synced frame as acknowledgement
    Given the rename operation is in MUTATION_SENT
    And the mutation sync ID is mutation-request
    When a synced frame for another sync ID arrives
    Then the state remains MUTATION_SENT
    When a synced frame for mutation-request arrives
    Then the state becomes MUTATION_ACKNOWLEDGED
    And a generic logux/processed action cannot cause that transition

  @rename @broadcast
  Scenario: Treat project state broadcast as evidence rather than acknowledgement
    Given the rename operation is in MUTATION_SENT
    When a matching project.CRUD:PATCH broadcast arrives
    Then the state remains MUTATION_SENT until mutation-request is synced
    And the broadcast may be recorded as observed evidence
    When mutation-request is synced
    Then the state becomes MUTATION_ACKNOWLEDGED

  @rename @reconciliation
  Scenario: Require catalog reconciliation after mutation acknowledgement
    Given the rename operation is in MUTATION_ACKNOWLEDGED
    When catalog confirmation starts
    Then the state becomes CATALOG_RECONCILING
    When the catalog still shows the old project name
    Then the state remains CATALOG_RECONCILING
    And import remains blocked
    When the catalog confirms the timestamped name and unchanged folder ID
    Then the state becomes COMPLETED

  @rename @unknown-outcome
  Scenario: Represent a socket failure after mutation dispatch as unknown
    Given the rename operation is in MUTATION_SENT
    When the WebSocket closes before the matching mutation synced frame
    Then the state becomes UNKNOWN_OUTCOME
    And the operation does not automatically retry
    And reconciliation is required before another rename or import

  @rename @failure
  Scenario: Represent pre-mutation protocol failure as failed
    Given the rename operation is in SUBSCRIBING
    When Logux returns an explicit error frame
    Then the state becomes FAILED
    And the failure includes a safe server error code when available
    And no mutation or import is attempted

  @rename @timeout
  Scenario: Timeout the active rename state without hiding the lifecycle
    Given the rename operation is in MUTATION_SENT
    When the rename acknowledgement timer expires
    Then the state becomes UNKNOWN_OUTCOME
    And the diagnostic includes the lifecycle state and observed action types
    And the diagnostic excludes JWTs, cookies, secret values, and raw export data

  @secret @lifecycle
  Scenario: Advance secret creation through its valid lifecycle
    Given a secret operation starts in CONNECTING
    When the assistant subscription is synced
    Then the state becomes SUBSCRIBED
    When secret.CREATE_ONE_STARTED is sent with a positive mutation sync ID
    Then the state becomes MUTATION_SENT
    When secret.ADD_ONE is received
    Then the state remains MUTATION_SENT
    When secret.CREATE_ONE_DONE with the matching actionID is received
    Then the state becomes COMPLETED
    And the secret value is not present in diagnostics

  @state-model @pure-core
  Scenario: Keep transition decisions separate from protocol effects
    Given a current lifecycle state and a normalized Logux event
    When the pure transition policy evaluates the event
    Then it returns the next lifecycle state and any required effect descriptions
    And it does not send a WebSocket frame
    And it does not mutate the input state
    And the effect shell performs only the returned protocol effects

  @state-model @terminal
  Scenario: Ignore duplicate events after a terminal state
    Given the operation is COMPLETED, FAILED, or UNKNOWN_OUTCOME
    When another Logux frame or socket event arrives
    Then the terminal state does not change
    And Promise settlement occurs at most once
    And WebSocket cleanup occurs at most once
