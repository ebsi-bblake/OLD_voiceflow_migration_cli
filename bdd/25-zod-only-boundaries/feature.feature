@validation @zod @refactor @simplification
Feature: Make Zod the only structural validation mechanism
  BDD20 established Zod schemas and permitted temporary adapters for existing
  guard call sites. This feature completes the migration: owned Zod schemas are
  the single source of truth, legacy structural guards are removed, and business
  policies remain separate without duplicated or needless validation code.

  Background:
    Given all external values enter the system as unknown
    And BDD20 remains authoritative for schema ownership and safe parsing
    And the active plugin, CLI, Voiceflow core, and Logux boundaries are under review

  @single-source
  Scenario: Give every structural contract one Zod owner
    When the schema inventory is reviewed
    Then every external object, array, tuple, discriminator, field type, presence rule, and bound has one owning Zod schema
    And the owning schema exports its inferred trusted type or a named parser
    And no structural contract has a second hand-written validator
    And shared schemas are imported rather than copied
    And schema files use the repository naming convention with underscore-separated names

  @config
  Scenario: Migrate CLI configuration to the owning Zod schema
    Given cli/config.ts receives a migration configuration object
    When the configuration boundary parses it
    Then MigrationFileConfigSchema is the sole structural validator
    And unsupported keys are rejected by the schema's unknown-key policy
    And non-empty strings, optional fields, secret unions, and bounds are schema-owned
    And the trusted MigrationFileConfig type is inferred from the schema
    And no local isRecord check, CONFIG_KEYS loop, duplicate string parser, or duplicate field validator remains
    And resource selection, URL, event-reference, duration, and secret-file meaning remain named pure policies

  @coverage
  Scenario: Migrate every listed external boundary without a duplicate validator
    Given the CLI, plugin, Voiceflow catalog, secrets, HTTP, SSE, and Logux boundaries are inventoried
    When each boundary is migrated
    Then cli/config.ts, cli/guards.ts, plugin/job_validation.ts, catalog/record-parsers.ts, and voiceflow/secrets.ts use their owning Zod schemas
    And job-response and streaming parsers do not repeat schema-owned shape checks
    And Logux operation adapters validate frames and payloads through owned schemas before policy decisions
    And remaining helpers are retained only when they implement business policy or generic safe traversal

  @direct-consumers
  Scenario: Consume parsed Zod data directly
    Given an adapter receives an unknown external value
    When it needs a trusted domain value
    Then it calls the owning schema safeParse or named parser
    And successful parsed data is passed to domain logic
    And parse failure becomes the canonical boundary diagnostic
    And no legacy type guard is called to repeat the same structural validation
    And no unchecked assertion or original unknown value bypasses the parse result

  @remove-guards
  Scenario: Remove legacy structural guards after consumer migration
    Given a legacy guard checks object shape, required fields, arrays, tuples, or discriminators
    When all of its consumers use the owning Zod schema
    Then the redundant guard is deleted
    And its imports and tests are removed or rewritten against the schema contract
    And no compatibility wrapper remains solely to preserve an internal call site
    And no dead validation helper or duplicate type predicate remains

  @policy-separation
  Scenario: Keep business policies outside schemas without duplicating shape checks
    Given a value has been successfully parsed by Zod
    When domain meaning is evaluated
    Then named pure policies decide retryability, completion, success codes, confirmation, ownership, collision, durability, and reconciliation
    And those policies accept trusted parsed types
    And policies do not re-check fields already guaranteed by the schema
    And schemas do not perform network, filesystem, timer, logging, state-transition, or migration effects

  @diagnostics
  Scenario: Normalize every Zod failure once at its owning boundary
    Given a Zod schema rejects an external value
    When the boundary reports the failure
    Then it creates one canonical diagnostic with the correct domain and stage
    And issue paths and expected types are bounded and safe
    And received values, credentials, secrets, payloads, and stack traces are absent
    And upper layers preserve the diagnostic rather than reparsing or replacing it

  @compatibility
  Scenario: Complete the migration without changing valid behavior
    Given a value was previously accepted by the supported public contract
    When it is parsed through the replacement Zod schema
    Then its domain meaning and public result remain unchanged
    And optional, nullable, omitted, legacy, and unknown-field behavior remains explicit
    And malformed values previously rejected remain rejected
    And BDD18 wire frames, BDD19 parameters, BDD21 diagnostics, and BDD22 runtime transitions remain compatible

  @verification
  Scenario: Prove that no structural guard redundancy remains
    When the migration is verified
    Then repository search finds no legacy structural guard implementation for an owned Zod contract
    And each external boundary has a focused schema test for valid, malformed, missing, null, empty, oversized, and unknown-field inputs
    And tests verify schema output rather than private helper implementation details
    And lint, typecheck, focused BDD tests, aggregate BDD tests, and regression tests pass

  @acceptance
  Scenario: Complete the Zod-only boundary migration
    When all validation boundaries have been migrated
    Then Zod is the only structural validation mechanism
    And no redundant validation path or compatibility wrapper remains internally
    And pure business policies remain small, named, and separate
    And all external values reach domain logic only as validated typed data or typed failure events
