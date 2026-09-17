@migration @configuration @paths
Feature: Extend migration configuration with resource paths
  Migration configuration keeps the existing flat resource fields and adds
  source_folder, source_path, and destination_path. The path fields provide a
  compact configuration for the common case while resolving to the same
  canonical workspace, folder, project, and version IDs internally.

  Voiceflow currently permits at most one folder level. The path grammar is
  intentionally future-compatible with zero or more folder levels so the config
  contract does not need to change if Voiceflow later supports nesting.

  Paths contain human-readable catalog names only. The path legend is:
    workspace/folder(^n)/project
  where `folder(^n)` means zero or more folder segments separated by `/`;
  `folder(^n)` is notation, not a literal path segment. Splitting a source_path
  therefore produces [workspace, project] through [workspace, folder, ..., project].

  A destination_path has the form:
    workspace/folder(^n)
  where the first segment is the workspace and the remaining zero-or-more folder
  segments identify the destination folder ancestry. A destination path must
  contain at least one folder segment. Path resolution is side-effect free: a
  missing destination folder is planned for creation and is created only when
  migration provisioning starts.

  Path matching trims surrounding whitespace and compares names using a
  lower-case, Unicode-normalized lookup key. The original catalog names are
  retained for diagnostics and folder creation; normalization must not rename
  catalog resources.

  Background:
    Given the migration configuration is loaded from a JSON file
    And catalog names and canonical IDs are available for the configured resources
    And catalog names follow the standard naming convention
    And catalog names are unique after trimming and lower-case normalization

  @minimal
  Scenario: Resolve a minimal path-based configuration
    Given the configuration contains only:
      | field            | value                                                |
      | source_path      | Source Workspace/Source Folder/Source Project       |
      | destination_path | Destination Workspace/Import Folder                 |
      | secrets          | ./migration-secrets.json                             |
    When the migration configuration is resolved
    Then the source workspace, source folder, and source project are resolved from source_path
    And the destination workspace and destination folder are resolved from destination_path
    And the secrets file is loaded
    And the normalized migration selection contains canonical IDs
    And no source_workspace, source_project, destination_workspace, or destination_folder field is required

  @source-path
  Scenario: Resolve a source_path without a source folder
    Given source_path is "Source Workspace/Source Project"
    When the migration configuration is resolved
    Then splitting source_path produces ["Source Workspace", "Source Project"]
    And the first segment identifies the source workspace
    And the final segment identifies the source project
    And the source project is resolved without a folder lookup

  @source-path @nested-folders @future
  Scenario: Resolve a source_path with nested folders when Voiceflow supports nesting
    Given source_path is "Source Workspace/Parent^n/Child^n/Source Project"
    When the migration configuration is resolved
    Then splitting source_path produces ["Source Workspace", "Parent^n", "Child^n", "Source Project"]
    And the first segment identifies the source workspace
    And the middle segments identify source folders in order
    And the final segment identifies the source project
    And the source project ID is resolved only after the full path is matched

  @destination-path
  Scenario: Resolve a destination_path without nested folders
    Given destination_path is "Destination Workspace/Import Folder"
    When the migration configuration is resolved
    Then splitting destination_path produces ["Destination Workspace", "Import Folder"]
    And the first segment identifies the destination workspace
    And the final segment identifies the destination folder
    And the destination folder ID is resolved within that workspace

  @destination-path @nested-folders @future
  Scenario: Resolve a destination_path with nested folders when Voiceflow supports nesting
    Given destination_path is "Destination Workspace/Imports/Customer Assistants"
    When the migration configuration is resolved
    Then splitting destination_path produces ["Destination Workspace", "Imports", "Customer Assistants"]
    And the first segment identifies the destination workspace
    And the middle segments identify destination folder ancestry
    And the final segment identifies the import folder
    And existing folder ancestry is resolved in order within the destination workspace
    And missing folder ancestry is recorded for deferred creation
    And no folder is created during configuration resolution

  @source-folder
  Scenario: Resolve the extended flat configuration with source_folder
    Given the configuration contains:
      | field                 | value                    |
      | source_workspace      | Source Workspace         |
      | source_folder         | Source Folder            |
      | source_project        | Source Project           |
      | destination_workspace | Destination Workspace    |
      | destination_folder    | Import Folder            |
    When the migration configuration is resolved
    Then source_folder identifies the source project folder context
    And source_project identifies a project within source_folder
    And the normalized source workspace, folder, and project IDs are retained
    And the normalized destination workspace and folder IDs are retained

  @source-folder @root-project
  Scenario: Omit the source folder for a root-level project
    Given the source project is directly under the source workspace
    And source_folder is omitted or null
    When the flat configuration is resolved
    Then the source project is resolved without a folder context
    And the normalized source folder remains absent

  @compatibility
  Scenario: Preserve the existing flat configuration
    Given the configuration uses source_workspace, source_project, source_version, destination_workspace, and destination_folder
    When the migration configuration is resolved
    Then the existing configuration resolves without requiring path fields
    And the normalized migration selection is unchanged

  @compatibility
  Scenario: Resolve a mixed path and flat configuration
    Given source_path identifies the source workspace and project
    And destination_workspace and destination_folder identify the destination
    When the migration configuration is resolved
    Then each resource is resolved using its configured representation
    And the normalized migration selection contains separate canonical IDs

  @compatibility @equivalent
  Scenario: Accept equivalent path and flat fields
    Given source_path and the legacy source fields resolve to the same resources
    And destination_path and the legacy destination fields resolve to the same resources
    When the configuration is validated
    Then validation succeeds
    And the equivalent representations resolve to the same canonical IDs

  @validation @ambiguity
  Scenario: Reject an ambiguous source_path
    Given multiple source resources match the configured source_path
    When the migration configuration is resolved
    Then resolution fails with an ambiguity diagnostic
    And no source project ID is selected arbitrarily
    And no export or import begins

  @validation @ambiguity
  Scenario: Reject an ambiguous destination_path
    Given multiple destination folders match the configured destination_path
    When the migration configuration is resolved
    Then resolution fails with an ambiguity diagnostic
    And no destination folder ID is selected arbitrarily
    And no migration begins

  @validation @missing
  Scenario: Reject a source_path with a missing resource
    Given a workspace, source folder, or source project segment cannot be resolved
    When the migration configuration is resolved
    Then configuration resolution fails before version loading
    And the diagnostic identifies the failing source path segment
    And no export or import begins

  @validation @missing
  Scenario: Defer creation of a missing destination folder from destination_path
    Given the destination workspace exists
    And the final destination folder in destination_path does not exist
    When the migration configuration is resolved
    Then resolution succeeds with a deferred destination-folder creation
    And no folder is created during configuration resolution
    And the destination workspace scope is retained for provisioning

  @validation @missing @nested-folders
  Scenario: Create missing destination-folder ancestry during provisioning
    Given the destination workspace exists
    And one or more destination folder segments do not exist
    When migration provisioning starts
    Then missing folders are created in path order within the destination workspace
    And the created final folder ID is selected as the destination folder ID
    And no folder from another workspace is selected

  @validation @scope
  Scenario: Keep path resolution within the declared workspace
    Given an identically named folder exists in another workspace
    When source_path or destination_path is resolved
    Then the other-workspace folder is not selected
    And only a folder under the path's workspace can satisfy the path

  @validation @conflict
  Scenario: Reject conflicting path and flat fields
    Given source_path resolves to one source project
    And source_workspace, source_folder, or source_project resolves to a different resource
    When the configuration is validated
    Then validation fails before catalog mutation
    And the diagnostic identifies the conflicting fields

  @validation @conflict
  Scenario: Reject conflicting destination_path and flat fields
    Given destination_path resolves to one destination folder
    And destination_workspace or destination_folder resolves to a different resource
    When the configuration is validated
    Then validation fails before planning
    And no folder from either workspace is selected

  @validation @format
  Scenario: Reject an incomplete source_path
    Given source_path contains only a workspace segment
    When the migration configuration is validated
    Then validation fails with a source path error
    And the workspace is not treated as a project

  @validation @format
  Scenario: Reject an incomplete destination_path
    Given destination_path contains only a workspace segment
    When the migration configuration is validated
    Then validation fails with a destination path error
    And the workspace is not treated as a folder

  @validation @format
  Scenario: Treat path segments as human-readable names
    Given source_path and destination_path contain catalog names rather than IDs
    When the paths are resolved
    Then each segment is matched by its human-readable catalog name
    And canonical IDs are produced only after catalog resolution

  @validation @normalization
  Scenario: Normalize surrounding whitespace and case for path matching
    Given source_path contains surrounding whitespace and mixed-case catalog names
    When the path is resolved
    Then surrounding whitespace is removed from the path and each segment
    And matching is case-insensitive using lower-case normalized lookup keys
    And the catalog resource's original name is retained
    And the resolved canonical IDs are unchanged by normalization

  @validation @normalization
  Scenario: Reject empty path segments after normalization
    Given a path contains repeated separators or a segment containing only whitespace
    When the path is validated
    Then validation fails before catalog lookup
    And the diagnostic identifies the path and segment position
    And no empty segment is treated as a catalog resource

  @validation @format
  Scenario: Reject blank or control-character path segments
    Given a path contains a blank or control-character segment
    When the migration configuration is validated
    Then validation fails before catalog lookup
    And the invalid value is not echoed into diagnostics

  @migration @selection
  Scenario: Preserve resolved IDs through planning and execution
    Given source_path and destination_path have been resolved
    When a migration plan is created and later executed
    Then the plan contains the resolved source workspace ID
    And the plan contains the resolved source folder context when available
    And the plan contains the resolved source project ID
    And the plan contains the resolved source version ID
    And the plan contains the resolved destination workspace ID
    And the plan contains the resolved destination folder ID
    And execution rejects a plan whose resolved IDs do not match the request

  @validation @errors
  Scenario: Report a stable actionable path-resolution error
    Given a path cannot be resolved because of a missing or ambiguous segment
    When configuration resolution fails
    Then the failure includes a stable machine-readable error code
    And the failure identifies the path field and segment position
    And the failure identifies whether the segment was missing or ambiguous
    And the failure does not include a raw API payload or stack trace
    And no export, import, planning, or catalog mutation begins

  @validation @errors @provisioning
  Scenario: Report deferred folder-creation failure without starting migration
    Given configuration resolution recorded a missing destination folder
    And creating the destination folder fails during migration provisioning
    When migration provisioning completes
    Then the command exits with status 1
    And the failure includes a stable folder-creation error code
    And the failure identifies the destination path and folder segment
    And no migration import is started
    And no secret, credential, raw API payload, or stack trace is exposed

  @security
  Scenario: Protect secrets and sensitive diagnostics
    Given the minimal configuration includes a secrets file
    When path resolution or migration fails
    Then diagnostics may identify the failing configuration field
    But diagnostics do not expose secret values
    And diagnostics do not expose the Voiceflow JWT
    And diagnostics do not expose raw API payloads
