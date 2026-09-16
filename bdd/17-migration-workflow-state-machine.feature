@migration @workflow @state-machine
Feature: Model execute_migration as an explicit workflow state machine
  The workflow state records the current migration stage and prevents later
  effects after a terminal outcome. This workflow is not resumable unless a
  separate reconciliation policy explicitly permits a safe follow-up action.

  Background:
    Given a confirmed migration request has a plan ID and operation ID
    And the source and destination selections are validated
    And every terminal transition settles the operation once
    And the canonical diagnostic stage format is `stage=<UPPERCASE_STAGE>`
    And every active workflow has a checkpoint containing operationID, planID, stage, selection, and stage-specific durable identifiers

  @state-contract
  Scenario: Use the authoritative migration stages
    Then the workflow stages are:
      | stage |
      | AUTHENTICATION |
      | EXPORT |
      | PLANNING |
      | ARCHIVE_PREFLIGHT |
      | ARCHIVE |
      | IMPORT |
      | SECRET_INPUT |
      | SECRET_RESOLUTION |
      | SECRET_CREATION |
      | COMPLETED |
      | FAILED |
      | UNKNOWN_OUTCOME |
      | CANCELLED |
    And each state variant contains operationID, planID, selection, and only its valid stage-specific data
    And each stage transition records the operation ID
    And a stage may not silently skip a required predecessor
    And terminal states are COMPLETED, FAILED, UNKNOWN_OUTCOME, and CANCELLED

  @state-machine
  Scenario: Normalize workflow events and keep effects outside the reducer
    Given the reducer receives only normalized workflow events
    Then the event union includes authentication-succeeded, export-succeeded, plan-succeeded, plan-mismatch, archive-preflight-result, archive-renamed, archive-durability-confirmed, archive-durability-unknown, import-succeeded, import-failed, import-unknown, secret-input-resolved, secret-completed, secret-failed, secret-unknown, dependency-failure, timeout, cancellation, and late-event
    And the effect union includes authenticate, export, plan, load-archive-candidates, rename, confirm-archive-durability, import, resolve-secrets, create-next-secret, abort-active-operation, settle-success, and settle-failure
    And the reducer performs no network, filesystem, timer, logging, or Promise effects
    And the effect shell performs each returned effect at most once
    And an effect failure is converted into a normalized event for the current stage

  @transitions
  Scenario: Enforce the required workflow transition order
    Given the workflow is in an active stage
    Then AUTHENTICATION may transition only to EXPORT or a terminal state
    And EXPORT may transition only to PLANNING or a terminal state
    And PLANNING may transition only to ARCHIVE_PREFLIGHT or a terminal state
    And ARCHIVE_PREFLIGHT may transition to ARCHIVE or IMPORT when no collision exists
    And ARCHIVE may transition to IMPORT only after archive durability is confirmed
    And IMPORT may transition only to SECRET_INPUT or a terminal state
    And SECRET_INPUT may transition only to SECRET_RESOLUTION or a terminal state
    And SECRET_RESOLUTION may transition only to SECRET_CREATION or a terminal state
    And SECRET_CREATION may transition to itself for the next secret or COMPLETED or a terminal failure state
    And no event may transition backward into AUTHENTICATION, EXPORT, or PLANNING

  @happy-path
  Scenario: Execute the complete migration in order
    Given authentication succeeds
    When export succeeds
    Then the workflow enters PLANNING
    When the computed plan ID matches the requested plan ID
    Then the workflow enters ARCHIVE_PREFLIGHT
    When no exact collision exists or archive rename and durability confirmation complete
    Then the workflow enters IMPORT
    When import returns a usable imported project ID
    Then the workflow enters SECRET_INPUT
    When secrets are parsed and resolved
    Then the workflow enters SECRET_CREATION
    When every configured secret completes sequentially
    Then the workflow enters COMPLETED
    And the success envelope contains export, import, plan, selection, and warning data

  @confirmation
  Scenario: Stop before effects when confirmation is not literal true
    Given confirmation is absent, false, or any non-boolean value
    When execute_migration starts
    Then the workflow becomes FAILED
    And the outcome code is CONFIRMATION_REQUIRED
    And export, archive, import, and secret effects are not started

  @plan
  Scenario: Stop on a plan mismatch
    Given export and planning succeed
    When the computed plan ID differs from the requested plan ID
    Then the workflow becomes FAILED
    And the outcome code is PLAN_MISMATCH
    And import and secret creation are not started

  @archive
  Scenario: Keep import behind archive durability
    Given archive preflight finds an exact collision
    When the rename mutation is acknowledged
    Then the workflow remains in ARCHIVE
    And archive rename and durability confirmation are one required ARCHIVE stage
    And import remains blocked until the durability state is CONFIRMED
    When durability is confirmed and its Promise settles successfully
    Then the workflow enters IMPORT
    When rename or durability reaches UNKNOWN_OUTCOME
    Then the workflow enters UNKNOWN_OUTCOME
    And import remains blocked

  @import
  Scenario: Treat import failure as terminal
    Given the workflow is in IMPORT
    When import returns a dependency failure or a confirmed import rejection
    Then the workflow becomes FAILED
    And secret creation does not start
    And the failure includes stage=IMPORT
    When the import outcome is unknown
    Then the workflow becomes UNKNOWN_OUTCOME
    And the outcome code is IMPORT_OUTCOME_UNKNOWN
    And the diagnostic contains stage=IMPORT and no raw response data
    And retry requires destination reconciliation

  @secrets
  Scenario: Create secrets sequentially after import
    Given import returned imported project ID
    And secrets are configured
    When the first secret is sent
    Then the next secret is not sent until the first reaches COMPLETED
    When one secret fails
    Then no later secret is sent automatically
    And the workflow becomes FAILED with a stable dependency or validation code
    And the diagnostic contains stage=SECRET_CREATION and no secret value
    And the imported project is not discarded or re-imported automatically
    When one secret has an unknown outcome
    Then the workflow becomes UNKNOWN_OUTCOME
    And no later secret is sent automatically
    And the secret is not marked completed until reconciliation proves its completion
    And the imported project is not discarded or re-imported automatically

  @secret-recovery
  Scenario: Resume secret work from a durable checkpoint
    Given the checkpoint contains importedProjectID and completed secret identities
    And completed secret identities include name, actionID, and confirmed completion
    When secret creation resumes
    Then completed secret identities are skipped
    And only the first incomplete secret is sent
    And an unknown secret outcome requires reconciliation by project, secret identity, and actionID before retry
    And a secret is never resent solely because the process restarted

  @no-secrets
  Scenario: Complete without configured secrets
    Given import succeeded
    And the resolved secret list is empty
    When secret input and resolution complete
    Then no Logux secret socket is opened
    And the workflow enters COMPLETED

  @errors
  Scenario Outline: Attach the current stage to failures
    Given the workflow is in <stage>
    When an unexpected or dependency failure occurs before a side effect outcome is unknown
    Then the workflow becomes FAILED
    And the failure diagnostic contains stage=<stage>
    And the diagnostic uses the uppercase canonical stage name
    And the diagnostic is bounded and contains only a safe failure category and non-sensitive identifiers
    And later stage effects do not start
    And the result does not expose credentials, secret values, or export payloads

    Examples:
      | stage |
      | AUTHENTICATION |
      | EXPORT |
      | PLANNING |
      | ARCHIVE_PREFLIGHT |
      | ARCHIVE |
      | IMPORT |
      | SECRET_INPUT |
      | SECRET_RESOLUTION |
      | SECRET_CREATION |

  @failure-policy
  Scenario Outline: Map stable workflow failure outcomes
    Given the workflow is in an active stage
    When <failure> occurs
    Then the workflow becomes <state>
    And the outcome code is <code>
    And retryability is <retryable>
    And the diagnostic contains the current canonical stage
    And no later stage effect starts

    Examples:
      | failure | state | code | retryable |
      | invalid confirmation | FAILED | CONFIRMATION_REQUIRED | false |
      | plan mismatch | FAILED | PLAN_MISMATCH | false |
      | authentication failure | FAILED | AUTHENTICATION_FAILED | false |
      | transient dependency failure | FAILED | DEPENDENCY_FAILURE | true |
      | dependency timeout before side effect | FAILED | DEPENDENCY_TIMEOUT | true |
      | archive rename unknown outcome | UNKNOWN_OUTCOME | DEPENDENCY_FAILURE | true |
      | archive durability timeout | UNKNOWN_OUTCOME | DEPENDENCY_TIMEOUT | true |
      | import unknown outcome | UNKNOWN_OUTCOME | IMPORT_OUTCOME_UNKNOWN | true |
      | secret unknown outcome | UNKNOWN_OUTCOME | DEPENDENCY_TIMEOUT | true |
      | cancellation | CANCELLED | INTERNAL_ERROR | false |

  @cancellation
  Scenario: Cancel active workflow effects and suppress late events
    Given the workflow is in AUTHENTICATION, EXPORT, PLANNING, ARCHIVE_PREFLIGHT, ARCHIVE, IMPORT, SECRET_INPUT, SECRET_RESOLUTION, or SECRET_CREATION
    And an HTTP request, Logux socket, timer, or secret Promise is active
    When cancellation occurs
    Then the workflow becomes CANCELLED
    And active effects are aborted or closed when supported
    And retry timers are cancelled
    And uncancellable late events are ignored
    And no later stage effect starts
    And settlement occurs once

  @terminal
  Scenario: Ignore late events after workflow settlement
    Given the workflow is COMPLETED, FAILED, UNKNOWN_OUTCOME, or CANCELLED
    When a late Logux event, HTTP response, timer, or Promise callback arrives
    Then no later stage starts
    And the result envelope is not replaced
    And operation settlement occurs once

  @recovery
  Scenario: Resume only from proven durable checkpoints
    Given a prior workflow ended with UNKNOWN_OUTCOME
    When reconciliation proves archive durability
    Then resume starts at IMPORT without repeating authentication, export, planning, or archive rename
    When reconciliation proves import completion and returns importedProjectID
    Then resume starts at SECRET_INPUT or SECRET_RESOLUTION without repeating import
    When reconciliation proves a secret completion
    Then resume starts at the next incomplete secret in SECRET_CREATION
    When reconciliation cannot prove the side effect
    Then the workflow remains UNKNOWN_OUTCOME
    And no effect is started automatically
    And every resumed operation receives a new operationID linked to the checkpoint operationID

  @recovery
  Scenario: Distinguish safe follow-up recovery from full migration retry
    Given a prior workflow ended with an unknown outcome
    When reconciliation proves only the rename completed
    Then the operator may resume from the archive durability/import boundary
    And the source export is not repeated automatically
    When reconciliation proves import completed but secret creation is incomplete
    Then the operator may retry only the remaining safe secret work
    And the entire migration is not rerun automatically
    When reconciliation cannot establish the completed side effect
    Then the workflow remains UNKNOWN_OUTCOME
    And no automatic retry occurs
