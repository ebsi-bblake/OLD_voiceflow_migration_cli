@refactor @state-machines @runtime @safety
Feature: Make runtime state transitions authoritative
  The reducer and state-machine transitions exercised by tests must also control
  production execution. There must be one runtime source of truth for migration,
  job observation, and Logux lifecycle state. Pure reducers may be retained, but
  they must not become shadow models bypassed by imperative code.

  Background:
    Given the active XYOps migration implementation is under test
    And all external results are converted into typed events before state changes
    And every operation has an operation ID and explicit stage context

  @migration
  Scenario: Drive migration execution through the authoritative workflow reducer
    Given a confirmed migration is started
    When authentication, export, planning, archive, import, secret resolution, and secret creation execute
    Then each result becomes a typed MigrationWorkflowEvent
    And transitionMigrationWorkflow is the authoritative runtime reducer
    And reducer effects are the only mechanism that starts the next workflow operation
    And no independent mutable stage variable controls the workflow
    And diagnostic stage data comes from the same state used for control flow
    And the runtime cannot execute an operation that the current state does not permit

  @migration @ordering
  Scenario: Preserve migration stage ordering
    When a migration executes successfully
    Then the only permitted order is:
      | order | stage |
      | 1 | AUTHENTICATION |
      | 2 | EXPORT |
      | 3 | PLANNING |
      | 4 | ARCHIVE_PREFLIGHT |
      | 5 | ARCHIVE when an exact collision exists |
      | 6 | IMPORT |
      | 7 | SECRET_INPUT |
      | 8 | SECRET_RESOLUTION |
      | 9 | SECRET_CREATION when secrets remain |
      | 10 | COMPLETED |
    And import never starts before archive durability is confirmed
    And secret creation never starts before import returns a usable destination identity
    And archive, import, and secret failures prevent downstream effects

  @migration @invalid-events
  Scenario: Reject invalid and late migration events
    Given the workflow is in a non-terminal stage
    When an event for another stage arrives
    Then the authoritative reducer rejects it
    And no effect is emitted
    And state, diagnostic context, and cause chain remain unchanged
    Given the workflow is terminal
    When a late success, failure, timeout, or dependency event arrives
    Then the reducer rejects it
    And no new external operation starts
    And settlement and cleanup occur at most once

  @migration @compatibility
  Scenario: Resolve the previous shadow-state contradiction
    Given executeConfirmedMigration is the runtime entrypoint
    When the refactor is complete
    Then it invokes the authoritative workflow reducer through an explicit runtime adapter
    And execute-migration-state-machine.ts is either the reducer used by production or is replaced by an equivalent single authoritative reducer
    And no pure workflow reducer remains unused by production while its tests claim lifecycle coverage
    And there is no second imperative state model with different transitions

  @rename
  Scenario: Preserve the rename durability barrier in one authoritative workflow
    Given an exact destination project collision has been selected
    When the project rename workflow runs
    Then its typed events represent connection, subscription, mutation dispatch, mutation acknowledgement, catalog polling, and confirmation
    And catalog confirmation matches project ID, workspace ID, folder ID, and timestamped name
    And import cannot be dispatched before confirmation
    And a timeout or socket close after mutation dispatch is classified as unknown side effect
    And the rename is not blindly resent

  @rename @failure
  Scenario: Stop safely when rename durability cannot be confirmed
    Given the rename mutation is acknowledged or its outcome is uncertain
    And bounded catalog reconciliation cannot confirm the expected project
    When the workflow completes
    Then it emits one retryable dependency failure or the existing compatible unknown-outcome classification
    And no migration import starts
    And the diagnostic is bounded and contains no credentials, secret values, or raw protocol payloads

  @job-observation
  Scenario: Drive every job-observation path through its reducer
    Given an execute job has been dispatched
    When the stream succeeds, fails, times out, or emits incomplete output
    Then each observation result becomes a typed JobObservationEvent
    And transitionJobObservation is invoked for every lifecycle event
    And the runtime state controls whether streaming, polling, success, failure, or unknown outcome follows
    And the runtime does not call pollJob directly as a bypass around the reducer
    And execute is never dispatched again because observation failed

  @job-observation @polling
  Scenario: Use one polling reconciliation state
    Given the job observer is STREAMING
    When the stream fails or times out
    Then one reducer transition enters POLLING with the current attempt policy
    And each get_job response produces a reducer event
    And a confirmed completed job reaches SUCCEEDED
    And a confirmed failed job reaches FAILED
    And an exhausted or ambiguous observation reaches UNKNOWN_OUTCOME
    And no separate STREAM_RECONCILING state is needed for control flow

  @job-observation @public-contract
  Scenario: Preserve the existing public unknown-outcome contract
    Given polling cannot establish whether the remote execute side effect completed
    When the observer reaches UNKNOWN_OUTCOME
    Then the internal state remains explicitly UNKNOWN_OUTCOME
    And the public result retains execute-outcome-unknown
    And nextAction requires reconciliation before retry
    And retryability follows the existing non-idempotent execution policy

  @logux
  Scenario Outline: Use operation reducers as Logux runtime authority
    Given a Logux operation of type "<operation>" is active
    When a socket, handshake, subscription, mutation, completion, error, timeout, or close event arrives
    Then the frame is normalized into the operation's typed event
    And the operation reducer determines whether the event is accepted
    And reducer effects determine sends, cleanup, and settlement
    And socket callbacks do not independently mutate lifecycle state outside the reducer
    And unrelated operation, channel, action, workspace, assistant, project, folder, and sync identities are ignored

    Examples:
      | operation |
      | catalog synchronization |
      | folder creation |
      | secret creation or reconciliation |
      | project rename |

  @logux @protocol
  Scenario: Preserve operation-specific protocol policies in shared transport
    Given a shared Logux transport adapter is used by multiple operations
    When it creates a connection, subscription, mutation, or completion event
    Then the handler explicitly supplies channel, cursor policy, mutation sync ID policy, action ID, completion action, and parser
    And the adapter does not force one subscription frame shape on every operation
    And the adapter does not force one mutation sync ID strategy on every operation
    And logux/processed is never treated as universal mutation durability evidence
    And rename catalog durability remains a separate explicit read barrier
    And exact wire shapes remain governed by bdd/18-logux-wire-frame-fixtures/protocol.md

  @cleanup
  Scenario: Settle runtime operations exactly once
    Given a socket, timer, request, or stream reader is active
    When success, failure, cancellation, timeout, and close signals race
    Then the reducer accepts at most one terminal transition
    And cleanup effects execute safely and at most once
    And timers, sockets, readers, and abort signals are released
    And later frames cannot change the settled state, result, or diagnostic

  @tests
  Scenario: Test runtime wiring rather than only pure reducer behavior
    When the runtime refactor tests run
    Then tests prove production entrypoints invoke the authoritative reducers
    And tests prove every accepted reducer effect is executed by its runtime adapter
    And tests prove direct polling, direct stage advancement, and direct socket sends cannot bypass the reducer contract
    And tests cover malformed events, stale events, late events, cancellation, timeout, and unknown side effects
    And tests assert operation IDs, public error identifiers, retryability, and nextAction compatibility

  @acceptance
  Scenario: Complete the authoritative runtime refactor
    When all runtime acceptance checks pass
    Then tested transitions and production transitions are the same transitions
    And no shadow migration workflow or unused runtime state transition remains
    And runtime ordering, durability barriers, cleanup, and unknown-outcome safety are preserved
