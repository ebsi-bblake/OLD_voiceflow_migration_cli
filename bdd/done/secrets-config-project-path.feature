@migration @secrets @configuration
Feature: Resolve project API-key secrets from catalog paths
  A projectId secret references the source project by a readable catalog path.
  The path uses workspace/folder^n/project, where the first segment is the
  workspace, the final segment is the project, and every segment between them
  is a folder.

  Background:
    Given a secrets configuration contains a secret with type "projectId"
    And the secret value is a catalog path

  @resolution
  Scenario: Resolve a projectId secret using workspace, folders, and project
    Given the secret value is "Source Workspace/Parent^n/Child^n/Source Project"
    And the matching workspace, folders, and project exist
    When the projectId secret is resolved
    Then the first path segment identifies the workspace
    And the middle path segments identify folders in order
    And the final path segment identifies the project
    And the source project's API key is used as the secret value

  @resolution
  Scenario: Resolve a projectId secret with no folders
    Given the secret value is "Source Workspace/Source Project"
    And the matching workspace and project exist
    When the projectId secret is resolved
    Then the workspace and project are resolved
    And no folder lookup is performed

  @validation
  Scenario: Reject a project path with a missing catalog resource
    Given one workspace, folder, or project segment cannot be resolved
    When the projectId secret is resolved
    Then the migration stops before secret creation
    And the diagnostic identifies the invalid project path without exposing secret values

  @validation
  Scenario: Keep literal and URL secrets unchanged
    Given a secret has an empty type or type "url"
    When the secrets configuration is resolved
    Then its configured value is passed through unchanged
    And no project catalog lookup is performed
