@migration @logux @folder @state-machine
Feature: Model Voiceflow Logux folder creation as an explicit state machine
  Folder creation uses a workspace subscription and completes by matching the
  workspace-folder.CREATE_ONE_DONE actionID. It is a reusable Logux operation;
  the current execute_migration archive path does not invoke it.

  Background:
    Given a workspace ID and requested folder name are known
    And the operation has a unique origin and actionID
    And the operation timeout is 15 seconds

  @state-contract
  Scenario: Use the authoritative folder state variants
    Then the state variants are:
      | state | required data |
      | CONNECTING | workspaceID, folderName, origin, actionID |
      | SUBSCRIBING | subscriptionSyncID and folder context |
      | SUBSCRIBED | subscriptionSyncID and folder context |
      | MUTATION_SENT | subscriptionSyncID, actionID, folder context |
      | COMPLETED | validated folder ID and folder name |
      | FAILED | safe error code and diagnostic |
      | UNKNOWN_OUTCOME | safe diagnostic and reconciliation requirement |

  @lifecycle
  Scenario: Create a folder through the valid lifecycle
    Given the state is CONNECTING
    When the socket opens and connected is received
    Then the state becomes SUBSCRIBING
    And the client sends a workspace subscription with since.id "0" and since.time 0
    When the matching subscription synced frame is received
    Then the state becomes SUBSCRIBED
    And the client sends workspace-folder.CREATE_ONE_STARTED
    And the mutation contains context.workspaceID and data.name
    When workspace-folder.CREATE_ONE_DONE arrives with the matching actionID
    Then the folder ID is extracted and validated
    And the state becomes COMPLETED
    And the socket closes once

  @correlation
  Scenario: Ignore unrelated folder completion actions
    Given the state is MUTATION_SENT
    When workspace-folder.CREATE_ONE_DONE has another actionID
    Then the state remains MUTATION_SENT
    When the completion payload has no valid folder ID
    Then the state becomes FAILED
    And the error code is DEPENDENCY_FAILURE
    And no invalid folder ID is returned

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
    When the 15-second deadline expires
    Then the state becomes UNKNOWN_OUTCOME
    And the outcome code is DEPENDENCY_TIMEOUT
    And the outcome is retryable

  @failure
  Scenario Outline: Map folder failure events
    Given the state is <state>
    When <event> occurs
    Then the state becomes <terminal_state>
    And the outcome code is <code>
    And retryability is true
    And cleanup is idempotent

    Examples:
      | state | event | terminal_state | code |
      | CONNECTING | socket error | FAILED | DEPENDENCY_FAILURE |
      | SUBSCRIBING | explicit error frame | FAILED | DEPENDENCY_FAILURE |
      | MUTATION_SENT | socket close | UNKNOWN_OUTCOME | DEPENDENCY_FAILURE |
      | MUTATION_SENT | timeout | UNKNOWN_OUTCOME | DEPENDENCY_TIMEOUT |

  @effects
  Scenario: Keep folder effects separate from transition decisions
    Given a transition requests connect, subscribe, mutation, timer, close, or settle
    Then the effect shell performs that effect exactly once
    And effect failure becomes a normalized socket-error event
    And the reducer performs no WebSocket or timer I/O

  @terminal
  Scenario: Ignore duplicate folder completion after settlement
    Given the state is COMPLETED, FAILED, or UNKNOWN_OUTCOME
    When another completion action or socket event arrives
    Then the state does not change
    And the Promise settles once
    And the socket closes once
