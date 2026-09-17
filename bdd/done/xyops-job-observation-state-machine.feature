@cli @xyops @job @state-machine
Feature: Reconcile XYOps jobs when stream observation fails
  The execute request produces a job ID before stream observation begins. A
  stream failure must never redispatch the execute request. The CLI performs a
  read-only get_job reconciliation and reports the strongest outcome available.

  Background:
    Given run_event has returned a non-empty job ID
    And the execute request has been dispatched exactly once
    And get_job is a read-only observation operation
    And pollTimeoutMs is a finite value greater than zero
    And pollIntervalMs is a finite value greater than zero
    And the maximum get_job poll attempts is 100 per reconciliation
    And a job response is normalized from the supported top-level, data, or data.job envelope into one job DTO
    And a terminal job has completed equal to true or a positive number
    And a successful job code is one of 0, 200, "0", "200", "OK", or "ok"
    And a non-success terminal code is an explicit plugin failure

  @state-contract
  Scenario: Use the authoritative job observation states
    Then the state variants are:
      | state | meaning |
      | DISPATCHED | job ID exists; no terminal observation yet |
      | STREAMING | stream connection is active |
      | POLLING | stream failed or get_job reports the job is active; read-only reconciliation is in progress |
      | SUCCEEDED | terminal job and valid Voiceflow success envelope |
      | FAILED | terminal job failure with bounded diagnostic |
      | UNKNOWN_OUTCOME | job outcome cannot be established |
    And no state transition may dispatch execute again

  @lifecycle
  Scenario: Begin stream observation after dispatch
    Given the state is DISPATCHED
    When the execute-dispatched event provides the non-empty job ID
    Then the state becomes STREAMING
    And stream observation starts for that job ID
    And no get_job request is made unless stream observation fails
    And execute is not redispatched

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
    Then the state becomes POLLING
    And exactly one read-only get_job request is attempted immediately
    And that immediate request is the first request of this reconciliation
    And execute is not redispatched

  @reconciliation
  Scenario Outline: Interpret the reconciled job response
    Given the state is POLLING
    When get_job returns <response>
    Then the state becomes <state>
    And the CLI performs <action>
    And execute is not redispatched

    Examples:
      | response | state | action |
      | active job (`completed` false or absent) | POLLING | continue bounded get_job polling |
      | completed successful job (`completed` true/positive, success code) with valid envelope | SUCCEEDED | return the existing result |
      | completed failed job (`completed` true/positive, non-success code) | FAILED | return the job's bounded failure |
      | malformed response or unsupported envelope | UNKNOWN_OUTCOME | require manual reconciliation |
      | network or timeout failure | UNKNOWN_OUTCOME | require manual reconciliation |

  @polling
  Scenario: Poll an active job without redispatch
    Given get_job reports an active job
    When the polling deadline has not expired and fewer than 100 poll attempts have run
    Then the state remains POLLING
    And the CLI waits according to pollIntervalMs, capped at the remaining deadline
    And the CLI requests the same job ID again
    And the immediate reconciliation request counts as attempt 1
    When the polling deadline expires or the 100-attempt limit is reached
    Then the state becomes UNKNOWN_OUTCOME
    And the diagnostic identifies the get_job endpoint
    And execute is not redispatched

  @polling @validation
  Scenario Outline: Reject invalid polling configuration before observation
    Given the state is POLLING
    When <invalid configuration> is supplied
    Then no additional get_job request is started
    And the state becomes UNKNOWN_OUTCOME
    And the diagnostic identifies invalid polling configuration
    And execute is not redispatched

    Examples:
      | invalid configuration |
      | pollIntervalMs is zero |
      | pollIntervalMs is negative |
      | pollIntervalMs is non-finite |
      | pollTimeoutMs is zero |
      | pollTimeoutMs is negative |
      | pollTimeoutMs is overdue at reconciliation start |

  @response-contract
  Scenario: Classify job response fields deterministically
    Given a normalized job DTO
    Then `completed` determines whether the job is terminal
    And `code` determines success or plugin failure only after the job is terminal
    And `output` is parsed as JSON when it is a non-empty string
    And otherwise `data` is used as the job output
    And a missing, empty, or malformed output for a terminal success is UNKNOWN_OUTCOME
    And a missing job ID or unsupported envelope is malformed
    And a job with `completed` false or absent is active rather than malformed

  @validation
  Scenario: Reject a completed job with an invalid Voiceflow envelope
    Given get_job reports a completed successful job
    When its output or data fails the Voiceflow envelope guard
    Then the state becomes UNKNOWN_OUTCOME
    And the raw output is not exposed
    And the CLI does not redispatch execute

  @stream @terminality
  Scenario: Require an end event for stream completion
    Given the state is STREAMING
    When a start or update event contains a terminal-looking job status
    Then the status is retained as a candidate observation
    And the state remains STREAMING until a valid end event arrives
    When an end event has no terminal job status
    Then the stream fails into POLLING
    And the read-only reconciliation policy is applied
    When the stream reaches EOF without an end event
    Then the stream fails into POLLING
    And no execute request is redispatched
    When duplicate terminal events arrive before the end event
    Then the latest valid terminal candidate is used once
    And the stream is not completed more than once

  @failure
  Scenario: Preserve an explicit completed plugin failure
    Given get_job reports a completed job with a non-success code
    When the job failure is read
    Then the state becomes FAILED
    And the plugin's bounded stage-specific failure is returned
    And the failure is not converted into a stream parsing error

  @concurrency
  Scenario: Ignore late observations after reconciliation settles
    Given a read-only get_job request is in flight
    When a late stream event or a terminal get_job result arrives
    Then only the first terminal transition is applied
    And the in-flight request is cancelled when cancellation is supported
    And an uncancellable late response is ignored
    And no additional get_job or execute request is issued

  @recovery
  Scenario: Keep unknown outcomes manual and bounded
    Given the state is UNKNOWN_OUTCOME
    Then no automatic get_job polling resumes
    And no execute request is retried
    And the result is retryable only through a new explicit reconciliation operation
    And any user-invoked rerun is a new top-level operation, not an automatic retry of this job
    And the reconciliation attempt count is not carried into a new user-invoked operation

  @terminal
  Scenario: Ignore duplicate stream and job observations after terminal state
    Given the state is SUCCEEDED, FAILED, or UNKNOWN_OUTCOME
    When another stream event or get_job response arrives
    Then the terminal state does not change
    And the CLI does not issue another execute request

  @errors
  Scenario: Use stable bounded diagnostics for observation failures
    Given the stream or get_job observation fails
    Then stream parsing, transport, malformed-response, envelope, and plugin failures retain distinct stable diagnostic codes
    And stream transport failures use the stream endpoint
    And get_job transport failures use the get_job endpoint
    And malformed responses use the job diagnostic code
    And invalid Voiceflow envelopes use the envelope diagnostic code
    And plugin failures use the bounded sanitized plugin description or a safe fallback
    And diagnostics exclude raw response bodies, credentials, tokens, secret values, and export data
    And retryability is true only for a recoverable observation failure and never authorizes execute redispatch

  @transport
  Scenario: Keep transport failures distinct from plugin failures
    Given the stream failed before a terminal status was observed
    When get_job also fails through network or timeout
    Then the result is UNKNOWN_OUTCOME
    And the diagnostic identifies that the job outcome could not be observed
    And the CLI instructs reconciliation before retry
