@migration @archive @logux @rename @protocol
Feature: Safely rename a colliding Voiceflow project before import
  When a destination project has the same name as the source project, the native
  plugin must rename the existing destination project with a timestamp before
  importing the new project. The renamed project remains in its original folder.

  This feature records the observed Voiceflow Logux protocol and the required
  ordering guarantees so that a future implementation does not confuse transport
  processing with durable project state.

  Background:
    Given the destination workspace ID is known
    And the destination folder ID is known
    And the colliding destination project ID is known
    And the source project name is known
    And the archive name is computed as <source_name>_YYYYMMDD_HHmm
    And no project move or Archive-folder operation is part of this feature

  @collision
  Scenario: Rename only an exact destination collision
    Given a project with the source name exists in the destination workspace and folder
    And another project with the source name exists outside that folder
    When archive preflight runs
    Then only the project in the exact destination workspace and folder is selected
    And the selected project ID is retained for the rename
    And the project outside the destination folder is unchanged
    And import remains blocked until rename completion

  @no-collision
  Scenario: Skip Logux rename when no exact collision exists
    Given no project with the source name exists in the exact destination workspace and folder
    When archive preflight runs
    Then no rename WebSocket mutation is sent
    And no timestamped project is created
    And import may proceed with the original source name

  @session-invariants
  Scenario: Establish one authenticated Logux session
    When the plugin opens the rename WebSocket
    Then it sends a connect frame with the shape:
      | position | value |
      | 0 | connect |
      | 1 | 4 |
      | 2 | origin |
      | 3 | 0 |
      | 4.token | VOICEFLOW_JWT |
      | 4.subprotocol | 1.9.0 |
    And the origin is stable for the lifetime of the WebSocket session
    And the origin identifies the creator, client, and session
    And the token is never written to diagnostics

  @subscription-invariants
  Scenario: Subscribe to the destination workspace before mutation
    Given the connect frame has completed
    When the plugin subscribes to the destination workspace
    Then it sends a sync frame with a positive numeric subscription request ID
    And the action type is logux/subscribe
    And the channel is workspace/<destination_workspace_id>
    And the current rename subscription frame does not include a since field
    When Logux returns synced for that subscription request ID
    Then the plugin is authorized to send the rename mutation
    When Logux returns synced for a different request ID
    Then the plugin does not send the rename mutation because the subscription is not complete

  @mutation-invariants
  Scenario: Send the rename mutation on the active workspace subscription
    Given the workspace subscription has returned synced
    When the plugin sends the rename mutation
    Then the sync frame request ID is a distinct positive mutation request ID
    And the action type is assistant.PATCH_ONE
    And the payload has the shape:
      | field | value |
      | payload.id | colliding_project_id |
      | payload.patch.name | timestamped_archive_name |
      | payload.context.workspaceID | destination_workspace_id |
    And the action has meta.origin equal to the session origin
    And the action has a locally generated non-empty meta.actionID
    And the original project folder is not changed by the rename mutation
    And no project relocation mutation is sent

  @processed-invariants
  Scenario: Treat logux processed as transport processing only
    Given the rename mutation has been sent
    When Logux returns a frame with an action of:
      "{id: '<timestamp> <origin> 0', type: 'logux/processed'}"
    Then the frame is recognized as transport processing for the session origin
    And the processed action has no mutation actionID
    And the rename operation remains pending
    And import does not start
    And a processed frame for an unrelated origin is ignored
    And a processed frame cannot by itself prove that the project is durably renamed

  @project-patch-invariants
  Scenario: Recognize the project patch broadcast
    Given the rename mutation has been processed by Logux
    When Voiceflow broadcasts:
      "{type: 'project.CRUD:PATCH', payload: {workspaceID, key, value: {name}}, meta: {origin, actionID}}"
    Then the action type is project.CRUD:PATCH
    And payload.workspaceID equals the destination workspace ID
    And payload.key equals the colliding project ID
    And payload.value.name equals the requested timestamped archive name
    And meta.origin equals the session origin
    And the response meta.actionID may differ from the request meta.actionID
    And the response actionID must not be compared to the request actionID
    And the project patch is an observed state-change broadcast, not the WebSocket mutation acknowledgement

  @ordering
  Scenario: Keep import behind the rename acknowledgement
    Given the rename mutation has been sent
    When logux/processed is received
    Then import remains blocked
    When the matching mutation synced is received
    Then the WebSocket rename acknowledgement completes
    And import remains blocked until the durable catalog barrier completes
    And only then may the import request be sent
    And the imported project keeps the original source name

  @durability-barrier
  Scenario: Confirm renamed state before calling import
    Given the matching mutation synced has been received
    When the rename completion barrier runs
    Then the plugin re-reads the destination project state through the established catalog boundary
    And the read is scoped to the destination workspace
    And the colliding project ID is still present
    And that project is represented with the timestamped archive name
    And the read-after-write confirmation completes before import starts
    And the renamed project remains in its original destination folder

  @race-prevention
  Scenario: Prevent Voiceflow from applying its automatic copy suffix
    Given Voiceflow applies "(n)" when the import endpoint still sees a name collision
    And the colliding project has been selected for timestamp renaming
    When rename acknowledgement and the durable-state barrier complete
    Then the import request is sent only after the old name is no longer authoritative for that project
    And Voiceflow does not need to create the imported project as "<source_name> (1)"
    And the imported project may retain the original source name

  @race-prevention
  Scenario: Do not claim the race is solved from a broadcast alone
    Given the matching mutation synced has been observed on the WebSocket
    When the authoritative catalog still represents the project under the old name
    Then rename completion has not been established
    And import remains blocked
    And the operation retries the state confirmation within its bounded retry policy
    And a timeout returns a retryable dependency failure

  @correlation
  Scenario: Reject a project patch for another project
    Given a project.CRUD:PATCH is received with the session origin
    When payload.key does not equal the colliding project ID
    Then the patch does not complete the rename
    And import remains blocked

  @correlation
  Scenario: Reject a project patch for another workspace
    Given a project.CRUD:PATCH is received with the session origin
    When payload.workspaceID does not equal the destination workspace ID
    Then the patch does not complete the rename
    And import remains blocked

  @correlation
  Scenario: Reject a project patch with the wrong requested name
    Given a project.CRUD:PATCH is received for the correct workspace and project
    When payload.value.name does not equal the computed timestamped archive name
    Then the patch does not complete the rename
    And import remains blocked

  @correlation
  Scenario: Accept a server-generated response action ID
    Given the outgoing rename actionID is request-action
    And the outgoing origin is session-origin
    When the response project.CRUD:PATCH has actionID response-action
    And the response project.CRUD:PATCH has origin session-origin
    And workspace, project ID, and requested name all match
    Then the response is accepted as observed rename state propagation
    And the differing response actionID is not treated as an error
    And the response does not replace the matching mutation synced acknowledgement

  @timeouts
  Scenario: Stop safely when the mutation acknowledgement is never observed
    Given the rename mutation has been sent
    When no matching mutation synced arrives before the rename timeout
    Then the rename operation fails with DEPENDENCY_TIMEOUT
    And the error is retryable
    And import is not started
    And the diagnostic includes the stage and observed action types
    And the diagnostic excludes the JWT and raw sensitive payloads

  @optional-broadcast
  Scenario: Do not fail the WebSocket operation when the project broadcast is absent
    Given the matching mutation synced has been received
    And no matching project.CRUD:PATCH arrives
    When the rename WebSocket operation completes
    Then the rename acknowledgement is complete
    And the catalog durability barrier is required before import

  @timeouts
  Scenario: Stop safely when durable state never reflects the rename
    Given the matching mutation synced has been observed
    When the authoritative catalog never reflects the timestamped name
    Then the rename barrier fails with a retryable dependency timeout
    And import is not started
    And the operation does not silently continue with Voiceflow automatic suffix behavior

  @connection
  Scenario: Fail safely on Logux errors and close
    Given the rename WebSocket is open
    When Logux sends an error frame
    Then the rename operation fails with a dependency failure
    And import is not started
    When the WebSocket closes before rename completion
    Then the rename operation fails with a dependency failure
    And the socket cleanup is idempotent

  @duplicates
  Scenario: Ignore duplicate acknowledgements after completion
    Given the matching mutation synced has completed the WebSocket rename
    When another matching project patch arrives
    Then the Promise settles only once
    And the WebSocket is closed only once
    And import is started at most once

  @timestamp
  Scenario: Generate a unique timestamped archive name
    Given the source project name is Customer Assistant
    And the local date and time are 2026-02-03 14:05
    When archive preflight computes the name
    Then the base name is Customer Assistant_20260203_1405
    When that base name already exists in the destination folder
    Then the next candidate is Customer Assistant_20260203_1405_1
    And the candidate is selected without overwriting another project

  @non-goals
  Scenario: Keep relocation out of timestamp rename
    Given the colliding project has been renamed successfully
    When the rename operation completes
    Then its folderID remains unchanged
    And no Archive folder is looked up
    And no Archive folder is created
    And no folderID patch is sent
    And any future relocation behavior requires a separate BDD feature and commit
