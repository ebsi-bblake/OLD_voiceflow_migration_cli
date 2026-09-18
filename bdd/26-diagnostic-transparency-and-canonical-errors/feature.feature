@diagnostics @errors @redaction @refactor
Feature: Preserve useful Voiceflow failure diagnostics without exposing secrets
  BDD21 established the diagnostic shape and redaction boundary. This feature
  closes the remaining gaps identified by Fixing_Opaque_Voiceflow_Migration_CLI_Errors:
  preserve causes across boundaries, sanitize failures at the core source, use
  structural redaction, and prevent user-facing failures from becoming opaque.

  Background:
    Given the Voiceflow core, plugin, XYOps client, and CLI boundaries are under test
    And all backend responses, job output, exception values, and persisted records are untrusted
    And BDD21 remains the authority for diagnostic fields and redaction policy

  @cause-preservation
  Scenario: Preserve canonical diagnostic identity across every boundary
    Given a core failure has a code, domain, stage, retryability, nextAction, context, and ordered causes
    When it crosses the core, plugin, XYOps, and CLI boundaries
    Then every boundary preserves the original diagnostic identity
    And each boundary may append context without replacing the original cause
    And the final result retains the ordered cause chain
    And no specific failure is flattened into only DEPENDENCY_FAILURE or INTERNAL_ERROR
    And existing public compatibility identifiers remain available

  @core-source
  Scenario: Sanitize backend failures at the Voiceflow source boundary
    Given exportVersion or importVersion receives an unsafe backend exception
    When core converts it into an OperationFault or canonical diagnostic
    Then the failure receives a specific stable code and exact lifecycle stage
    And safe structured backend context is retained when available
    And the exception message, JSON, JWT, API key, secret, and file contents do not cross into the plugin
    And an uncertain import is classified as IMPORT_OUTCOME_UNKNOWN
    And a confirmed rejection remains distinct from an unknown outcome

  @structural-redaction
  Scenario: Redact structured diagnostic DTOs before serialization
    Given a diagnostic contains nested objects, arrays, maps, and sensitive fields
    When it is serialized for a process, network, log, or response boundary
    Then structural redaction runs before serialization
    And JWTs, bearer tokens, API keys, cookies, authorization headers, passwords, secrets, default values, exported data, and raw bodies are removed or stably redacted
    And safe code, domain, stage, IDs, status, endpoint, retryability, and nextAction remain when permitted
    And the source diagnostic and operational result are not mutated
    And arbitrary regex replacement is not the primary safety boundary

  @user-facing
  Scenario: Present a safe actionable failure without opaque stage-only output
    Given a remote job returns a validated failure with a safe root-cause classification
    When the CLI presents the failure
    Then the public diagnostic includes the stable identifier and actionable nextAction
    And the operator can distinguish authentication, confirmed rejection, dependency failure, and unknown outcome
    And safe cause and stage context remain available
    And unsafe detail is omitted rather than replacing the whole diagnostic with only a generic stage summary

  @taxonomy
  Scenario: Translate layer-specific failures through one canonical diagnostic taxonomy
    Given core, plugin, CLI, transport, and Logux use layer-specific internal failure values
    When a failure crosses a layer boundary
    Then it is translated into the canonical diagnostic contract
    And the translation records the originating domain and stage
    And documented public aliases remain compatible
    And translation does not silently change retryability or nextAction
    And the final diagnostic remains queryable without parsing free-form error text

  @acceptance
  Scenario: Complete the opaque-error remediation
    When diagnostic boundary tests pass
    Then useful safe root-cause information survives every supported boundary
    And structural redaction protects sensitive data before serialization
    And confirmed failures remain distinct from uncertain side effects
    And no user-facing failure is reduced to only an opaque stage string
