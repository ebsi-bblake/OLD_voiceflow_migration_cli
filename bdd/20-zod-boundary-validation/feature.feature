@refactor @validation @zod @boundaries @safety
Feature: Replace hand-rolled boundary guards with Zod schemas
  Runtime values from HTTP, WebSocket, SSE, XYOps, plugin jobs, configuration,
  files, and persisted records are untrusted. Zod schemas become the single
  runtime-validation mechanism for data-shape contracts while pure business
  policies remain named functions outside schema definitions.

  The migration preserves accepted public shapes and failure behavior unless a
  malformed or unsafe value was previously accepted accidentally. Every schema
  has one owning boundary, one typed output, and one safe diagnostic conversion.

  Background:
    Given the active XYOps plugin, CLI client, and Voiceflow core are under test
    And Zod is a direct runtime dependency recorded in the Bun lockfile
    And all external values enter the system as unknown
    And no validation boundary exposes raw input or raw Zod issue values

  # ---------------------------------------------------------------------------
  # Schema ownership and dependency contract
  # ---------------------------------------------------------------------------

  @dependency
  Scenario: Add Zod as an explicit runtime dependency
    When the validation refactor is prepared
    Then Zod is declared as a direct production dependency
    And the exact resolved version is recorded in bun.lock
    And plugin, CLI, and core builds can import the same supported Zod runtime
    And no second validation library is introduced for the same boundary
    And dependency installation, typecheck, lint, tests, and plugin build use the locked dependency

  @schema-ownership
  Scenario: Give every external shape one schema owner
    When the schema inventory is completed
    Then each boundary shape has one named schema module and one exported parser or safe parser:
      | boundary | required schema families |
      | Voiceflow core | auth claims, catalog rows, folder/project/version records, import receipts, HTTP response bodies |
      | Logux | connect/connected/sync/synced/error frames, catalog actions, mutation completions |
      | XYOps client | launch responses, stream events, jobs, wait responses, envelopes, failures, warnings |
      | plugin | NativePluginJob, operation parameters, plugin responses, event records |
      | CLI | config values, migration selections, plans, execute results, secret entries |
      | HTTP/SSE | bounded response envelopes, status/code fields, job output containers |
    And consumers do not reimplement shape checks for an owned schema
    And shared schemas are imported rather than copied
    And schema names describe the domain contract rather than generic data

  @schema-ownership
  Scenario: Separate schemas from business policies
    When a value is validated
    Then Zod schemas validate shape, type, presence, bounds, and discriminators
    And named pure policies continue to decide domain meaning such as:
      | policy |
      | whether an HTTP status is retryable |
      | whether a job is completed |
      | whether a job code is successful |
      | whether a migration confirmation is exactly true |
      | whether a project collision is in the destination workspace and folder |
      | whether a rename is durable in the catalog |
    And a schema does not perform network, filesystem, timer, logging, or migration effects
    And a policy does not duplicate the schema's structural checks

  # ---------------------------------------------------------------------------
  # Safe parsing API and compatibility
  # ---------------------------------------------------------------------------

  @parse-api
  Scenario: Parse untrusted values through a typed safe boundary
    Given a caller receives an unknown value
    When it needs a domain value
    Then it invokes the owning schema's safeParse or a named parser adapter
    And successful parsing returns the schema's typed output
    And unsuccessful parsing returns a structured validation diagnostic
    And callers do not use unchecked casts to manufacture a domain value
    And callers do not continue with the original unknown value after parse failure

  @parse-api @compatibility
  Scenario: Preserve existing guard call contracts during migration
    Given an existing consumer accepts a ResponseGuard<T> or boolean type guard
    When its implementation is migrated to Zod
    Then a typed adapter may expose schema.safeParse(value).success as the guard result
    And the adapter preserves the existing function signature until the consumer migration is complete
    And the schema remains the source of truth
    And the migration does not create a second hand-written validation path
    And the final result is still narrowed to the intended domain type without an assertion

  @parse-api
  Scenario: Normalize schema failures into the canonical diagnostic contract
    Given a schema rejects an external value
    When the boundary converts the rejection
    Then the diagnostic domain identifies the boundary that rejected it
    And the stage identifies the operation stage
    And the stable code identifies malformed-response, invalid-input, or the applicable existing code
    And the diagnostic includes bounded issue paths and expected shape summaries
    And retryability follows the boundary policy rather than defaulting from the presence of a parse error
    And nextAction explains whether the operator should correct input, retry, or reconcile
    And raw received values are never included

  @parse-api @zod-errors
  Scenario: Sanitize Zod errors before logging or returning them
    Given a ZodError contains issue paths, expected types, received types, and input values
    When it crosses a diagnostic or logging boundary
    Then input values are removed or structurally redacted
    And issue paths are bounded in count and length
    And expected and received type names may be retained when safe
    And the error is represented as a structured cause rather than a flattened raw Zod message
    And credentials, secrets, exported data, response bodies, and stack traces are absent

  # ---------------------------------------------------------------------------
  # Shape preservation and unknown fields
  # ---------------------------------------------------------------------------

  @compatibility @shape
  Scenario: Preserve existing accepted valid response shapes
    Given a response accepted by the current hand-written guards
    When it is parsed by the replacement schema
    Then it remains accepted with the same domain meaning
    And optional, nullable, omitted, and legacy envelope variants retain their current semantics
    And valid extra provider fields do not cause an unrelated operation to fail
    And only fields required by the domain DTO are copied into trusted output

  @shape @unknown-fields
  Scenario: Handle unknown object fields deliberately
    Given a valid response contains fields not owned by the domain contract
    When its schema parses the response
    Then the schema's unknown-field policy is explicit for that boundary
    And unknown fields are either safely stripped from trusted output or preserved only when the contract requires them
    And unknown sensitive fields cannot be emitted through diagnostics
    And no schema silently changes an operation's required behavior by dropping a required field

  @shape @nullability
  Scenario Outline: Preserve missing, null, empty, and present meanings
    Given the field "<field>" is <form>
    When the owning schema parses the value
    Then the result is accepted or rejected according to the existing contract
    And missing is not silently converted to null, empty string, false, or zero
    And null is not silently converted to missing
    And the failure includes the field path without exposing the received value

    Examples:
      | field | form |
      | completed | omitted |
      | completed | null |
      | output | omitted |
      | output | null |
      | targetSchemaVersion | omitted |
      | source folder | omitted for a root-level project |
      | folderID | missing from an import receipt |

  # ---------------------------------------------------------------------------
  # Voiceflow and catalog schemas
  # ---------------------------------------------------------------------------

  @voiceflow
  Scenario: Validate Voiceflow authentication claims at the boundary
    Given a token is supplied to core
    When authentication claims are parsed
    Then the schema validates the required claim shape and string types
    And token syntax and creator identity policies remain explicit named policies
    And an invalid or missing token produces AUTHENTICATION_FAILED
    And the token itself is never included in a Zod issue, diagnostic, log, or response

  @catalog
  Scenario: Validate catalog rows before projection
    Given a workspace, project, assistant, folder, version, or catalog action arrives
    When its payload is parsed
    Then required identity fields and collection shapes are validated before projection
    And malformed rows are rejected or omitted according to the existing catalog policy
    And workspace and folder ownership is not inferred from an invalid row
    And numeric folder IDs, string aliases, optional parent IDs, and legacy field aliases retain their existing normalization behavior
    And the resulting domain records cannot contain unvalidated unknown values

  @catalog @frames
  Scenario: Validate Logux frames before reducer events
    Given a WebSocket message arrives as text or an unknown event payload
    When the frame schema parses it
    Then valid connect, connected, sync, synced, error, ping, and pong frames retain their exact tuple shapes
    And frame[1] is interpreted according to the frame kind
    And action metadata is read from the correct nested location
    And malformed or non-array frames produce no domain event
    And raw frame contents are not copied into diagnostics
    And exact fixtures remain governed by bdd/18-logux-wire-frame-fixtures/protocol.md

  @catalog @frames
  Scenario: Validate action-specific Logux completion payloads
    Given a parsed sync action is a folder, secret, rename, or catalog action
    When its operation-specific schema parses the payload
    Then the required workspace, assistant, project, folder, action, and result identities are validated
    And action ID and sync ID correlation remains a separate operation policy
    And missing or mismatched completion data cannot complete the operation
    And server failure payloads are structurally classified without exposing raw payloads

  # ---------------------------------------------------------------------------
  # XYOps, plugin, CLI, and configuration schemas
  # ---------------------------------------------------------------------------

  @xyops
  Scenario: Validate XYOps launch, stream, wait, and job responses
    Given an XYOps response arrives from run_event, stream_job, wait, or get_job
    When it is parsed
    Then launch IDs, response codes, descriptions, job IDs, completion values, state values, and output containers are validated
    And supported top-level, data, and data.job envelope variants retain their current behavior
    And stream event type and data shape are validated before job observation events are emitted
    And malformed, incomplete, or oversized responses become structured observation failures
    And unknown outcomes remain distinct from confirmed job failures

  @xyops @envelopes
  Scenario: Validate Voiceflow success and failure envelopes with composable result schemas
    Given a normalized Voiceflow response is expected to contain a generic result
    When the envelope schema is constructed with a result schema
    Then operation, operation ID, success warnings, result, failure code, failure message, and retryability are validated
    And result validation is delegated to the operation-specific schema
    And unknown operation names and unknown error codes are rejected
    And the existing public envelope shape remains compatible

  @plugin
  Scenario: Validate NativePluginJob and plugin response contracts
    Given a plugin receives a job or emits a response
    When the corresponding schema parses it
    Then operation identity, parameter object, completion state, version, and response data are validated
    And required parameters remain required and optional parameters remain optional
    And parameter names and serialized values remain governed by bdd/19-migration-parameter-constants/feature.feature
    And malformed jobs fail before dispatching core effects
    And malformed responses do not become successful plugin results

  @cli @configuration
  Scenario: Validate CLI configuration and migration inputs
    Given configuration, command-line, file, or prompt data enters the CLI
    When it is parsed
    Then path, URL, duration, workspace, folder, project, version, confirmation, and secret-entry shapes are validated
    And semantic policies such as URL schemes, path grammar, duplicate secret names, and literal confirmation remain explicit
    And secret values are accepted only where required for the operation
    And secret values are not included in schema errors or diagnostics

  @cli @secrets
  Scenario: Validate secret file entries without leaking values
    Given a secret file is loaded
    When its contents are parsed
    Then it must be an array of valid unique key/value entries with the existing type values
    And duplicate names, invalid types, missing keys, and non-string values are rejected
    And the parser reports the safe entry path and validation category
    And secret values never appear in the diagnostic, Zod issue, log, or thrown message

  # ---------------------------------------------------------------------------
  # Migration and rollout safety
  # ---------------------------------------------------------------------------

  @parity
  Scenario: Prove parity between old guards and replacement schemas
    Given the representative valid, invalid, boundary, legacy, and malformed fixtures are available
    When old and new validators are compared during migration
    Then every valid fixture accepted by the contract remains accepted
    And every invalid fixture rejected by the contract remains rejected
    And differences are reviewed by boundary with an explicit compatibility decision
    And no behavior change is hidden inside a schema replacement
    And the old guard is removed only after parity tests and all consumers pass

  @rollout
  Scenario: Migrate one boundary at a time
    When the Zod refactor is implemented
    Then schemas are introduced before consumers are switched
    And each consumer is migrated from hand-written guards to the owning schema adapter
    And tests pass after each boundary migration
    And the old duplicate guard is deleted only when search proves it has no callers
    And active plugin and archived compatibility sources retain aligned validation behavior

  @security
  Scenario: Reject unsafe values before side effects
    Given an external value is malformed, oversized, unauthorized, or missing required identity
    When the boundary schema rejects it
    Then no network mutation, import, secret creation, rename, folder creation, or execute dispatch occurs
    And the canonical diagnostic identifies the rejecting boundary and stage
    And no automatic retry occurs unless the explicit policy classifies the failure as safely retryable

  @tests
  Scenario: Test schemas as public boundary contracts
    When the schema test suite runs
    Then tests cover valid, invalid, omitted, null, empty, duplicate, legacy, oversized, malformed, and hostile values
    And tests cover schema composition for every generic envelope result
    And tests cover safeParse failure normalization and redacted Zod errors
    And tests cover Logux fixtures from bdd/18 and parameter constants from bdd/19
    And tests prove runtime reducers receive only validated typed events
    And tests prove no raw input value crosses a diagnostic boundary

  @acceptance
  Scenario: Complete the Zod migration without changing safe behavior
    When all Zod boundary acceptance checks pass
    Then hand-written structural guards are removed from migrated boundaries
    And Zod schemas are the single runtime shape authority
    And pure business policies remain explicit and independently testable
    And valid public behavior, serialized parameters, wire frames, retry policy, and unknown-outcome safety remain compatible
    And malformed inputs fail early with structured, actionable, safely redacted diagnostics
    And no unchecked cast, duplicate validator, raw Zod error, secret value, or unsafe side effect remains in the migrated boundaries
