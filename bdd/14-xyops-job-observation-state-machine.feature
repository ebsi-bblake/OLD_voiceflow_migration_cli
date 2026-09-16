@cli @xyops @job @state-machine
Feature: Reconcile XYOps jobs when stream observation fails
  The execute request produces a job ID before stream observation begins. A
  stream failure must never redispatch the execute request. The CLI performs a
  read-only get_job reconciliation and reports the strongest outcome available.

  Background:
    Given run_event has returned a non-empty job ID
    And the execute request has been dispatched exactly once
    And get_job is a read-only observation operation

  @state-contract
  Scenario: Use the authoritative job observation states
    Then the state variants are:
      | state | meaning |
      | DISPATCHED | job ID exists; no terminal observation yet |
      | STREAMING | stream connection is active |
      | STREAM_RECONCILING | stream failed; get_job is being queried |
      | POLLING | get_job reports the job is active |
      | SUCCEEDED | terminal job and valid Voiceflow success envelope |
      | FAILED | terminal job failure with bounded diagnostic |
      | UNKNOWN_OUTCOME | job outcome cannot be established |
    And no state transition may dispatch execute again

  @stream
  Scenario: Accept a complete successful stream
    Given the state is STREAMING
    When start, update, and end events contain a terminal successful job status
    Then the state becomes SUCCEEDED
    And the Voiceflow envelope is validated
    And no get_job reconciliation is required

  @stream
  Scenario: Reconcile any stream failure through get_job
    Given the state is STREAMING
    When the stream is malformed, incomplete, disconnected, times out, or returns an HTTP/network error
    Then the state becomes STREAM_RECONCILING
    And exactly one read-only get_job request is attempted immediately
    And execute is not redispatched

  @reconciliation
  Scenario Outline: Interpret the reconciled job response
    Given the state is STREAM_RECONCILING
    When get_job returns <response>
    Then the state becomes <state>
    And the CLI performs <action>
    And execute is not redispatched

    Examples:
      | response | state | action |
      | active job | POLLING | continue bounded get_job polling |
      | completed successful job with valid envelope | SUCCEEDED | return the existing result |
      | completed failed job | FAILED | return the job's bounded failure |
      | malformed job response | UNKNOWN_OUTCOME | require reconciliation |
      | network or timeout failure | UNKNOWN_OUTCOME | require reconciliation |

  @polling
  Scenario: Poll an active job without redispatch
    Given get_job reports an active job
    When the polling deadline has not expired
    Then the state remains POLLING
    And the CLI waits according to pollIntervalMs
    And the CLI requests the same job ID again
    When the polling deadline expires
    Then the state becomes UNKNOWN_OUTCOME
    And the diagnostic identifies the get_job endpoint
    And execute is not redispatched

  @validation
  Scenario: Reject a completed job with an invalid Voiceflow envelope
    Given get_job reports a completed successful job
    When its output or data fails the Voiceflow envelope guard
    Then the state becomes UNKNOWN_OUTCOME
    And the raw output is not exposed
    And the CLI does not redispatch execute

  @failure
  Scenario: Preserve an explicit completed plugin failure
    Given get_job reports a completed job with a non-success code
    When the job failure is read
    Then the state becomes FAILED
    And the plugin's bounded stage-specific failure is returned
    And the failure is not converted into a stream parsing error

  @terminal
  Scenario: Ignore duplicate stream and job observations after terminal state
    Given the state is SUCCEEDED, FAILED, or UNKNOWN_OUTCOME
    When another stream event or get_job response arrives
    Then the terminal state does not change
    And the CLI does not issue another execute request

  @transport
  Scenario: Keep transport failures distinct from plugin failures
    Given the stream failed before a terminal status was observed
    When get_job also fails through network or timeout
    Then the result is UNKNOWN_OUTCOME
    And the diagnostic identifies that the job outcome could not be observed
    And the CLI instructs reconciliation before retry
