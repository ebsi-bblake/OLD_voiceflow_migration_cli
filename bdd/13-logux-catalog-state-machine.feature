@migration @logux @catalog @state-machine
Feature: Model Voiceflow Logux catalog synchronization as an explicit state machine
  Catalog synchronization is a bounded read operation. It subscribes to one
  channel, accepts only requested action types, accumulates a bounded snapshot,
  and completes only after every requested type has been observed.

  Background:
    Given a catalog operation has an operation ID, channel, and requested action types
    And requested action types are a non-empty subset of:
      | workspace.CRUD:REPLACE |
      | project.CRUD:REPLACE |
      | assistant.REPLACE |
      | workspace-folder.REPLACE |
    And the maximum incoming frame is 1 MiB
    And the maximum incoming byte total is 8 MiB
    And the maximum catalog row count is 100000
    And the operation timeout is 15 seconds

  @state-contract
  Scenario: Use the authoritative catalog state variants
    Given a catalog state machine instance
    Then its state variants are:
      | state | required data |
      | CONNECTING | operationID, channel, requestedTypes |
      | SUBSCRIBING | subscriptionSyncID and catalog context |
      | COLLECTING | subscriptionSyncID, seenTypes, rows, byteCount |
      | COMPLETED | immutable rows and seenTypes |
      | FAILED | stable error code and safe diagnostic |
      | TIMED_OUT | safe diagnostic and retryability |
    And rows, seenTypes, and context are immutable transition results

  @events
  Scenario: Normalize catalog socket events
    Given the effect shell receives catalog input
    When it receives a WebSocket open, connected frame, matching synced frame, requested action, error frame, socket error, socket close, malformed frame, or timeout
    Then it emits exactly one normalized event from:
      | socket-open |
      | connected |
      | subscription-synced |
      | catalog-action |
      | error-frame |
      | socket-error |
      | socket-close |
      | malformed-frame |
      | timeout |
    And the reducer receives normalized events rather than raw JSON

  @lifecycle
  Scenario: Complete a catalog snapshot only after all requested types arrive
    Given the state is SUBSCRIBING
    When the matching subscription synced event arrives
    Then the state becomes COLLECTING
    And the workspace subscription effect is active
    When each requested action type arrives with valid rows
    Then its type is added to seenTypes
    And rows are accumulated without mutating prior state
    When every requested type is in seenTypes
    Then the state becomes COMPLETED
    And the result contains only the requested catalog rows
    And the socket closes once

  @filtering
  Scenario: Ignore valid but unrequested catalog actions
    Given the state is COLLECTING
    When a valid action type not in requestedTypes arrives
    Then the state remains COLLECTING
    And the action is not added to seenTypes
    And its rows are not added to the result

  @correlation
  Scenario: Ignore acknowledgements and actions from another request
    Given the state is SUBSCRIBING or COLLECTING
    When a synced frame has another sync ID
    Then the state does not advance
    When an action belongs to another channel, workspace, or operation
    Then the action is ignored
    And the catalog result remains scoped to the requested channel

  @bounds
  Scenario Outline: Fail safely when an incoming bound is exceeded
    Given the state is COLLECTING
    When <bound> is exceeded
    Then the state becomes FAILED
    And the error code is DEPENDENCY_FAILURE
    And the error is retryable
    And the oversized frame or excess rows are not retained
    And the socket closes once

    Examples:
      | bound |
      | one frame exceeds 1 MiB |
      | total incoming data exceeds 8 MiB |
      | catalog rows exceed 100000 |

  @malformed
  Scenario: Ignore malformed catalog input without inventing rows
    Given the state is COLLECTING
    When JSON is invalid, the message is not text, the frame is not an array, or the action payload is malformed
    Then the state does not advance from the malformed event
    And no malformed row is accumulated
    And the malformed payload is not copied into diagnostics
    And the 15-second timeout remains active

  @errors
  Scenario Outline: Map terminal catalog failures
    Given the state is <state>
    When <event> occurs
    Then the state becomes <terminal_state>
    And the error code is <code>
    And retryability is <retryable>
    And cleanup closes the socket at most once

    Examples:
      | state | event | terminal_state | code | retryable |
      | CONNECTING | socket error | FAILED | DEPENDENCY_FAILURE | true |
      | SUBSCRIBING | explicit Logux error frame | FAILED | DEPENDENCY_FAILURE | true |
      | COLLECTING | socket close before completion | FAILED | DEPENDENCY_FAILURE | true |
      | COLLECTING | 15-second timeout | TIMED_OUT | DEPENDENCY_TIMEOUT | true |

  @terminal
  Scenario: Ignore duplicate catalog terminal events
    Given the catalog state is COMPLETED, FAILED, or TIMED_OUT
    When another frame, timeout, error, or close event arrives
    Then the state does not change
    And the Promise settles once
    And the socket closes once

  @effects
  Scenario: Keep catalog effects outside the pure reducer
    Given a reducer transition returns effect descriptions
    Then the effect shell owns WebSocket creation, sends, timers, and close
    And the reducer performs no I/O
    And a send or timer failure becomes a normalized event
    And the resulting terminal outcome is decided by the reducer
