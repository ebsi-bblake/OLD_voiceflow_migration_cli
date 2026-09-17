# Logux wire-frame protocol inventory

This document records observed sanitized Voiceflow Logux frame shapes and protocol invariants. It is documentation, not an executable acceptance suite. Executable scenarios are in `feature.feature`. Canonical sanitized fixtures are in `fixtures/` and are loaded directly by the Cucumber steps.

Canonical fixtures:

- `fixtures/connect.json`
- `fixtures/connected.json`
- `fixtures/subscription.json`
- `fixtures/rename-subscription.json`
- `fixtures/folder-completion.json`
- `fixtures/catalog-replace.json`
- `fixtures/error.json`
- `fixtures/ping.json`
- `fixtures/pong.json`
- `fixtures/secret-failure.json`
- `fixtures/secret-failure-missing-action.json`
- `fixtures/secret-completion.json`
- `fixtures/secret-completion-missing-assistant.json`
- `fixtures/catalog-invalid-values.json`

```gherkin
@migration @logux @protocol @fixtures
Feature: Use explicit sanitized Voiceflow Logux wire-frame fixtures
  These fixtures define the array positions and nested fields at the WebSocket
  boundary. Values are synthetic or redacted; no credential, cookie, secret
  value, export, or authorization data is included.

  Background:
    Given frame[0] identifies the Logux frame kind
    And frame[1] is interpreted by frame kind: protocol version for connect and connected frames, the local sync or request ID for client sync frames, zero for unsolicited server sync broadcasts, the matching sync ID for synced frames, and a bounded server error code for error frames
    And action frames store the action object at frame[2]
    And metadata is read from action.meta
    And credentials and secret values are represented only by redaction markers

  @session
  Scenario: Authenticate the WebSocket
    When the client sends the sanitized connect frame:
      """
      "[\"connect\",4,\"creator:client:session\",0,{\"token\":\"<JWT-redacted>\",\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[0] is "connect"
    And frame[1] is 4
    And frame[2] is the stable session origin
    And frame[3] is 0
    And frame[4].token is the authenticated token at runtime but is never logged
    And frame[4].subprotocol is "1.9.0"

  @session
  Scenario: Receive the authenticated connection response
    When the server sends the sanitized connected frame:
      """
      "[\"connected\",4,\"server:connection\",[100,101],{\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[0] is "connected"
    And frame[1] is 4
    And frame[2] is the server connection identifier
    And frame[3] contains the server time range
    And frame[4].subprotocol is "1.9.0"

  @subscription @with-since
  Scenario: Subscribe to a channel with a replay cursor
    When the client sends the sanitized subscription frame:
      """
      "[\"sync\",101,{\"channel\":\"assistant/assistant-id\",\"type\":\"logux/subscribe\",\"since\":{\"id\":\"0\",\"time\":0}},{\"id\":-1,\"time\":1}]"
      """
    Then frame[0] is "sync"
    And frame[1] is the positive local subscription sync ID
    And frame[2].channel is "assistant/assistant-id"
    And frame[2].type is "logux/subscribe"
    And frame[2].since.id is "0"
    And frame[2].since.time is 0
    And frame[3] contains the local transport id and action time

  @subscription @without-since @rename
  Scenario: Subscribe to the rename workspace without inventing a replay cursor
    When the client sends the sanitized rename subscription frame:
      """
      "[\"sync\",301,{\"channel\":\"workspace/workspace-id\",\"type\":\"logux/subscribe\"},{\"id\":-1,\"time\":1}]"
      """
    Then frame[0] is "sync"
    And frame[1] is the positive local subscription sync ID
    And frame[2].channel is "workspace/workspace-id"
    And frame[2].type is "logux/subscribe"
    And frame[2] has no since field
    And the shared transport preserves the operation-specific cursor policy

  @subscription
  Scenario: Acknowledge the channel subscription
    When the server sends the sanitized subscription acknowledgement:
      """
      "[\"synced\",101]"
      """
    Then frame[0] is "synced"
    And frame[1] is matched against the local subscription sync ID
    And no action object is required at frame[2]

  @secret @mutation
  Scenario: Send a secret creation mutation
    When the client sends the sanitized secret mutation frame:
      """
      "[\"sync\",102,{\"type\":\"secret.CREATE_ONE_STARTED\",\"payload\":{\"context\":{\"assistantID\":\"assistant-id\"},\"data\":{\"name\":\"API_KEY\",\"visibility\":\"masked\",\"defaultValue\":\"<secret-redacted>\"}},\"meta\":{\"origin\":\"creator:client:session\",\"actionID\":\"action-secret-1\"}},{\"id\":-2,\"time\":2}]"
      """
    Then frame[0] is "sync"
    And frame[1] is the distinct positive local mutation sync ID
    And frame[2].type is "secret.CREATE_ONE_STARTED"
    And frame[2].payload.context.assistantID is "assistant-id"
    And frame[2].payload.data.name is "API_KEY"
    And frame[2].payload.data.visibility is "masked"
    And frame[2].payload.data.defaultValue is never logged or copied into diagnostics
    And frame[2].meta.origin is the session origin
    And frame[2].meta.actionID is "action-secret-1"

  @secret @mutation
  Scenario: Receive the secret broadcast
    When the server sends the sanitized secret add frame:
      """
      "[\"sync\",0,{\"type\":\"secret.ADD_ONE\",\"payload\":{\"data\":{\"assistantID\":\"assistant-id\",\"id\":\"secret-id\",\"updatedByID\":null,\"name\":\"API_KEY\",\"visibility\":\"masked\",\"updatedAt\":\"<timestamp>\",\"createdAt\":\"<timestamp>\",\"hasValue\":true},\"context\":{\"assistantID\":\"assistant-id\",\"broadcastOnly\":true}},\"meta\":{\"userID\":\"<user-id>\",\"clientID\":\"<client-id>\",\"creatorID\":\"<creator-id>\"}},{\"id\":103,\"time\":103,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[0] is "sync"
    And frame[1] is not used to correlate secret completion
    And frame[2].type is "secret.ADD_ONE"
    And frame[2].payload.data.id is "secret-id"
    And frame[2].payload.data.hasValue is true
    And the secret value is absent from the frame fixture
    And this frame does not complete the secret mutation

  @secret @failure @correlation
  Scenario: Receive a correlated secret failure envelope
    When the server sends the sanitized secret failure frame:
      """
      "[\"sync\",0,{\"type\":\"secret.CREATE_ONE_FAILED\",\"meta\":{\"actionID\":\"action-secret-1\"}},{\"id\":105,\"time\":105,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[2].type is "secret.CREATE_ONE_FAILED"
    And frame[2].meta.actionID is matched against the started actionID
    And the raw server failure payload is not exposed or copied into diagnostics
    And the matching failure is normalized exactly as {"kind":"dependency-failure","code":"dependency-failed"}
    And only the allowlisted code field may be retained in the normalized cause
    And message, details, stack, raw payload text, and secret values are never retained or exposed
    And the operation does not wait for a timeout

  @secret @completion @correlation
  Scenario: Receive the secret completion envelope
    When the server sends the sanitized secret completion frame:
      """
      "[\"sync\",0,{\"type\":\"secret.CREATE_ONE_DONE\",\"payload\":{\"params\":{\"context\":{\"assistantID\":\"assistant-id\"},\"data\":{\"name\":\"API_KEY\",\"visibility\":\"masked\",\"defaultValue\":\"<secret-redacted>\"}},\"result\":{\"data\":{\"assistantID\":\"assistant-id\",\"id\":\"secret-id\",\"updatedByID\":null,\"name\":\"API_KEY\",\"visibility\":\"masked\",\"updatedAt\":\"<timestamp>\",\"createdAt\":\"<timestamp>\"},\"context\":{\"assistantID\":\"assistant-id\"}}},\"meta\":{\"actionID\":\"action-secret-1\"}},{\"id\":104,\"time\":104,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[0] is "sync"
    And frame[1] is not used as the mutation action correlation
    And frame[2].type is "secret.CREATE_ONE_DONE"
    And frame[2].payload.result.context.assistantID is "assistant-id"
    And frame[2].payload.result.data.id is "secret-id"
    And frame[2].meta.actionID is matched against the started actionID
    And the completion is accepted only when both correlations match
    And the secret value is not logged or returned in diagnostics

  @folder @mutation
  Scenario: Send and receive a workspace-folder mutation
    When the client sends the sanitized folder mutation frame:
      """
      "[\"sync\",202,{\"type\":\"workspace-folder.CREATE_ONE_STARTED\",\"payload\":{\"context\":{\"workspaceID\":\"workspace-id\"},\"data\":{\"name\":\"Imports\",\"scope\":\"assistant\"}},\"meta\":{\"origin\":\"creator:client:session\",\"actionID\":\"action-folder-1\"}},{\"id\":-2,\"time\":2}]"
      """
    Then frame[2].type is "workspace-folder.CREATE_ONE_STARTED"
    And frame[2].payload.context.workspaceID is "workspace-id"
    And frame[2].payload.data.name is "Imports"
    And frame[2].payload.data.scope is "assistant"
    And frame[2].meta.origin is the session origin
    When the server sends the sanitized folder completion frame:
      """
      "[\"sync\",0,{\"type\":\"workspace-folder.CREATE_ONE_DONE\",\"payload\":{\"params\":{\"context\":{\"workspaceID\":\"workspace-id\"},\"data\":{\"name\":\"Imports\"}},\"result\":{\"data\":{\"id\":\"folder-id\",\"name\":\"Imports\",\"workspaceID\":\"workspace-id\"}}},\"meta\":{\"actionID\":\"action-folder-1\"}},{\"id\":203,\"time\":203,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[2].type is "workspace-folder.CREATE_ONE_DONE"
    And frame[2].payload.params.context.workspaceID is "workspace-id"
    And frame[2].payload.result.data.id is "folder-id"
    And frame[2].meta.actionID is "action-folder-1"
    And a missing meta.origin does not invalidate this server completion

  @rename @mutation
  Scenario: Send and acknowledge a project rename mutation
    When the client sends the sanitized rename mutation frame:
      """
      "[\"sync\",302,{\"type\":\"assistant.PATCH_ONE\",\"payload\":{\"id\":\"project-id\",\"patch\":{\"name\":\"Project_20260916_2034\"},\"context\":{\"workspaceID\":\"workspace-id\"}},\"meta\":{\"origin\":\"creator:client:session\",\"actionID\":\"action-rename-1\"}},{\"id\":-2,\"time\":2}]"
      """
    Then frame[2].type is "assistant.PATCH_ONE"
    And frame[2].payload.id is "project-id"
    And frame[2].payload.patch.name is "Project_20260916_2034"
    And frame[2].payload.context.workspaceID is "workspace-id"
    And frame[2].meta.actionID is "action-rename-1"
    When the server sends the sanitized mutation acknowledgement:
      """
      "[\"synced\",302]"
      """
    Then frame[0] is "synced"
    And frame[1] matches the rename mutation sync ID
    And this acknowledgement is transport durability evidence, not a generic processed event

  @rename @broadcast
  Scenario: Receive a project rename broadcast
    When the server sends the sanitized project patch frame:
      """
      "[\"sync\",0,{\"type\":\"project.CRUD:PATCH\",\"payload\":{\"workspaceID\":\"workspace-id\",\"key\":\"project-id\",\"value\":{\"name\":\"Project_20260916_2034\"}},\"meta\":{\"origin\":\"creator:client:session\",\"actionID\":\"response-action\"}},{\"id\":303,\"time\":303,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[2].type is "project.CRUD:PATCH"
    And frame[2].payload.workspaceID is "workspace-id"
    And frame[2].payload.key is "project-id"
    And frame[2].payload.value.name is "Project_20260916_2034"
    And frame[2].meta.origin is the session origin
    And frame[2].meta.actionID is not required to equal the request actionID

  @catalog
  Scenario Outline: Receive each catalog replacement action
    When the server sends a sanitized catalog frame for <type>:
      """
      "[\"sync\",0,{\"type\":\"<type>\",\"payload\":{\"values\":[{\"id\":\"row-id\",\"workspaceID\":\"workspace-id\"}],\"context\":{\"workspaceID\":\"workspace-id\"}}},{\"id\":<id>,\"time\":<id>,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[2].type is "<type>"
    And frame[2].payload.values is the catalog row array
    And frame[2].payload.context.workspaceID is "workspace-id"
    And only requested action types are accumulated

    Examples:
      | type | id |
      | workspace.CRUD:REPLACE | 401 |
      | project.CRUD:REPLACE | 402 |
      | assistant.REPLACE | 403 |
      | workspace-folder.REPLACE | 404 |

  @transport
  Scenario: Handle processed, error, and heartbeat frames without confusing them with actions
    When the server sends the sanitized processed frame:
      """
      "[\"sync\",0,{\"id\":\"<timestamp> creator:client:session 0\",\"type\":\"logux/processed\"},{\"id\":501,\"time\":501,\"subprotocol\":\"1.9.0\"}]"
      """
    Then frame[2].type is "logux/processed"
    And no mutation actionID is inferred from the processed frame
    When the server sends the sanitized dependency error frame:
      """
      "[\"error\",\"dependency-failed\"]"
      """
    Then frame[0] is "error"
    And frame[1] is the bounded server error code
    And the raw error frame is not copied into diagnostics
    When the server sends a sanitized ping frame "[\"ping\",95]"
    Then the client does not treat it as a domain action
    When the server sends a sanitized pong frame "[\"pong\",0]"
    Then the client does not treat it as a domain action

  @malformed
  Scenario Outline: Reject malformed or incomplete frame fixtures
    When the client receives <fixture>
    Then no normalized domain event is emitted
    And no secret, credential, or raw payload is copied into diagnostics

    Examples:
      | fixture |
      | invalid JSON |
      | a non-array JSON value |
      | a non-text WebSocket message |
      | an action frame without frame[2].meta.actionID when correlation requires it |
      | a completion frame without payload.result.context.assistantID |
      | a catalog action whose payload.values is not an array |
```
