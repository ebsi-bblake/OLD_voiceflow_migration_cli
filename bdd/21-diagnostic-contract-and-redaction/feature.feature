@refactor @errors @diagnostics @safety
Feature: Preserve structured Voiceflow migration errors and redact them structurally
  Diagnostic identity must survive core, plugin, XYOps, CLI, and Logux boundaries.
  Security must be enforced by structured DTO redaction before serialization, not by
  flattening useful causes into opaque stage strings or relying primarily on regexes.

  Background:
    Given the active XYOps plugin, CLI client, and Voiceflow core are under test
    And all network responses, job output, plugin errors, and persisted records are untrusted
    And every diagnostic has an operation ID, domain, and lifecycle stage

  @canonical-contract
  Scenario: Use one canonical diagnostic contract across all layers
    When a failure is created in core, plugin, CLI, transport, or Logux code
    Then it is represented internally by fields with these meanings:
      | field      | requirement |
      | code       | stable machine-readable failure identifier |
      | domain     | core, plugin, cli, logux, transport, or protocol |
      | stage      | exact lifecycle stage where the failure occurred |
      | retryable  | explicit retry decision |
      | nextAction | actionable operator guidance |
      | context    | bounded safe structured fields only |
      | causes     | ordered structured cause chain, when available |
    And translations preserve all fields unless a documented public alias is required
    And no translation replaces a specific failure with generic DEPENDENCY_FAILURE or INTERNAL_ERROR
    And existing public compatibility fields remain available

  @compatibility
  Scenario Outline: Preserve existing public failure identifiers with added structure
    Given a failure currently exposed as "<identifier>"
    When it is serialized for its existing public boundary
    Then the identifier remains "<identifier>"
    And the serialized result also contains safe domain and stage context
    And retryability and nextAction remain explicit
    And an operator can identify the root cause without reading an unsafe raw exception

    Examples:
      | identifier |
      | execute-outcome-unknown |
      | import-outcome-unknown |
      | AUTHENTICATION_FAILED |
      | DEPENDENCY_TIMEOUT |
      | DEPENDENCY_FAILURE |
      | PLAN_MISMATCH |
      | INTERNAL_ERROR |

  @cause-chain
  Scenario: Preserve a structured cause chain through every boundary
    Given an import failure has these ordered causes:
      | order | domain    | code                    | stage       |
      | 1     | transport | DEPENDENCY_TIMEOUT      | import      |
      | 2     | core      | IMPORT_OUTCOME_UNKNOWN | import      |
      | 3     | plugin    | EXECUTE_OUTCOME_UNKNOWN| response    |
      | 4     | cli       | execute-outcome-unknown| observation |
    When the error crosses core, plugin, XYOps, and CLI boundaries
    Then the final diagnostic retains the ordered chain
    And every cause retains safe domain, code, stage, retryability, and context
    And the final public code follows the existing boundary contract
    And the result is not reduced to only "stage=IMPORT"

  @redaction
  Scenario: Redact structured diagnostic DTOs before serialization
    Given a diagnostic context contains safe and sensitive fields
    When it crosses a process, network, log, or response boundary
    Then redaction operates on the structured object before serialization
    And these values are removed or stable-redacted:
      | sensitive value |
      | JWTs and bearer tokens |
      | API keys |
      | cookies and authorization headers |
      | project or assistant secret values |
      | secret assignments and default values |
      | exported project file contents |
      | raw multipart bodies |
      | raw response bodies whose safety is not established |
    And safe code, domain, stage, endpoint, IDs, status, and nextAction remain when permitted
    And redaction does not mutate the original error or operational result

  @redaction @nested
  Scenario: Redact nested and collection values safely
    Given a diagnostic contains nested objects, arrays, and metadata maps
    When structural redaction runs
    Then sensitive keys are redacted at every supported nesting level
    And token, authorization, cookie, api key, secret, password, default value, and exported data variants are protected
    And safe array entries retain their order
    And bounded size and depth limits prevent unbounded diagnostic work
    And the output remains valid structured data

  @redaction @fallback
  Scenario: Handle an unstructured or malformed failure payload
    Given a remote failure is not valid structured diagnostic data
    When the boundary normalizes it
    Then raw payload text is not exposed
    And a bounded generic diagnostic includes the known domain and stage
    And a safe cause classification such as malformed-response or untrusted-failure-detail is retained
    And arbitrary regex replacement is not the primary safety boundary

  @source-sanitization
  Scenario: Sanitize backend failures at the core source boundary
    Given exportVersion or importVersion catches a backend exception
    When core converts it into an OperationFault or canonical diagnostic
    Then it assigns the specific stable code and exact stage
    And it preserves safe structured backend context and a sanitized cause
    And unknown import completion is classified as IMPORT_OUTCOME_UNKNOWN
    And raw backend messages, JSON, JWTs, API keys, secrets, and file contents do not cross into the plugin

  @plugin
  Scenario: Keep plugin diagnostics structured
    Given a plugin operation fails during input, secret, dispatch, or response processing
    When formatPluginDiagnostic creates the failure result
    Then it contains plugin version, operation, stage, code, retryability, nextAction, and safe causes as fields
    And version and stage remain queryable rather than existing only inside a free-form string
    And the response envelope does not flatten the result into a bracketed opaque description
    And raw exception text is included only as a bounded redacted cause when proven safe

  @translation
  Scenario: Translate errors without destroying identity
    Given a lower layer returns a canonical diagnostic with causes and safe context
    When an upper layer adds boundary context
    Then it wraps or appends context without replacing the original diagnostic
    And the cause chain identifies each translation boundary
    And public codes change only for documented aliases
    And retryability is not changed by string formatting
    And nextAction remains consistent with the final safety classification

  @translation @unexpected
  Scenario: Preserve unexpected failures as safe structured causes
    Given an exception does not implement the canonical diagnostic type
    When it crosses a boundary
    Then a canonical unexpected-failure cause is created
    And safe exception type, stage, domain, and correlation context are retained
    And stack traces, credentials, raw payloads, and unsafe message text are omitted
    And the failure is not relabeled execute-outcome-unknown unless execution outcome is genuinely uncertain

  @next-action
  Scenario Outline: Provide safe actionable guidance
    Given the canonical failure class is "<class>"
    When the failure is presented to an operator
    Then nextAction is "<action>"
    And the action does not recommend an unsafe blind retry

    Examples:
      | class                    | action |
      | authentication failure   | Check authentication and sign in again |
      | invalid configuration    | Check configuration and migration inputs |
      | confirmed dependency failure | Retry only when the diagnostic policy permits it |
      | timeout before dispatch  | Retry the operation when safe |
      | unknown execute outcome  | Reconcile the execute job before retrying |
      | unknown import outcome   | Reconcile the destination project before retrying |
      | plan mismatch            | Re-run planning and confirm the plan ID |

  @non-idempotent
  Scenario: Preserve the execute unknown-outcome safety barrier
    Given execute_migration has been dispatched
    And timeout, network failure, stream disconnect, or incomplete output prevents confirmation
    When the CLI normalizes the failure
    Then the canonical diagnostic is classified as an unknown outcome
    And the public identifier remains execute-outcome-unknown
    And nextAction requires reconciliation before retrying
    And no second execute dispatch is made automatically

  @non-idempotent
  Scenario: Distinguish unknown import outcome from confirmed import failure
    Given an import request may have reached Voiceflow
    And its response is lost, malformed, or times out after dispatch
    When core and CLI translate the failure
    Then the code is IMPORT_OUTCOME_UNKNOWN or its existing public equivalent
    And the causes distinguish transport uncertainty from confirmed rejection
    And destination reconciliation is required before retry
    And no duplicate project is created automatically

  @confirmed-failure
  Scenario: Keep explicit validated rejection distinct from uncertainty
    Given an import or execute request receives a validated rejection before side effects can occur
    When it is normalized
    Then it retains its specific confirmed-failure code and stage
    And it is not classified as unknown outcome
    And retryability follows that code's explicit policy
    And the safe nextAction explains the next operation

  @acceptance
  Scenario: Complete the diagnostic refactor without opacity regressions
    When all diagnostic acceptance checks pass
    Then users receive safe code, domain, stage, cause summary, retryability, and nextAction
    And confirmed failures are distinguishable from unknown side effects
    And sensitive values remain protected by structural redaction
    And no changed boundary flattens a structured failure into only a generic stage string
