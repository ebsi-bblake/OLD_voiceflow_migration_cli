@migration @logux @protocol
Feature: Logux wire-frame contract
  The detailed protocol inventory remains in protocol.md. These scenarios
  execute the highest-value frame boundary contracts.

  Scenario: Parse a sanitized subscription frame
    Given the "subscription" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the frame kind is "sync"
    And the frame sync ID is 101
    And the action channel is "assistant/assistant-id"

  Scenario: Reject malformed input
    Given the malformed Logux message "not-json"
    When the frame is parsed
    Then parsing fails

  Scenario: Preserve connection frame semantics
    Given the "connect" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the frame kind is "connect"
    And the frame protocol version is 4

  Scenario: Preserve the connected response shape
    Given the "connected" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the frame kind is "connected"
    And the frame protocol version is 4

  Scenario: Preserve the rename subscription cursor policy
    Given the "rename-subscription" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the frame kind is "sync"
    And the frame sync ID is 301
    And the action channel is "workspace/workspace-id"
    And the action has no since field

  Scenario: Preserve folder completion frames
    Given the "folder-completion" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the action type is "workspace-folder.CREATE_ONE_DONE"
    And the action ID is "action-folder-1"

  Scenario: Preserve catalog replacement frames
    Given the "catalog-replace" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the action type is "workspace-folder.REPLACE"
    And the catalog values are an array

  Scenario: Preserve bounded error frames
    Given the "error" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the frame kind is "error"
    And the error code is "dependency-failed"

  Scenario: Ignore heartbeat frames as domain actions
    Given the "ping" wire-frame fixture
    When the frame is parsed
    Then the frame is not a domain action
    Given the "pong" wire-frame fixture
    When the frame is parsed
    Then the frame is not a domain action

  Scenario: Reject a secret failure without action correlation
    Given the "secret-failure-missing-action" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the secret failure does not match action ID "action-secret-1"

  Scenario: Reject a completion without assistant correlation
    Given the "secret-completion-missing-assistant" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And secret completion rejects action ID "action-secret-1"

  Scenario: Reject a catalog frame with invalid values
    Given the "catalog-invalid-values" wire-frame fixture
    When the frame is parsed
    Then parsing succeeds
    And the catalog values are not an array

  Scenario: Normalize a correlated secret failure without leaking payload data
    Given the "secret-failure" wire-frame fixture
    When the frame is parsed
    Then the secret failure matches action ID "action-secret-1"
    And the normalized failure is exactly dependency-failed
    And the normalized failure contains no raw payload

  Scenario: Accept completion only for both correlations
    Given the "secret-completion" wire-frame fixture
    When the frame is parsed
    Then secret completion matches action ID "action-secret-1" and assistant ID "assistant-id"
    And secret completion rejects action ID "other-action"
