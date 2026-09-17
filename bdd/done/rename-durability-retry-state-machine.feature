@migration @archive @catalog @state-machine
Feature: Model rename durability confirmation as a bounded retry state machine
  After the rename mutation is acknowledged, the destination catalog must
  confirm the renamed project before import begins.

  Background:
    Given the expected project ID, workspace ID, folder ID, and timestamped name are known
    And the catalog confirmation limit is 5 attempts
    And the overall confirmation deadline is 15 seconds from confirmation start
    And each catalog read is bounded by the remaining overall deadline
    And the retry interval is 250 milliseconds or the remaining deadline, whichever is shorter
    And no delay occurs after the final attempt or after the deadline
    And no more than one catalog read or retry timer is active at a time

  @state-contract
  Scenario: Use the authoritative durability states
    Then the state variants are:
      | state | required data |
      | READY | expected project identity and name |
      | ATTEMPTING | attempt number, attemptID, limit, overall deadline, expected identity |
      | WAITING_TO_RETRY | completed attempt number, attemptID, and next retry deadline |
      | CONFIRMED | validated project record |
      | FAILED | stable non-retryable or retryable catalog error and safe diagnostic |
      | EXHAUSTED | final safe diagnostic and retryability |
      | CANCELLED | safe diagnostic and no further effects |

  @lifecycle
  Scenario: Confirm the renamed project on the first catalog read
    Given the state is READY
    When confirmation starts
    Then the state becomes ATTEMPTING with attempt 1
    When the catalog returns exactly one well-formed project with matching ID, workspace, folder, and exact expected name
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
    When the catalog read fails with a transient network, timeout, or dependency failure, or returns no matching project
    Then the failure is recorded as an unsuccessful attempt
    And the bounded retry policy decides whether another attempt remains
    And import remains blocked until CONFIRMED
    When the catalog read fails with authentication, invalid-request, or another permanent error
    Then the state becomes FAILED immediately
    And no retry timer is scheduled
    And import remains blocked

  @bounds
  Scenario: Exhaust catalog confirmation after five attempts
    Given attempts 1 through 4 failed to confirm the expected state
    When attempt 5 fails
    Then the state becomes EXHAUSTED
    And the outcome code is DEPENDENCY_TIMEOUT
    And the outcome is retryable
    And import is not started
    And the diagnostic includes attempt 5 of 5
    And the diagnostic is bounded to 240 characters and contains only a safe failure category and attempt metadata
    And the diagnostic excludes raw catalog records, credentials, tokens, and project payloads

  @identity
  Scenario Outline: Reject catalog records that do not prove the rename
    Given the state is ATTEMPTING
    When the catalog returns a record with <mismatch>
    Then the record does not confirm durability
    And import remains blocked
    And the retry policy remains active unless the attempt limit or overall deadline is exhausted

    Examples:
      | mismatch |
      | another project ID |
      | another workspace ID |
      | another folder ID |
      | the old project name |
      | a missing project record |
      | a malformed project record |
      | duplicate records with the expected project ID |
      | multiple records that otherwise appear to match |

  @correlation
  Scenario: Ignore late responses from superseded attempts
    Given the state is ATTEMPTING with attemptID attempt-2
    When a catalog response or failure arrives with attemptID attempt-1
    Then the response is ignored
    And the state remains ATTEMPTING
    And no retry timer or catalog read is duplicated
    When a response arrives with the current attemptID
    Then it alone can advance the state

  @comparison
  Scenario: Compare project names exactly
    Given the expected name is the trimmed validated timestamped name
    When the catalog returns a project
    Then the name comparison is exact and case-sensitive
    And no additional whitespace, case, Unicode, or label normalization is applied to the catalog value

  @timer
  Scenario: Manage one retry timer per attempt
    Given the state is WAITING_TO_RETRY
    Then exactly one retry timer exists
    When the timer fires
    Then it is cleared before attempt N+1 starts
    And no second timer is scheduled for the same attempt
    When timer creation fails
    Then the state becomes FAILED with DEPENDENCY_FAILURE
    And the diagnostic is safe and retryability is true
    When confirmation becomes CONFIRMED, EXHAUSTED, FAILED, or CANCELLED
    Then any pending retry timer is cancelled

  @terminal
  Scenario: Ignore late catalog responses after confirmation
    Given the state is CONFIRMED, EXHAUSTED, FAILED, or CANCELLED
    When a late catalog response or retry timer fires
    Then the state does not change
    And no additional catalog read is started
    And import is started at most once

  @cancellation
  Scenario: Stop confirmation when migration shutdown or cancellation occurs
    Given a catalog read or retry timer is active
    When the migration is cancelled or its caller abandons confirmation
    Then the state becomes CANCELLED
    And the catalog request is aborted when cancellation is supported
    And an uncancellable late response is ignored
    And the retry timer is cancelled
    And no additional catalog read or import is started
