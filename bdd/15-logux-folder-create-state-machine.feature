@migration @logux @folder @state-machine
Feature: Model Voiceflow Logux folder creation as an explicit state machine
  Folder creation uses a workspace subscription and completes by matching the
  workspace-folder.CREATE_ONE_DONE actionID. It is a reusable Logux operation;
  the current execute_migration archive path does not invoke it.

  Background:
    Given a workspace ID and requested folder name are known
    And the operation has a unique origin and actionID
    And workspaceID is a non-empty safe identifier
    And folderName is a non-empty trimmed string with no control characters and at most 128 characters
    And the operation timeout is 15 seconds from operation creation

  @state-contract
  Scenario: Use the authoritative folder state variants
    Then the state variants are:
      | state | required data |
      | CONNECTING | workspaceID, folderName, origin, actionID |
      | CONNECTED | workspaceID, folderName, origin, actionID |
      | SUBSCRIBING | positive subscriptionSyncID and folder context |
      | SUBSCRIBED | subscriptionSyncID and folder context |
      | MUTATION_SENT | subscriptionSyncID, positive mutationSyncID, actionID, folder context |
      | COMPLETED | validated folder ID and folder name |
      | FAILED | safe error code and diagnostic |
      | UNKNOWN_OUTCOME | safe diagnostic and reconciliation requirement |

  @lifecycle
  Scenario: Create a folder through the valid lifecycle
    Given the state is CONNECTING
    When the socket opens
    Then the state becomes CONNECTED
    When connected is received
    Then the state becomes SUBSCRIBING
    And the client allocates a distinct positive subscriptionSyncID
    And the client sends a workspace subscription with since.id "0" and since.time 0
    When the matching subscription synced frame is received
    Then the state becomes SUBSCRIBED
    And the client allocates a distinct positive mutationSyncID
    And the client sends workspace-folder.CREATE_ONE_STARTED using mutationSyncID
    And the mutation contains context.workspaceID, data.name, and meta.origin
    When a synced frame with mutationSyncID arrives
    Then it is recorded as transport acknowledgement only
    And it does not complete the operation
    When workspace-folder.CREATE_ONE_DONE arrives with the matching actionID
    And its normalized event has the requested channel, workspaceID, and origin
    Then the folder ID is extracted and validated
    And the returned folder name matches the normalized requested folder name
    And the state becomes COMPLETED
    And the socket closes once

  @correlation
  Scenario: Ignore unrelated folder completion actions
    Given the state is MUTATION_SENT
    When workspace-folder.CREATE_ONE_DONE has another actionID, origin, channel, or workspaceID
    Then the state remains MUTATION_SENT
    When a structurally valid matching completion has no valid folder ID
    Then the state becomes FAILED
    And the error code is DEPENDENCY_FAILURE
    And no invalid folder ID is returned
    And a valid folder ID is a non-empty numeric string or a finite positive integer normalized to a string
    And supported folder ID locations are payload.id, payload._id, payload.folderID, payload.folder.id, and payload.result.data.id

  @ordering
  Scenario: Do not create a folder before subscription acknowledgement
    Given the state is SUBSCRIBING
    When a different synced request ID arrives
    Then the state remains SUBSCRIBING
    And workspace-folder.CREATE_ONE_STARTED is not sent

  @malformed
  Scenario: Ignore malformed folder frames until timeout
    Given the state is SUBSCRIBING or MUTATION_SENT
    When a non-text message, invalid JSON, non-array frame, or missing action metadata arrives
    Then no normalized completion event is emitted
    And the state does not advance
    When the 15-second deadline from operation creation expires
    Then the state becomes UNKNOWN_OUTCOME
    And the outcome code is DEPENDENCY_TIMEOUT
    And the outcome is retryable

  @failure
  Scenario Outline: Map folder failure events
    Given the state is <state>
    When <event> occurs
    Then the state becomes <terminal_state>
    And the outcome code is <code>
    And retryability is <retryable>
    And cleanup is idempotent

    Examples:
      | state | event | terminal_state | code | retryable |
      | CONNECTING | socket error | FAILED | DEPENDENCY_FAILURE | true |
      | SUBSCRIBING | explicit non-authentication error frame | FAILED | DEPENDENCY_FAILURE | true |
      | SUBSCRIBING | wrong-credentials error frame | FAILED | AUTHENTICATION_FAILED | false |
      | CONNECTING | socket close | FAILED | DEPENDENCY_FAILURE | true |
      | SUBSCRIBING | socket close | FAILED | DEPENDENCY_FAILURE | true |
      | MUTATION_SENT | socket close | UNKNOWN_OUTCOME | DEPENDENCY_FAILURE | true |
      | MUTATION_SENT | timeout | UNKNOWN_OUTCOME | DEPENDENCY_TIMEOUT | true |

  @errors
  Scenario: Bound folder error diagnostics
    Given the state is CONNECTING, SUBSCRIBING, SUBSCRIBED, or MUTATION_SENT
    When an explicit error frame is received
    Then authentication failure is AUTHENTICATION_FAILED and non-retryable
    And every other explicit error is DEPENDENCY_FAILURE and retryable
    And the diagnostic contains only a bounded allowlisted server code and safe operation context
    And raw frames, credentials, folder names, and payload data are excluded

  @effects
  Scenario: Keep folder effects separate from transition decisions
    Given a transition requests connect, subscribe, mutation, timer, close, or settle
    Then the effect shell performs that effect exactly once
    When connect, subscribe, or mutation send throws synchronously
    Then it emits socket-error and the reducer produces FAILED with DEPENDENCY_FAILURE
    When timer setup throws
    Then it emits socket-error and the reducer produces FAILED with DEPENDENCY_FAILURE
    When socket close throws during cleanup
    Then cleanup remains idempotent and the existing terminal outcome is preserved
    And the reducer performs no WebSocket or timer I/O

  @terminal
  Scenario: Ignore duplicate folder completion after settlement
    Given the state is COMPLETED, FAILED, or UNKNOWN_OUTCOME
    When another completion action or socket event arrives
    Then the state does not change
    And the Promise settles once
    And the socket closes once
