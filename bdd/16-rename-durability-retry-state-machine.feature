@migration @archive @catalog @state-machine
Feature: Model rename durability confirmation as a bounded retry state machine
  After the rename mutation is acknowledged, the destination catalog must
  confirm the renamed project before import begins.

  Background:
    Given the expected project ID, workspace ID, folder ID, and timestamped name are known
    And the catalog confirmation limit is 5 attempts
    And the retry interval is 250 milliseconds
    And no delay occurs after the final attempt

  @state-contract
  Scenario: Use the authoritative durability states
    Then the state variants are:
      | state | required data |
      | READY | expected project identity and name |
      | ATTEMPTING | attempt number, limit, deadline, expected identity |
      | WAITING_TO_RETRY | completed attempt number and next retry deadline |
      | CONFIRMED | validated project record |
      | EXHAUSTED | final safe diagnostic and retryability |

  @lifecycle
  Scenario: Confirm the renamed project on the first catalog read
    Given the state is READY
    When confirmation starts
    Then the state becomes ATTEMPTING with attempt 1
    When the catalog returns a project with matching ID, workspace, folder, and name
    Then the state becomes CONFIRMED
    And import may start
    And no retry timer is scheduled

  @retry
  Scenario: Retry when the catalog still shows the old state
    Given the state is ATTEMPTING with attempt 1
    When the catalog returns the expected project ID with the old name
    Then the state becomes WAITING_TO_RETRY
    And the next attempt is scheduled after 250 milliseconds
    When the retry timer fires
    Then the state becomes ATTEMPTING with attempt 2
    And import remains blocked

  @retry
  Scenario: Retry transient catalog failures
    Given the state is ATTEMPTING
    When the catalog read fails or returns no matching project
    Then the failure is recorded as an unsuccessful attempt
    And the bounded retry policy decides whether another attempt remains
    And import remains blocked until CONFIRMED

  @bounds
  Scenario: Exhaust catalog confirmation after five attempts
    Given attempts 1 through 4 failed to confirm the expected state
    When attempt 5 fails
    Then the state becomes EXHAUSTED
    And the outcome code is DEPENDENCY_TIMEOUT
    And the outcome is retryable
    And import is not started
    And the diagnostic includes attempt 5 of 5

  @identity
  Scenario Outline: Reject catalog records that do not prove the rename
    Given the state is ATTEMPTING
    When the catalog returns a record with <mismatch>
    Then the record does not confirm durability
    And import remains blocked
    And the retry policy remains active unless the attempt limit is exhausted

    Examples:
      | mismatch |
      | another project ID |
      | another workspace ID |
      | another folder ID |
      | the old project name |
      | a missing project record |

  @terminal
  Scenario: Ignore late catalog responses after confirmation
    Given the state is CONFIRMED or EXHAUSTED
    When a late catalog response or retry timer fires
    Then the state does not change
    And no additional catalog read is started
    And import is started at most once
