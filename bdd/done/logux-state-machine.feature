@migration @logux @state-machine
Feature: Model Voiceflow Logux operations as explicit state machines
  This is the foundational behavior contract for bdd/11-logux-debug-logging.feature.
  Implement and verify these lifecycle transitions before projecting them into logs.
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

  @state-model @authoritative-type
  Scenario: Use a discriminated state with state-specific data
    Given a rename state-machine instance has the following state variants:
      | state | required data |
      | CONNECTING | operationID, origin, workspaceID, projectID, folderID, requestedName |
      | CONNECTED | operationID, origin, workspaceID, projectID, folderID, requestedName |
      | SUBSCRIBING | subscriptionSyncID and the rename context |
      | SUBSCRIBED | subscriptionSyncID and the rename context |
      | MUTATION_SENT | subscriptionSyncID, mutationSyncID, actionID and the rename context |
      | MUTATION_ACKNOWLEDGED | mutationSyncID, actionID and the rename context |
      | CATALOG_RECONCILING | retryCount, retryLimit, deadline and the rename context |
      | COMPLETED | rename context and catalog confirmation |
      | BYPASSED_NO_COLLISION | operationID and selection context |
      | FAILED | stable error code and safe diagnostic |
      | UNKNOWN_OUTCOME | mutation context, safe diagnostic, and reconciliation requirement |
    When a state is constructed
    Then it contains exactly one discriminant state
    And fields not valid for that state are not required
    And the caller-owned state is not mutated by a transition

  @state-model @normalized-events
  Scenario: Normalize protocol and effect events into the reducer event union
    Given the reducer accepts only normalized events
    When the effect shell receives protocol input
    Then it maps events as follows:
      | input | normalized event |
      | WebSocket open | socket-open |
      | connected frame | connected |
      | matching subscription synced | subscription-synced |
      | matching mutation synced | mutation-synced |
      | matching project.CRUD:PATCH | project-patch |
      | catalog read result | catalog-result |
      | Logux error frame | error-frame |
      | WebSocket error | socket-error |
      | WebSocket close | socket-close |
      | acknowledgement timer | timeout |
      | catalog retry timer | catalog-retry |
    And the reducer does not parse raw JSON
    And the reducer does not perform WebSocket, timer, logging, or Promise effects

  @frames @malformed
  Scenario: Ignore malformed frames without inventing a protocol event
    Given a rename operation is waiting for a subscription or mutation event
    When a WebSocket message is invalid JSON, not an array, has an unsupported frame kind, or lacks required fields
    Then the effect shell emits no normalized protocol event
    And the current state does not advance
    And the operation timer remains active
    When the acknowledgement deadline expires
    Then the operation follows the timeout outcome for its current state
    And the malformed frame is never copied into the failure diagnostic

  @frames @malformed
  Scenario: Treat explicit server error frames as protocol failures
    Given a rename operation is waiting for a subscription acknowledgement
    When a structurally valid error frame is received
    Then the effect shell emits error-frame with only a bounded safe server code
    And the state becomes FAILED
    And the failure is DEPENDENCY_FAILURE and retryable
    And no mutation or import effect is emitted

  @rename @connection
  Scenario: Close the rename socket after acknowledgement before catalog reconciliation
    Given the rename operation is MUTATION_ACKNOWLEDGED
    When the rename socket closes after the matching mutation synced frame
    Then the rename state remains MUTATION_ACKNOWLEDGED
    And the rename Promise is already settled successfully
    And catalog reconciliation runs through its own scoped catalog operation
    And the socket close is not converted into an unknown rename outcome
    When the catalog socket closes during reconciliation
    Then the current catalog attempt fails
    And the bounded catalog retry policy decides whether to retry

  @rename @retry-policy
  Scenario: Apply the bounded catalog confirmation policy
    Given the rename mutation has been acknowledged
    And catalog confirmation has started
    Then the first catalog read is attempt 1
    And at most 5 catalog reads are attempted
    And attempts are separated by 250 milliseconds except after the final attempt
    When a catalog read confirms the expected project
    Then reconciliation completes immediately
    When all 5 reads fail, error, or show the old state
    Then the state becomes FAILED
    And the outcome is DEPENDENCY_TIMEOUT
    And the outcome is retryable
    And import is not permitted

  @outcomes @mapping
  Scenario Outline: Map terminal state to the operation outcome
    Given the operation reaches <state>
    Then the operation code is <code>
    And the retryable flag is <retryable>
    And the diagnostic identifies <meaning>

    Examples:
      | state | code | retryable | meaning |
      | COMPLETED | none | false | successful completion |
      | BYPASSED_NO_COLLISION | none | false | no rename required |
      | FAILED from explicit Logux error | DEPENDENCY_FAILURE | true | confirmed protocol rejection or connection failure |
      | UNKNOWN_OUTCOME after mutation dispatch timeout | DEPENDENCY_TIMEOUT | true | side effect requires reconciliation |
      | CATALOG_RECONCILING after final failed read | DEPENDENCY_TIMEOUT | true | rename acknowledgement exists but durability is unconfirmed |

  @secret @correlation
  Scenario: Ignore secret completion events with the wrong correlation
    Given a secret operation is MUTATION_SENT
    And the expected assistant ID is assistant-expected
    And the expected action ID is action-expected
    When secret.CREATE_ONE_DONE has another action ID
    Then the state remains MUTATION_SENT
    When secret.CREATE_ONE_DONE is for another assistant
    Then the state remains MUTATION_SENT
    When secret.ADD_ONE is duplicated
    Then the state remains MUTATION_SENT
    And the Promise is not settled by any of those events
    When secret.CREATE_ONE_DONE has assistant-expected and action-expected
    Then the state becomes COMPLETED

  @secret @failure
  Scenario: Map secret timeout and socket close after dispatch
    Given secret.CREATE_ONE_STARTED has been sent
    When the secret acknowledgement timer expires
    Then the state becomes UNKNOWN_OUTCOME
    And the outcome is DEPENDENCY_TIMEOUT
    And the outcome is retryable
    And secret creation is not automatically repeated
    When the socket closes before secret completion
    Then the state becomes UNKNOWN_OUTCOME
    And the outcome is DEPENDENCY_FAILURE
    And reconciliation is required before retrying

  @rename @no-collision
  Scenario: Bypass the rename state machine when there is no exact collision
    Given archive preflight finds no exact project collision
    When the rename operation is requested
    Then the state becomes BYPASSED_NO_COLLISION
    And no WebSocket rename session is opened
    And no rename timer is started
    And import may proceed

  @effects @ownership
  Scenario: Keep effect ownership explicit and idempotent
    Given a reducer transition returns effect descriptions
    Then the effect shell owns WebSocket creation and sends
    And the effect shell owns acknowledgement and catalog timers
    And the effect shell cancels a timer when its operation settles
    And the effect shell closes each socket at most once
    And the effect shell settles each Promise at most once
    When a send, timer, or close effect fails
    Then the effect shell emits a normalized socket-error or timeout event
    And the reducer decides the resulting state and operation outcome

  @concurrency @isolation
  Scenario: Isolate concurrent Logux operation instances
    Given two rename or secret operations have different operation IDs and WebSocket origins
    When an event from operation A arrives at operation B
    Then operation B ignores the event
    And operation A state is unchanged by operation B events
    And sync IDs, action IDs, origins, timers, sockets, and settlement belong to one operation instance
    When both operations reach terminal states
    Then each Promise settles independently
    And cleanup for one operation does not close the other operation's socket
