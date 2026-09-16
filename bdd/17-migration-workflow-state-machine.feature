@migration @workflow @state-machine
Feature: Model execute_migration as an explicit workflow state machine
  The workflow state records the current migration stage and prevents later
  effects after a terminal outcome. This workflow is not resumable unless a
  separate reconciliation policy explicitly permits a safe follow-up action.

  Background:
    Given a confirmed migration request has a plan ID and operation ID
    And the source and destination selections are validated
    And every terminal transition settles the operation once

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
    And each stage transition records the operation ID
    And a stage may not silently skip a required predecessor

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
    And import remains blocked until the durability state is CONFIRMED
    When durability is confirmed
    Then the workflow enters IMPORT

  @import
  Scenario: Treat import failure as terminal
    Given the workflow is in IMPORT
    When import returns a dependency failure or a confirmed import rejection
    Then the workflow becomes FAILED
    And secret creation does not start
    And the failure includes stage=import
    When the import outcome is unknown
    Then the workflow becomes FAILED with an unknown-outcome code
    And retry requires destination reconciliation

  @secrets
  Scenario: Create secrets sequentially after import
    Given import returned imported project ID
    And secrets are configured
    When the first secret is sent
    Then the next secret is not sent until the first reaches COMPLETED
    When one secret fails or has an unknown outcome
    Then no later secret is sent automatically
    And the workflow becomes FAILED
    And the imported project is not discarded or re-imported automatically

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
    When an unexpected or dependency failure occurs
    Then the workflow becomes FAILED
    And the failure diagnostic contains stage=<stage>
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

  @terminal
  Scenario: Ignore late events after workflow settlement
    Given the workflow is COMPLETED or FAILED
    When a late Logux event, HTTP response, timer, or Promise callback arrives
    Then no later stage starts
    And the result envelope is not replaced
    And operation settlement occurs once

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
